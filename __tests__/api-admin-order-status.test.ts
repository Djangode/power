import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===== Mocks =====
const mockAuth = vi.fn()
const mockOrderUpdate = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockOrderItemFindMany = vi.fn()
const mockProductUpdate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    order: {
      update: (...args: any[]) => mockOrderUpdate(...args),
      // La route relit le statut avant mise à jour, pour ne restituer le stock qu'à la
      // première annulation.
      findUnique: (...args: any[]) => mockOrderFindUnique(...args),
    },
    orderItem: { findMany: (...args: any[]) => mockOrderItemFindMany(...args) },
    product: { update: (...args: any[]) => mockProductUpdate(...args) },
  },
}))

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

vi.mock('@/lib/email', () => ({
  sendOrderStatusUpdate: vi.fn().mockResolvedValue(undefined),
  sendPickupReadyEmail: vi.fn().mockResolvedValue(undefined),
}))

import { PUT } from '@/app/api/admin/orders/[id]/status/route'

function makeRequest(body: any) {
  return new Request('http://localhost/api/admin/orders/order-1/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const defaultParams = Promise.resolve({ id: 'order-1' })

describe('PUT /api/admin/orders/[id]/status — SECURISE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrderFindUnique.mockResolvedValue({ status: 'validated' })
    mockOrderItemFindMany.mockResolvedValue([])
  })

  it('devrait rejeter un non-admin', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'user' } })
    const res = await PUT(makeRequest({ status: 'validated' }), { params: defaultParams })
    expect(res.status).toBe(401)
  })

  it('devrait rejeter si status est vide', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const res = await PUT(makeRequest({}), { params: defaultParams })
    expect(res.status).toBe(400)
  })

  it('devrait REJETER un statut arbitraire (plus de vuln)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })

    const res = await PUT(makeRequest({ status: 'HACKED' }), { params: defaultParams })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Statut invalide')
  })

  it('devrait REJETER une injection XSS dans le statut', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })

    const res = await PUT(
      makeRequest({ status: '<script>alert("xss")</script>' }),
      { params: defaultParams }
    )
    expect(res.status).toBe(400)
  })

  it('devrait accepter "validated"', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    mockOrderUpdate.mockResolvedValueOnce({
      id: 'order-1', status: 'validated',
      user: { email: 'test@test.com' }, deliveryMethod: 'livraison',
    })
    const res = await PUT(makeRequest({ status: 'validated' }), { params: defaultParams })
    expect(res.status).toBe(200)
  })

  it('devrait accepter "processing"', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    mockOrderUpdate.mockResolvedValueOnce({
      id: 'order-1', status: 'processing',
      user: { email: 'test@test.com' }, deliveryMethod: 'retrait', pickupCode: 'ABC',
    })
    const res = await PUT(makeRequest({ status: 'processing' }), { params: defaultParams })
    expect(res.status).toBe(200)
  })

  it('devrait accepter "shipped"', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    mockOrderUpdate.mockResolvedValueOnce({
      id: 'order-1', status: 'shipped', user: { email: 'test@test.com' },
    })
    const res = await PUT(makeRequest({ status: 'shipped' }), { params: defaultParams })
    expect(res.status).toBe(200)
  })

  it('devrait accepter "delivered"', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    mockOrderUpdate.mockResolvedValueOnce({
      id: 'order-1', status: 'delivered', user: { email: 'test@test.com' },
    })
    const res = await PUT(makeRequest({ status: 'delivered' }), { params: defaultParams })
    expect(res.status).toBe(200)
  })

  it('devrait accepter "cancelled"', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    mockOrderUpdate.mockResolvedValueOnce({
      id: 'order-1', status: 'cancelled', user: { email: 'test@test.com' },
    })
    const res = await PUT(makeRequest({ status: 'cancelled' }), { params: defaultParams })
    expect(res.status).toBe(200)
  })
})
