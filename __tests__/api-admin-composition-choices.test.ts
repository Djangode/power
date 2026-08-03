import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — Formats et ingrédients d'une composition (admin).
 *
 * L'écriture remplace l'état complet : ce qui disparaît de l'écran doit disparaître de la
 * base, et une seule taille peut être marquée par défaut, sinon la sélection à l'ouverture
 * du configurateur dépendrait de l'ordre de lecture.
 */

const mockAuth = vi.fn()
const mockCompositionFindUnique = vi.fn()
const mockSizeDeleteMany = vi.fn()
const mockSizeCreate = vi.fn()
const mockSizeUpdate = vi.fn()
const mockOptionDeleteMany = vi.fn()
const mockOptionCreate = vi.fn()
const mockOptionUpdate = vi.fn()

vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

vi.mock('@/lib/db', () => ({
  prisma: {
    composition: { findUnique: (...a: any[]) => mockCompositionFindUnique(...a) },
    compositionSize: {
      deleteMany: (...a: any[]) => mockSizeDeleteMany(...a),
      create: (...a: any[]) => mockSizeCreate(...a),
      update: (...a: any[]) => mockSizeUpdate(...a),
    },
    compositionOption: {
      deleteMany: (...a: any[]) => mockOptionDeleteMany(...a),
      create: (...a: any[]) => mockOptionCreate(...a),
      update: (...a: any[]) => mockOptionUpdate(...a),
    },
  },
}))

import { PUT, GET } from '@/app/api/admin/compositions/[id]/choices/route'

const params = Promise.resolve({ id: 'c1' })

function makeRequest(body: any) {
  return new Request('http://localhost/api/admin/compositions/c1/choices', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/admin/compositions/[id]/choices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { role: 'admin' } })
    mockCompositionFindUnique.mockResolvedValue({ id: 'c1', sizes: [], options: [] })
  })

  describe('accès', () => {
    it('devrait refuser un non-admin', async () => {
      mockAuth.mockResolvedValue({ user: { role: 'user' } })
      const res = await PUT(makeRequest({ sizes: [], options: [] }), { params })
      expect(res.status).toBe(401)
    })

    it('devrait refuser un non-admin en lecture', async () => {
      mockAuth.mockResolvedValue(null)
      const res = await GET(new Request('http://localhost'), { params })
      expect(res.status).toBe(401)
    })

    it('devrait repondre 404 sur une composition inexistante', async () => {
      mockCompositionFindUnique.mockResolvedValue(null)
      const res = await PUT(makeRequest({ sizes: [], options: [] }), { params })
      expect(res.status).toBe(404)
    })
  })

  describe('validation', () => {
    it('devrait refuser un format sans nom', async () => {
      const res = await PUT(makeRequest({ sizes: [{ name: '', price: 10 }], options: [] }), { params })
      expect(res.status).toBe(400)
    })

    it('devrait refuser un prix negatif', async () => {
      const res = await PUT(makeRequest({ sizes: [{ name: 'Petit', price: -5 }], options: [] }), { params })
      expect(res.status).toBe(400)
    })

    it('devrait refuser un supplement negatif', async () => {
      const res = await PUT(
        makeRequest({ sizes: [], options: [{ name: 'Mangue', extraPrice: -2 }] }),
        { params },
      )
      expect(res.status).toBe(400)
    })
  })

  describe('enregistrement', () => {
    it('devrait creer les nouveaux formats', async () => {
      await PUT(
        makeRequest({
          sizes: [
            { name: 'Petit', price: 15, isDefault: true },
            { name: 'Grand', price: 30 },
          ],
          options: [],
        }),
        { params },
      )

      expect(mockSizeCreate).toHaveBeenCalledTimes(2)
      expect(mockSizeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Petit', price: 15, isDefault: true, compositionId: 'c1', order: 0 }),
        }),
      )
    })

    it('devrait mettre a jour un format existant plutot que le recreer', async () => {
      await PUT(
        makeRequest({ sizes: [{ id: 's1', name: 'Moyen', price: 22 }], options: [] }),
        { params },
      )

      expect(mockSizeUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ name: 'Moyen', price: 22 }) }),
      )
      expect(mockSizeCreate).not.toHaveBeenCalled()
    })

    it('devrait supprimer les formats retires de l ecran', async () => {
      await PUT(makeRequest({ sizes: [{ id: 's1', name: 'Petit', price: 15 }], options: [] }), { params })

      expect(mockSizeDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { compositionId: 'c1', id: { notIn: ['s1'] } } }),
      )
    })

    it('devrait tout supprimer quand la liste est videe', async () => {
      await PUT(makeRequest({ sizes: [], options: [] }), { params })
      expect(mockSizeDeleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { compositionId: 'c1' } }))
    })

    it('devrait distinguer formule de base et supplement', async () => {
      await PUT(
        makeRequest({
          sizes: [],
          options: [
            { name: 'Fraise', extraPrice: 0, includedByDefault: true },
            { name: 'Mangue', extraPrice: 2 },
          ],
        }),
        { params },
      )

      expect(mockOptionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Fraise', includedByDefault: true, extraPrice: 0 }) }),
      )
      expect(mockOptionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Mangue', includedByDefault: false, extraPrice: 2 }) }),
      )
    })
  })

  describe('taille par défaut', () => {
    it('ne devrait garder qu une seule taille par defaut', async () => {
      await PUT(
        makeRequest({
          sizes: [
            { name: 'Petit', price: 15, isDefault: true },
            { name: 'Moyen', price: 22, isDefault: true },
          ],
          options: [],
        }),
        { params },
      )

      const defaults = mockSizeCreate.mock.calls.filter((c) => c[0].data.isDefault)
      expect(defaults).toHaveLength(1)
      expect(defaults[0][0].data.name).toBe('Petit')
    })

    it('devrait promouvoir le premier format quand aucun n est coche', async () => {
      await PUT(
        makeRequest({ sizes: [{ name: 'Petit', price: 15 }, { name: 'Grand', price: 30 }], options: [] }),
        { params },
      )

      expect(mockSizeCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Petit', isDefault: true }) }),
      )
    })
  })
})
