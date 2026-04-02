import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — /api/orders/by-session (après correction IDOR)
 *
 * Vérifie que la route exige maintenant l'authentification
 * et ne retourne que les commandes de l'utilisateur connecté.
 */

const mockFindFirst = vi.fn()
const mockAuth = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
  },
}))

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

import { GET } from '@/app/api/orders/by-session/route'
import { NextRequest } from 'next/server'

function makeRequest(sessionId?: string) {
  const url = sessionId
    ? `http://localhost/api/orders/by-session?session_id=${sessionId}`
    : 'http://localhost/api/orders/by-session'
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/orders/by-session — SECURISE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter si session_id manquant', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(400)
  })

  it('devrait rejeter un utilisateur non authentifie (401)', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET(makeRequest('cs_test_abc123'))
    expect(res.status).toBe(401)
  })

  it('devrait retourner 404 si commande non trouvee pour cet utilisateur', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockFindFirst.mockResolvedValueOnce(null)
    const res = await GET(makeRequest('cs_test_abc123'))
    expect(res.status).toBe(404)
  })

  it('devrait filtrer par userId dans la requete DB', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockFindFirst.mockResolvedValueOnce(null)

    await GET(makeRequest('cs_test_abc123'))

    // Vérifier que la requête Prisma inclut bien le userId
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          stripeSessionId: 'cs_test_abc123',
          userId: 'user-1',
        }),
      })
    )
  })

  it('devrait retourner les details de commande pour le proprietaire', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    mockFindFirst.mockResolvedValueOnce({
      id: 'order-1',
      total: 42.50,
      deliveryMethod: 'retrait',
      deliveryDate: new Date('2025-01-15'),
      deliverySlot: '10h-12h',
      deliveryAddress: null,
      deliveryCity: null,
      deliveryPostalCode: null,
      deliveryFee: 0,
      pickupCode: 'ABC123',
      status: 'validated',
      createdAt: new Date('2025-01-14'),
      items: [],
    })

    const res = await GET(makeRequest('cs_test_abc123'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pickupCode).toBe('ABC123')
    expect(data.total).toBe(42.50)
  })
})
