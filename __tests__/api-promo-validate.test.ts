import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===== Mocks =====
const mockFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    promoCode: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { POST } from '@/app/api/promo/validate/route'
import { NextRequest } from 'next/server'

function makeRequest(body: any) {
  return new NextRequest('http://localhost/api/promo/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/promo/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter si code manquant', async () => {
    const res = await POST(makeRequest({ subtotal: 50 }))
    expect(res.status).toBe(400)
  })

  it('devrait retourner 404 pour un code inexistant', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const res = await POST(makeRequest({ code: 'INVALID', subtotal: 50 }))
    expect(res.status).toBe(404)
  })

  it('devrait rejeter un code inactif', async () => {
    mockFindUnique.mockResolvedValueOnce({
      code: 'PROMO10',
      isActive: false,
      type: 'percentage',
      value: 10,
      minOrder: 0,
      maxUses: 0,
      currentUses: 0,
      expiresAt: null,
    })
    const res = await POST(makeRequest({ code: 'PROMO10', subtotal: 50 }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter un code expire', async () => {
    mockFindUnique.mockResolvedValueOnce({
      code: 'EXPIRED',
      isActive: true,
      type: 'percentage',
      value: 10,
      minOrder: 0,
      maxUses: 0,
      currentUses: 0,
      expiresAt: new Date('2020-01-01'),
    })
    const res = await POST(makeRequest({ code: 'EXPIRED', subtotal: 50 }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter si limite d\'utilisation atteinte', async () => {
    mockFindUnique.mockResolvedValueOnce({
      code: 'LIMITED',
      isActive: true,
      type: 'percentage',
      value: 10,
      minOrder: 0,
      maxUses: 5,
      currentUses: 5,
      expiresAt: null,
    })
    const res = await POST(makeRequest({ code: 'LIMITED', subtotal: 50 }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter si commande minimum non atteinte', async () => {
    mockFindUnique.mockResolvedValueOnce({
      code: 'MIN50',
      isActive: true,
      type: 'percentage',
      value: 10,
      minOrder: 50,
      maxUses: 0,
      currentUses: 0,
      expiresAt: null,
    })
    const res = await POST(makeRequest({ code: 'MIN50', subtotal: 30 }))
    expect(res.status).toBe(400)
  })

  it('devrait calculer correctement une reduction en pourcentage', async () => {
    mockFindUnique.mockResolvedValueOnce({
      code: 'PROMO10',
      isActive: true,
      type: 'percentage',
      value: 10,
      minOrder: 0,
      maxUses: 0,
      currentUses: 0,
      expiresAt: null,
    })
    const res = await POST(makeRequest({ code: 'PROMO10', subtotal: 100 }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.valid).toBe(true)
    expect(data.discount).toBe(10) // 10% de 100
  })

  it('devrait calculer correctement une reduction fixe', async () => {
    mockFindUnique.mockResolvedValueOnce({
      code: 'FLAT5',
      isActive: true,
      type: 'fixed',
      value: 5,
      minOrder: 0,
      maxUses: 0,
      currentUses: 0,
      expiresAt: null,
    })
    const res = await POST(makeRequest({ code: 'FLAT5', subtotal: 30 }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.discount).toBe(5)
  })

  it('la reduction ne devrait pas depasser le sous-total', async () => {
    mockFindUnique.mockResolvedValueOnce({
      code: 'BIG',
      isActive: true,
      type: 'fixed',
      value: 100,
      minOrder: 0,
      maxUses: 0,
      currentUses: 0,
      expiresAt: null,
    })
    const res = await POST(makeRequest({ code: 'BIG', subtotal: 30 }))
    const data = await res.json()
    expect(data.discount).toBe(30) // plafonné au subtotal
  })

  it('devrait convertir le code en majuscules (case-insensitive)', async () => {
    mockFindUnique.mockResolvedValueOnce({
      code: 'PROMO10',
      isActive: true,
      type: 'percentage',
      value: 10,
      minOrder: 0,
      maxUses: 0,
      currentUses: 0,
      expiresAt: null,
    })
    await POST(makeRequest({ code: 'promo10', subtotal: 50 }))
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { code: 'PROMO10' },
    })
  })
})
