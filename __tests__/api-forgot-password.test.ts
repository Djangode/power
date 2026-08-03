import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — Demande de réinitialisation de mot de passe.
 *
 * Point sensible : la réponse doit être identique que le compte existe ou non, sinon un
 * attaquant peut énumérer les emails inscrits. Une panne d'envoi ne doit donc pas non plus
 * faire diverger le code de réponse.
 */

const mockUserFindUnique = vi.fn()
const mockSettingUpsert = vi.fn()
const mockResendSend = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    siteSetting: { upsert: (...a: any[]) => mockSettingUpsert(...a) },
  },
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...a: any[]) => mockResendSend(...a) }
  },
}))

import { POST } from '@/app/api/auth/forgot-password/route'
import { NextRequest } from 'next/server'

function makeRequest(body: any) {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSettingUpsert.mockResolvedValue({})
    mockResendSend.mockResolvedValue({ id: 'email_1' })
  })

  it('devrait exiger un email', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  describe('anti-énumération', () => {
    it('devrait repondre 200 pour un compte inexistant, sans envoyer d email', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      const res = await POST(makeRequest({ email: 'inconnu@test.fr' }))
      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(true)
      expect(mockResendSend).not.toHaveBeenCalled()
    })

    it('devrait repondre 200 pour un compte existant', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'jean@test.fr' })
      const res = await POST(makeRequest({ email: 'jean@test.fr' }))
      expect(res.status).toBe(200)
      expect(mockResendSend).toHaveBeenCalled()
    })

    // Régression : sans best-effort, une panne Resend renverrait 500 pour un compte
    // existant et 200 sinon — l'écart trahit l'existence du compte.
    it('devrait rester en 200 meme si l envoi echoue', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'jean@test.fr' })
      mockResendSend.mockRejectedValueOnce(new Error('Resend down'))
      const res = await POST(makeRequest({ email: 'jean@test.fr' }))
      expect(res.status).toBe(200)
    })
  })

  it('devrait stocker un jeton de reinitialisation a duree limitee', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'jean@test.fr' })
    await POST(makeRequest({ email: 'jean@test.fr' }))

    expect(mockSettingUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'reset_u1' } }),
    )
    const stored = JSON.parse(mockSettingUpsert.mock.calls[0][0].create.value)
    expect(stored.token).toMatch(/^[a-f0-9]{64}$/)
    expect(new Date(stored.expiry).getTime()).toBeGreaterThan(Date.now())
  })
})
