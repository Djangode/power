import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockCategoryFindMany = vi.fn()
const mockCategoryCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    category: {
      findMany: (...args: any[]) => mockCategoryFindMany(...args),
      create: (...args: any[]) => mockCategoryCreate(...args),
    },
  },
}))

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

import { GET, POST } from '@/app/api/admin/categories/route'

function makeRequest(body: any) {
  return new Request('http://localhost/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('API /api/admin/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('devrait rejeter un non-admin', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'user' } })
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it('devrait retourner les categories pour un admin', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
      mockCategoryFindMany.mockResolvedValueOnce([
        { id: '1', name: 'Fruits', slug: 'fruits' },
      ])
      const res = await GET()
      expect(res.status).toBe(200)
    })
  })

  describe('POST', () => {
    it('devrait rejeter un non-admin', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'user' } })
      const res = await POST(makeRequest({ name: 'Test' }))
      expect(res.status).toBe(401)
    })

    it('devrait generer un slug correct avec accents', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
      mockCategoryCreate.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: '1', ...data })
      )

      await POST(makeRequest({ name: 'Légumes découpés' }))

      expect(mockCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'legumes-decoupes',
          }),
        })
      )
    })

    it('devrait generer un slug sans caracteres speciaux', async () => {
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
      mockCategoryCreate.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: '1', ...data })
      )

      await POST(makeRequest({ name: 'Jus & Soupes (Frais)' }))

      expect(mockCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'jus-soupes-frais',
          }),
        })
      )
    })
  })
})
