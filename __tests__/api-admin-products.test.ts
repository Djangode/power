import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===== Mocks =====
const mockFindMany = vi.fn()
const mockProductCreate = vi.fn()
const mockAuth = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findMany: (...args: any[]) => mockFindMany(...args),
      create: (...args: any[]) => mockProductCreate(...args),
    },
  },
}))

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

import { GET, POST } from '@/app/api/admin/products/route'

function makePostRequest(body: any) {
  return new Request('http://localhost/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('API /api/admin/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET — Auth check', () => {
    it('devrait rejeter un utilisateur non authentifie', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it('devrait rejeter un utilisateur non-admin', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'user' } })
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it('devrait retourner les produits pour un admin', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
      mockFindMany.mockResolvedValueOnce([
        { id: '1', name: 'Banane', price: 2.5, category: { name: 'Fruits' }, currentStock: 100, minimumStock: 10, inStock: true, organic: false, image: null, supplier: null, origin: null, purchasePrice: null, margin: null, description: null, unit: 'kg' },
      ])
      const res = await GET()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Banane')
    })
  })

  describe('POST — Validation Zod', () => {
    it('devrait rejeter un non-admin', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'user' } })
      const res = await POST(makePostRequest({ name: 'Test' }))
      expect(res.status).toBe(401)
    })

    it('devrait REJETER un prix non-numerique (validation Zod)', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })

      const res = await POST(makePostRequest({
        name: 'Test Product',
        price: 'not-a-number',
        categoryId: 'cat-1',
      }))

      expect(res.status).toBe(400)
      // Le produit ne doit PAS etre cree
      expect(mockProductCreate).not.toHaveBeenCalled()
    })

    it('devrait REJETER un nom vide (validation Zod)', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })

      const res = await POST(makePostRequest({
        name: '',
        price: '10',
        categoryId: 'cat-1',
      }))

      expect(res.status).toBe(400)
      expect(mockProductCreate).not.toHaveBeenCalled()
    })

    it('devrait REJETER sans categoryId', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })

      const res = await POST(makePostRequest({
        name: 'Test',
        price: '10',
      }))

      expect(res.status).toBe(400)
      expect(mockProductCreate).not.toHaveBeenCalled()
    })

    it('devrait creer un produit correctement avec des donnees valides', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
      mockProductCreate.mockResolvedValueOnce({
        id: '1',
        name: 'Mangue',
        price: 3.5,
      })

      const res = await POST(makePostRequest({
        name: 'Mangue',
        price: '3.5',
        unit: 'kg',
        categoryId: 'cat-1',
        organic: true,
      }))
      expect(res.status).toBe(201)
    })

    it('devrait accepter un prix numerique direct', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
      mockProductCreate.mockResolvedValueOnce({
        id: '1', name: 'Ananas', price: 4.99,
      })

      const res = await POST(makePostRequest({
        name: 'Ananas',
        price: 4.99,
        categoryId: 'cat-1',
      }))
      expect(res.status).toBe(201)
    })
  })
})
