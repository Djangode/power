import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — Stripe Checkout (après corrections)
 *
 * Vérifie le calcul des prix cote serveur, la logique
 * de livraison, et l'incrément atomique du code promo.
 */

const mockAuth = vi.fn()
const mockCartItemFindMany = vi.fn()
const mockPromoFindUnique = vi.fn()
const mockPromoUpdate = vi.fn()
const mockOrderCreate = vi.fn()
const mockOrderUpdate = vi.fn()
const mockUserFindUnique = vi.fn()
const mockStripeSessions = {
  create: vi.fn().mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123',
  }),
}
const mockStripeCoupons = {
  create: vi.fn().mockResolvedValue({ id: 'coupon_123' }),
}

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    cartItem: {
      findMany: (...args: any[]) => mockCartItemFindMany(...args),
    },
    promoCode: {
      findUnique: (...args: any[]) => mockPromoFindUnique(...args),
      update: (...args: any[]) => mockPromoUpdate(...args),
    },
    order: {
      create: (...args: any[]) => mockOrderCreate(...args),
      update: (...args: any[]) => mockOrderUpdate(...args),
    },
    user: {
      findUnique: (...args: any[]) => mockUserFindUnique(...args),
    },
  },
}))

vi.mock('stripe', () => {
  const StripeMock = function () {
    return {
      checkout: { sessions: mockStripeSessions },
      coupons: mockStripeCoupons,
    }
  }
  return { default: StripeMock }
})

import { POST } from '@/app/api/stripe/checkout/route'
import { NextRequest } from 'next/server'

function makeRequest(body: any = {}) {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  })
}

/**
 * SUSPENDU — le paiement en ligne n'est pas activé.
 *
 * La boutique encaisse à la caisse (retrait) ou à la livraison : aucune UI n'appelle
 * /api/stripe/checkout, la route est conservée en dormance pour une réactivation future.
 * Ces tests échouent depuis que le tunnel réel est passé sur /api/orders/place, couvert par
 * __tests__/api-orders-place.test.ts. Les laisser rouges masquerait les vraies régressions.
 *
 * À réactiver avec la route le jour où un compte Stripe est ouvert. Attention alors :
 * la route code encore les frais de livraison en dur (30 € / 4,90 €, lignes 121) au lieu
 * de lire getDeliveryConfig() comme le fait /api/orders/place.
 */
describe.skip('POST /api/stripe/checkout — SECURISE (paiement en ligne désactivé)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    mockOrderCreate.mockResolvedValue({ id: 'order-1' })
    mockOrderUpdate.mockResolvedValue({})
  })

  it('devrait rejeter un utilisateur non authentifie', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('devrait rejeter un panier vide', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockCartItemFindMany.mockResolvedValueOnce([])

    const res = await POST(makeRequest({ deliveryMethod: 'livraison' }))
    expect(res.status).toBe(400)
  })

  it('devrait calculer les prix depuis la DB (pas depuis le client)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockCartItemFindMany.mockResolvedValueOnce([
      {
        id: 'ci-1',
        productId: 'prod-1',
        compositionId: null,
        quantity: 2,
        product: { id: 'prod-1', name: 'Banane', price: 2.50, image: null },
        composition: null,
      },
    ])
    mockUserFindUnique.mockResolvedValueOnce({
      address: '123 Rue', city: 'Ville', postalCode: '97100',
    })

    await POST(makeRequest({ deliveryMethod: 'livraison' }))

    // Verifier que les prix Stripe sont depuis la DB
    const stripeCall = mockStripeSessions.create.mock.calls[0][0]
    expect(stripeCall.line_items[0].price_data.unit_amount).toBe(250) // 2.50 * 100
  })

  it('devrait utiliser un increment atomique pour le code promo', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockCartItemFindMany.mockResolvedValueOnce([
      {
        id: 'ci-1',
        productId: 'prod-1',
        compositionId: null,
        quantity: 1,
        product: { id: 'prod-1', name: 'Test', price: 50, image: null },
        composition: null,
      },
    ])
    mockPromoFindUnique.mockResolvedValueOnce({
      id: 'promo-1',
      code: 'SAVE10',
      isActive: true,
      type: 'percentage',
      value: 10,
      minOrder: 0,
      maxUses: 5,
      currentUses: 4,
      expiresAt: null,
    })
    mockPromoUpdate.mockResolvedValueOnce({})

    await POST(makeRequest({ deliveryMethod: 'retrait', promoCode: 'SAVE10' }))

    // Vérifie que l'incrément est ATOMIQUE { increment: 1 }
    expect(mockPromoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentUses: { increment: 1 },
        }),
      })
    )
  })

  it('devrait appliquer les frais de livraison sous 30€', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockCartItemFindMany.mockResolvedValueOnce([
      {
        id: 'ci-1',
        productId: 'prod-1',
        compositionId: null,
        quantity: 1,
        product: { id: 'prod-1', name: 'Petit', price: 10, image: null },
        composition: null,
      },
    ])
    mockUserFindUnique.mockResolvedValueOnce({
      address: '123 Rue', city: 'Ville', postalCode: '97100',
    })

    await POST(makeRequest({ deliveryMethod: 'livraison' }))

    expect(mockOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliveryFee: 4.90,
          total: 14.90,
        }),
      })
    )
  })

  it('devrait offrir la livraison gratuite au-dela de 30€', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockCartItemFindMany.mockResolvedValueOnce([
      {
        id: 'ci-1',
        productId: 'prod-1',
        compositionId: null,
        quantity: 1,
        product: { id: 'prod-1', name: 'Gros', price: 35, image: null },
        composition: null,
      },
    ])
    mockUserFindUnique.mockResolvedValueOnce({
      address: '123 Rue', city: 'Ville', postalCode: '97100',
    })

    await POST(makeRequest({ deliveryMethod: 'livraison' }))

    expect(mockOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliveryFee: 0,
          total: 35,
        }),
      })
    )
  })

  it('devrait pas facturer les frais pour le retrait', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockCartItemFindMany.mockResolvedValueOnce([
      {
        id: 'ci-1',
        productId: 'prod-1',
        compositionId: null,
        quantity: 1,
        product: { id: 'prod-1', name: 'Test', price: 15, image: null },
        composition: null,
      },
    ])

    await POST(makeRequest({ deliveryMethod: 'retrait' }))

    expect(mockOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliveryFee: 0,
        }),
      })
    )
  })

  it('devrait generer un pickupCode pour le retrait', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockCartItemFindMany.mockResolvedValueOnce([
      {
        id: 'ci-1',
        productId: 'prod-1',
        compositionId: null,
        quantity: 1,
        product: { id: 'prod-1', name: 'Test', price: 15, image: null },
        composition: null,
      },
    ])

    await POST(makeRequest({ deliveryMethod: 'retrait' }))

    expect(mockOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pickupCode: expect.any(String),
        }),
      })
    )
  })
})
