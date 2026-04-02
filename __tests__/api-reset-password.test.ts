import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===== Mocks =====
const mockSiteSettingFindUnique = vi.fn()
const mockSiteSettingDelete = vi.fn()
const mockUserUpdate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    siteSetting: {
      findUnique: (...args: any[]) => mockSiteSettingFindUnique(...args),
      delete: (...args: any[]) => mockSiteSettingDelete(...args),
    },
    user: {
      update: (...args: any[]) => mockUserUpdate(...args),
    },
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('new_hashed_password'),
  },
}))

import { POST } from '@/app/api/auth/reset-password/route'
import { NextRequest } from 'next/server'

function makeRequest(body: any) {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter si token manquant', async () => {
    const res = await POST(makeRequest({ uid: 'user-1', password: 'newpassword1' }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter si uid manquant', async () => {
    const res = await POST(makeRequest({ token: 'abc', password: 'newpassword1' }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter si password manquant', async () => {
    const res = await POST(makeRequest({ token: 'abc', uid: 'user-1' }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter un mot de passe < 8 caracteres', async () => {
    const res = await POST(makeRequest({ token: 'abc', uid: 'user-1', password: '1234567' }))
    expect(res.status).toBe(400)
  })

  it('devrait accepter un mot de passe de 8 caracteres', async () => {
    mockSiteSettingFindUnique.mockResolvedValueOnce({
      key: 'reset_user-1',
      value: JSON.stringify({
        token: 'valid-token',
        expiry: new Date(Date.now() + 3600000).toISOString(),
      }),
    })
    mockUserUpdate.mockResolvedValueOnce({ id: 'user-1' })
    mockSiteSettingDelete.mockResolvedValueOnce({})

    const res = await POST(makeRequest({ token: 'valid-token', uid: 'user-1', password: '12345678' }))
    expect(res.status).toBe(200)
  })

  it('devrait rejeter un token invalide (pas en DB)', async () => {
    mockSiteSettingFindUnique.mockResolvedValueOnce(null)
    const res = await POST(makeRequest({ token: 'bad-token', uid: 'user-1', password: 'newpassword123' }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter un token qui ne correspond pas', async () => {
    mockSiteSettingFindUnique.mockResolvedValueOnce({
      key: 'reset_user-1',
      value: JSON.stringify({
        token: 'correct-token',
        expiry: new Date(Date.now() + 3600000).toISOString(),
      }),
    })

    const res = await POST(makeRequest({ token: 'wrong-token', uid: 'user-1', password: 'newpassword123' }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter un token expire', async () => {
    mockSiteSettingFindUnique.mockResolvedValueOnce({
      key: 'reset_user-1',
      value: JSON.stringify({
        token: 'valid-token',
        expiry: new Date('2020-01-01').toISOString(),
      }),
    })

    const res = await POST(makeRequest({ token: 'valid-token', uid: 'user-1', password: 'newpassword123' }))
    expect(res.status).toBe(400)
    expect(mockSiteSettingDelete).toHaveBeenCalled()
  })

  it('devrait changer le mot de passe avec un token valide', async () => {
    mockSiteSettingFindUnique.mockResolvedValueOnce({
      key: 'reset_user-1',
      value: JSON.stringify({
        token: 'valid-token',
        expiry: new Date(Date.now() + 3600000).toISOString(),
      }),
    })
    mockUserUpdate.mockResolvedValueOnce({ id: 'user-1' })
    mockSiteSettingDelete.mockResolvedValueOnce({})

    const res = await POST(makeRequest({ token: 'valid-token', uid: 'user-1', password: 'newpassword123' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { password: 'new_hashed_password' },
      })
    )
    expect(mockSiteSettingDelete).toHaveBeenCalled()
  })
})
