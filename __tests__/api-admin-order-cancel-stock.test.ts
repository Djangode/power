import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — Annulation d'une commande et restitution du stock.
 *
 * Le stock est décrémenté à la commande. Sans restitution à l'annulation, chaque commande
 * annulée retire définitivement de la marchandise de l'inventaire : le catalogue finit par
 * afficher « épuisé » sur des produits présents en rayon.
 */

const mockAuth = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockOrderUpdate = vi.fn()
const mockOrderItemFindMany = vi.fn()
const mockProductUpdate = vi.fn()
const mockSendOrderStatusUpdate = vi.fn()
const mockSendPickupReadyEmail = vi.fn()

vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

vi.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findUnique: (...a: any[]) => mockOrderFindUnique(...a),
      update: (...a: any[]) => mockOrderUpdate(...a),
    },
    orderItem: { findMany: (...a: any[]) => mockOrderItemFindMany(...a) },
    product: { update: (...a: any[]) => mockProductUpdate(...a) },
  },
}))

vi.mock('@/lib/email', () => ({
  sendOrderStatusUpdate: (...a: any[]) => mockSendOrderStatusUpdate(...a),
  sendPickupReadyEmail: (...a: any[]) => mockSendPickupReadyEmail(...a),
}))

import { PUT } from '@/app/api/admin/orders/[id]/status/route'

function makeRequest(status: string) {
  return new Request('http://localhost/api/admin/orders/o1/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

const params = Promise.resolve({ id: 'o1' })

describe('PUT /api/admin/orders/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockOrderFindUnique.mockResolvedValue({ status: 'validated' })
    mockOrderUpdate.mockResolvedValue({
      id: 'o1', status: 'cancelled', deliveryMethod: 'livraison', pickupCode: null,
      user: { email: 'client@test.fr' },
    })
    mockOrderItemFindMany.mockResolvedValue([])
    mockSendOrderStatusUpdate.mockResolvedValue(undefined)
    mockSendPickupReadyEmail.mockResolvedValue(undefined)
  })

  it('devrait refuser un utilisateur non-admin', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'u1', role: 'user' } })
    const res = await PUT(makeRequest('cancelled'), { params })
    expect(res.status).toBe(401)
  })

  it('devrait refuser un statut invalide', async () => {
    const res = await PUT(makeRequest('n_importe_quoi'), { params })
    expect(res.status).toBe(400)
  })

  it('devrait rendre le stock au catalogue quand la commande est annulee', async () => {
    mockOrderItemFindMany.mockResolvedValue([
      { id: 'oi1', quantity: 3, product: { id: 'p1', currentStock: 10 } },
      { id: 'oi2', quantity: 2, product: { id: 'p2', currentStock: 0 } },
    ])

    await PUT(makeRequest('cancelled'), { params })

    expect(mockProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: { currentStock: 13, inStock: true } }),
    )
    // Un produit retombé à 0 redevient disponible une fois la commande annulée.
    expect(mockProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p2' }, data: { currentStock: 2, inStock: true } }),
    )
  })

  it('ne devrait pas recrediter deux fois une commande deja annulee', async () => {
    mockOrderFindUnique.mockResolvedValue({ status: 'cancelled' })
    mockOrderItemFindMany.mockResolvedValue([
      { id: 'oi1', quantity: 3, product: { id: 'p1', currentStock: 10 } },
    ])

    await PUT(makeRequest('cancelled'), { params })

    expect(mockProductUpdate).not.toHaveBeenCalled()
  })

  it('ne devrait pas toucher au stock pour un autre changement de statut', async () => {
    mockOrderUpdate.mockResolvedValue({
      id: 'o1', status: 'shipped', deliveryMethod: 'livraison', pickupCode: null,
      user: { email: 'client@test.fr' },
    })

    await PUT(makeRequest('shipped'), { params })

    expect(mockProductUpdate).not.toHaveBeenCalled()
  })

  it('devrait envoyer le code de retrait quand la commande est prete', async () => {
    mockOrderUpdate.mockResolvedValue({
      id: 'o1', status: 'processing', deliveryMethod: 'retrait', pickupCode: 'AB12CD',
      user: { email: 'client@test.fr' },
    })

    await PUT(makeRequest('processing'), { params })

    expect(mockSendPickupReadyEmail).toHaveBeenCalledWith('client@test.fr', 'o1', 'AB12CD')
  })

  // Régression : l'envoi était bloquant, une panne Resend renvoyait 500 alors que le statut
  // était bien enregistré — l'admin croyait devoir recommencer.
  it('devrait enregistrer le statut meme si l email echoue', async () => {
    mockSendOrderStatusUpdate.mockRejectedValueOnce(new Error('Resend indisponible'))
    const res = await PUT(makeRequest('shipped'), { params })
    expect(res.status).toBe(200)
  })

  it('devrait repondre 404 sur une commande inexistante', async () => {
    mockOrderFindUnique.mockResolvedValue(null)
    const res = await PUT(makeRequest('shipped'), { params })
    expect(res.status).toBe(404)
  })
})
