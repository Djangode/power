import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===== Mocks =====
const mockFindUnique = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  },
}))

// ===== Import route handler =====
import { POST } from '@/app/api/auth/register/route'

function makeRequest(body: any) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter un email invalide', async () => {
    const res = await POST(makeRequest({
      email: 'not-an-email',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('devrait rejeter un mot de passe trop court (< 8 caracteres)', async () => {
    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: '1234567', // 7 chars — trop court
      firstName: 'Test',
      lastName: 'User',
    }))
    expect(res.status).toBe(400)
  })

  it('devrait accepter un mot de passe de 8 caracteres', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    mockCreate.mockResolvedValueOnce({
      id: 'new-id', email: 'test@example.com', firstName: 'Test', lastName: 'User',
    })

    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: '12345678', // exactement 8
      firstName: 'Test',
      lastName: 'User',
    }))
    expect(res.status).toBe(201)
  })

  it('devrait rejeter si prenom manquant', async () => {
    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: 'password123',
      firstName: '',
      lastName: 'User',
    }))
    expect(res.status).toBe(400)
  })

  it('devrait rejeter si nom manquant', async () => {
    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: '',
    }))
    expect(res.status).toBe(400)
  })

  it('devrait retourner 409 si email deja utilise', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: '1', email: 'test@example.com' })

    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    }))
    expect(res.status).toBe(409)
  })

  it('devrait creer un utilisateur avec succes', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    mockCreate.mockResolvedValueOnce({
      id: 'new-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    })

    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('test@example.com')
  })

  it('ne devrait PAS retourner le mot de passe dans la reponse', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    mockCreate.mockResolvedValueOnce({
      id: 'new-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    })

    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    }))
    const data = await res.json()
    expect(data.user.password).toBeUndefined()
  })

  it('devrait forcer le role "user" (pas d\'escalade de privilege)', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    mockCreate.mockResolvedValueOnce({
      id: 'new-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    })

    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin', // tentative d'escalade
    }))
    expect(res.status).toBe(201)
    // Verifier que le create a ete appele avec role: "user"
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'user' }),
      })
    )
  })
})
