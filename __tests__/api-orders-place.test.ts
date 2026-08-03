import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — POST /api/orders/place
 *
 * C'est le seul tunnel de commande réellement exposé au client : pas de paiement en ligne,
 * encaissement à la caisse au retrait ou à la livraison. Les tests couvrent ce qui rendait
 * une commande impossible à honorer (créneau, téléphone, adresse incomplète), le calcul des
 * prix côté serveur, et la garantie qu'une panne d'email ne fait pas échouer une commande
 * déjà enregistrée.
 */

const mockAuth = vi.fn()
const mockCartItemFindMany = vi.fn()
const mockCartItemDelete = vi.fn()
const mockCartFindUnique = vi.fn()
const mockPromoFindUnique = vi.fn()
const mockPromoUpdate = vi.fn()
const mockOrderCreate = vi.fn()
const mockOrderItemFindMany = vi.fn()
const mockProductFindMany = vi.fn()
const mockProductUpdate = vi.fn()
const mockUserFindUnique = vi.fn()
const mockSlotFindUnique = vi.fn()
const mockSlotUpdateMany = vi.fn()
const mockSendOrderConfirmation = vi.fn()
const mockSendNewOrderToCompany = vi.fn()

vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

vi.mock('@/lib/db', () => ({
  prisma: {
    cartItem: {
      findMany: (...a: any[]) => mockCartItemFindMany(...a),
      delete: (...a: any[]) => mockCartItemDelete(...a),
    },
    cart: { findUnique: (...a: any[]) => mockCartFindUnique(...a) },
    promoCode: {
      findUnique: (...a: any[]) => mockPromoFindUnique(...a),
      update: (...a: any[]) => mockPromoUpdate(...a),
    },
    order: { create: (...a: any[]) => mockOrderCreate(...a) },
    orderItem: { findMany: (...a: any[]) => mockOrderItemFindMany(...a) },
    product: {
      findMany: (...a: any[]) => mockProductFindMany(...a),
      update: (...a: any[]) => mockProductUpdate(...a),
    },
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    deliverySlot: {
      findUnique: (...a: any[]) => mockSlotFindUnique(...a),
      updateMany: (...a: any[]) => mockSlotUpdateMany(...a),
    },
  },
}))

vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: (...a: any[]) => mockSendOrderConfirmation(...a),
  sendNewOrderToCompany: (...a: any[]) => mockSendNewOrderToCompany(...a),
}))

vi.mock('@/lib/invoice', () => ({
  nextInvoiceNumber: vi.fn().mockResolvedValue('FAC-000001'),
}))

vi.mock('@/app/actions/content', () => ({
  getDeliveryConfig: vi.fn().mockResolvedValue({ fee: 4.9, threshold: 30 }),
  getOrderNotificationEmail: vi.fn().mockResolvedValue('contact@powerprimeur.com'),
}))

import { POST } from '@/app/api/orders/place/route'
import { NextRequest } from 'next/server'

/** Commande de livraison valide — chaque test n'en modifie que ce qu'il éprouve. */
const VALID_BODY = {
  paymentMethod: 'cash',
  deliveryMethod: 'livraison',
  deliveryDate: '2026-08-10',
  deliveryTime: '10h - 12h',
  deliveryAddress: '5 rue des Lilas',
  deliveryCity: 'Alfortville',
  deliveryPostalCode: '94140',
  phone: '0612345678',
}

function makeRequest(body: any = {}) {
  return new NextRequest('http://localhost/api/orders/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...VALID_BODY, ...body }),
  })
}

function cartWith(price: number, quantity: number, currentStock = 100) {
  return [
    {
      id: 'ci_1',
      productId: 'p1',
      compositionId: null,
      quantity,
      customData: null,
      product: { id: 'p1', name: 'Tomates', price, inStock: true, currentStock },
      composition: null,
    },
  ]
}

describe('POST /api/orders/place', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } })
    mockCartItemFindMany.mockResolvedValue(cartWith(10, 2))
    mockProductFindMany.mockResolvedValue([])
    mockOrderCreate.mockResolvedValue({
      id: 'order_1',
      total: 24.9,
      deliveryMethod: 'livraison',
      pickupCode: null,
      phone: '0612345678',
      deliveryDate: new Date('2026-08-10'),
      deliverySlot: '10h - 12h',
      deliveryAddress: '5 rue des Lilas',
      deliveryCity: 'Alfortville',
      deliveryPostalCode: '94140',
      invoiceNumber: 'FAC-000001',
    })
    mockOrderItemFindMany.mockResolvedValue([])
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', email: 'client@test.fr', firstName: 'Jean', lastName: 'Dupont',
      address: '5 rue des Lilas', city: 'Alfortville', postalCode: '94140',
    })
    mockCartFindUnique.mockResolvedValue(null)
    mockSendOrderConfirmation.mockResolvedValue(undefined)
    mockSendNewOrderToCompany.mockResolvedValue(undefined)
  })

  it('devrait rejeter un utilisateur non authentifie', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('devrait rejeter un mode de paiement en ligne', async () => {
    const res = await POST(makeRequest({ paymentMethod: 'stripe' }))
    expect(res.status).toBe(400)
  })

  describe('informations indispensables pour honorer la commande', () => {
    it('devrait rejeter une commande sans date', async () => {
      const res = await POST(makeRequest({ deliveryDate: null }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/date/i)
    })

    it('devrait rejeter une commande sans creneau', async () => {
      const res = await POST(makeRequest({ deliveryTime: '' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/cr[ée]neau/i)
    })

    it('devrait rejeter un retrait sans date ni heure', async () => {
      const res = await POST(makeRequest({ deliveryMethod: 'retrait', deliveryDate: null }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/retrait/i)
    })

    it('devrait rejeter une commande sans telephone', async () => {
      const res = await POST(makeRequest({ phone: '' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/t[ée]l[ée]phone/i)
    })

    it('devrait rejeter un telephone trop court', async () => {
      const res = await POST(makeRequest({ phone: '0612' }))
      expect(res.status).toBe(400)
    })

    it('devrait rejeter une livraison sans code postal ni ville', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'c@t.fr', address: null, city: null, postalCode: null })
      const res = await POST(makeRequest({ deliveryCity: '', deliveryPostalCode: '' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/adresse/i)
    })
  })

  describe('stock', () => {
    it('devrait refuser si le stock est insuffisant', async () => {
      mockCartItemFindMany.mockResolvedValue(cartWith(10, 5, 2))
      const res = await POST(makeRequest())
      expect(res.status).toBe(409)
      expect((await res.json()).error).toMatch(/stock/i)
    })

    it('devrait decrementer le stock des produits commandes', async () => {
      mockOrderItemFindMany.mockResolvedValue([
        { id: 'oi1', productId: 'p1', quantity: 2, priceAtPurchase: 10, product: { id: 'p1', name: 'Tomates', currentStock: 100 }, composition: null },
      ])
      await POST(makeRequest())
      expect(mockProductUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({ currentStock: 98 }),
        }),
      )
    })
  })

  describe('prix', () => {
    it('devrait calculer le total depuis les prix en base, pas depuis le client', async () => {
      mockCartItemFindMany.mockResolvedValue(cartWith(10, 2))
      await POST(makeRequest({ total: 1 }))
      // 2 × 10 € = 20 €, sous le seuil de 30 € → 4,90 € de frais
      expect(mockOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ total: 24.9, deliveryFee: 4.9 }) }),
      )
    })

    it('devrait offrir la livraison au-dela du seuil', async () => {
      mockCartItemFindMany.mockResolvedValue(cartWith(20, 2))
      await POST(makeRequest())
      expect(mockOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ total: 40, deliveryFee: 0 }) }),
      )
    })

    it('ne devrait pas facturer de frais pour un retrait', async () => {
      await POST(makeRequest({ deliveryMethod: 'retrait' }))
      expect(mockOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deliveryFee: 0 }) }),
      )
    })
  })

  describe('click & collect', () => {
    it('devrait generer un code de retrait', async () => {
      await POST(makeRequest({ deliveryMethod: 'retrait' }))
      expect(mockOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pickupCode: expect.stringMatching(/^[A-Z0-9]{4,8}$/) }),
        }),
      )
    })

    it('ne devrait pas generer de code de retrait pour une livraison', async () => {
      await POST(makeRequest())
      expect(mockOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ pickupCode: null }) }),
      )
    })

    it('devrait enregistrer la date et le creneau de retrait', async () => {
      await POST(makeRequest({ deliveryMethod: 'retrait' }))
      expect(mockOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deliverySlot: '10h - 12h',
            deliveryDate: expect.any(Date),
          }),
        }),
      )
    })
  })

  describe('notifications', () => {
    it('devrait notifier le commercant de la nouvelle commande', async () => {
      await POST(makeRequest())
      expect(mockSendNewOrderToCompany).toHaveBeenCalledWith(
        'contact@powerprimeur.com',
        expect.objectContaining({ orderId: 'order_1' }),
      )
    })

    // Régression : l'envoi d'email était bloquant. Une panne Resend renvoyait 500 alors que
    // la commande était bien créée et le stock décrémenté, poussant le client à recommander.
    it('devrait confirmer la commande meme si l email client echoue', async () => {
      mockSendOrderConfirmation.mockRejectedValueOnce(new Error('Resend indisponible'))
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(true)
    })

    it('devrait confirmer la commande meme si la notification commercant echoue', async () => {
      mockSendNewOrderToCompany.mockRejectedValueOnce(new Error('Resend indisponible'))
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
    })
  })

  describe('creneaux de livraison', () => {
    it('devrait refuser un creneau complet', async () => {
      mockSlotFindUnique.mockResolvedValue({ id: 's1', isActive: true, currentOrders: 5, maxOrders: 5 })
      const res = await POST(makeRequest({ deliverySlotId: 's1' }))
      expect(res.status).toBe(409)
      expect((await res.json()).error).toMatch(/complet/i)
    })

    it('devrait reserver le creneau choisi', async () => {
      mockSlotFindUnique.mockResolvedValue({ id: 's1', isActive: true, currentOrders: 1, maxOrders: 5 })
      await POST(makeRequest({ deliverySlotId: 's1' }))
      expect(mockSlotUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: { currentOrders: { increment: 1 } },
        }),
      )
    })
  })

  it('devrait attribuer un numero de facture sequentiel', async () => {
    await POST(makeRequest())
    expect(mockOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ invoiceNumber: 'FAC-000001' }) }),
    )
  })
})
