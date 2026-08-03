import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — Envoi d'emailing marketing.
 *
 * Deux exigences : réservé aux admins (sinon n'importe qui déclenche un envoi de masse),
 * et strictement limité aux clients ayant consenti (RGPD) — jamais toute la base.
 */

const mockAuth = vi.fn()
const mockUserFindMany = vi.fn()
const mockPromoCreate = vi.fn()
const mockSendMarketingEmail = vi.fn()

vi.mock('@/auth', () => ({ auth: () => mockAuth() }))
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findMany: (...a: any[]) => mockUserFindMany(...a) },
    promoCode: { create: (...a: any[]) => mockPromoCreate(...a) },
  },
}))
vi.mock('@/lib/email', () => ({
  sendMarketingEmail: (...a: any[]) => mockSendMarketingEmail(...a),
}))

import { POST } from '@/app/api/admin/marketing/send/route'
import { NextRequest } from 'next/server'

function makeRequest(body: any) {
  return new NextRequest('http://localhost/api/admin/marketing/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/marketing/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockUserFindMany.mockResolvedValue([{ email: 'client@test.fr' }])
    mockSendMarketingEmail.mockResolvedValue({ success: true, sent: 1 })
  })

  describe('accès', () => {
    it('devrait refuser un visiteur non authentifie', async () => {
      mockAuth.mockResolvedValue(null)
      const res = await POST(makeRequest({ subject: 'Promo', message: 'Bonjour' }))
      expect(res.status).toBe(401)
      expect(mockSendMarketingEmail).not.toHaveBeenCalled()
    })

    it('devrait refuser un client authentifie', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } })
      const res = await POST(makeRequest({ subject: 'Promo', message: 'Bonjour' }))
      expect(res.status).toBe(401)
    })
  })

  it('devrait exiger un sujet et un message', async () => {
    expect((await POST(makeRequest({ subject: '', message: 'x' }))).status).toBe(400)
    expect((await POST(makeRequest({ subject: 'x', message: '  ' }))).status).toBe(400)
  })

  describe('consentement RGPD', () => {
    it('ne cible que les clients ayant consenti (newsletter ou promotions)', async () => {
      await POST(makeRequest({ subject: 'Promo', message: 'Bonjour' }))
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'user',
            isActive: true,
            preferences: { OR: [{ promotions: true }, { newsletter: true }] },
          }),
        }),
      )
    })

    it('refuse l envoi si personne n a consenti', async () => {
      mockUserFindMany.mockResolvedValue([])
      const res = await POST(makeRequest({ subject: 'Promo', message: 'Bonjour' }))
      expect(res.status).toBe(400)
      expect(mockSendMarketingEmail).not.toHaveBeenCalled()
    })
  })

  it('envoie aux destinataires consentants', async () => {
    mockUserFindMany.mockResolvedValue([{ email: 'a@test.fr' }, { email: 'b@test.fr' }])
    const res = await POST(makeRequest({ subject: 'Promo', message: 'Bonjour' }))
    expect(res.status).toBe(200)
    const [emails, subject] = mockSendMarketingEmail.mock.calls[0]
    expect(emails).toEqual(['a@test.fr', 'b@test.fr'])
    expect(subject).toBe('Promo')
  })

  it('genere un code promo quand demande', async () => {
    mockPromoCreate.mockResolvedValue({ code: 'PROMO10', minOrder: 0, expiresAt: null })
    await POST(makeRequest({
      subject: 'Promo', message: 'Bonjour',
      includePromo: true, promoType: 'percentage', promoValue: 10,
    }))
    expect(mockPromoCreate).toHaveBeenCalled()
  })
})
