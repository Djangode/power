import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — Création d'un employé.
 *
 * Régression majeure : le formulaire envoyait un mot de passe en dur, identique pour tout
 * le personnel et lisible dans le bundle du navigateur. Le mot de passe doit être généré
 * côté serveur, ignoré s'il vient du client, et transmis uniquement par email.
 */

const mockAuth = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()
const mockSendTeamInvitation = vi.fn()
const mockHash = vi.fn()

vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: (...a: any[]) => mockUserFindUnique(...a),
      create: (...a: any[]) => mockUserCreate(...a),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

vi.mock('@/lib/email', () => ({
  sendTeamInvitation: (...a: any[]) => mockSendTeamInvitation(...a),
}))

vi.mock('bcryptjs', () => ({
  default: { hash: (...a: any[]) => mockHash(...a) },
}))

import { POST } from '@/app/api/admin/team/route'
import { NextRequest } from 'next/server'

const VALID = {
  firstName: 'Sofia',
  lastName: 'Bernard',
  email: 'Sofia.Bernard@Test.FR',
  phone: '0612345678',
  role: 'cashier',
  salary: 12.5,
  salaryType: 'hourly',
  hoursPerWeek: 35,
}

function makeRequest(body: any = {}) {
  return new NextRequest('http://localhost/api/admin/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...VALID, ...body }),
  })
}

describe('POST /api/admin/team', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockUserFindUnique.mockResolvedValue(null)
    mockUserCreate.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'u9', ...data }),
    )
    mockHash.mockResolvedValue('$2a$12$hashed')
    mockSendTeamInvitation.mockResolvedValue(undefined)
  })

  describe('accès', () => {
    it('devrait refuser un non-admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } })
      const res = await POST(makeRequest())
      expect(res.status).toBe(401)
    })

    it('devrait refuser un email deja utilise', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'existant' })
      const res = await POST(makeRequest())
      expect(res.status).toBe(409)
    })

    it('devrait refuser un role inconnu', async () => {
      const res = await POST(makeRequest({ role: 'directeur' }))
      expect(res.status).toBe(400)
    })
  })

  describe('mot de passe', () => {
    it('devrait generer un mot de passe sans en attendre du client', async () => {
      const res = await POST(makeRequest())
      expect(res.status).toBe(201)
      expect(mockHash).toHaveBeenCalledTimes(1)

      const [generated] = mockHash.mock.calls[0]
      expect(typeof generated).toBe('string')
      expect(generated.length).toBeGreaterThanOrEqual(12)
    })

    // Le cœur de la régression : un mot de passe fourni par le navigateur ne doit
    // jamais devenir celui du compte.
    it('devrait ignorer un mot de passe envoye par le client', async () => {
      await POST(makeRequest({ password: 'Power2024!' }))
      const [generated] = mockHash.mock.calls[0]
      expect(generated).not.toBe('Power2024!')
    })

    it('devrait produire un mot de passe different a chaque employe', async () => {
      await POST(makeRequest({ email: 'a@test.fr' }))
      await POST(makeRequest({ email: 'b@test.fr' }))
      expect(mockHash.mock.calls[0][0]).not.toBe(mockHash.mock.calls[1][0])
    })

    it('ne devrait jamais renvoyer le mot de passe dans la reponse', async () => {
      const res = await POST(makeRequest())
      const body = await res.json()
      expect(JSON.stringify(body)).not.toContain('$2a$12$hashed')
      expect(body.data.password).toBeUndefined()
    })

    it('devrait transmettre le mot de passe par email a l employe', async () => {
      await POST(makeRequest())
      const [email, , , sentPassword] = mockSendTeamInvitation.mock.calls[0]
      expect(email).toBe('sofia.bernard@test.fr')
      expect(sentPassword).toBe(mockHash.mock.calls[0][0])
    })
  })

  describe('persistance', () => {
    it('devrait normaliser l email en minuscules', async () => {
      await POST(makeRequest())
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'sofia.bernard@test.fr' }) }),
      )
    })

    it('devrait enregistrer les informations de remuneration', async () => {
      await POST(makeRequest())
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Sofia',
            lastName: 'Bernard',
            phone: '0612345678',
            role: 'cashier',
            salary: 12.5,
            salaryType: 'hourly',
            hoursPerWeek: 35,
          }),
        }),
      )
    })

    it('devrait creer le compte meme si l email d invitation echoue', async () => {
      mockSendTeamInvitation.mockRejectedValueOnce(new Error('Resend indisponible'))
      const res = await POST(makeRequest())
      expect(res.status).toBe(201)
    })
  })
})
