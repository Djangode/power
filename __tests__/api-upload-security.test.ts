import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — Upload de fichiers (après sécurisation)
 *
 * Vérifie la validation du type MIME, de la taille,
 * et la protection contre les fichiers malveillants.
 */

const mockAuth = vi.fn()

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('compressed')),
  })),
}))

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/upload/route'

function makeUploadRequest(filename: string, type: string, content: string = 'fake-content') {
  const formData = new FormData()
  const blob = new Blob([content], { type })
  formData.append('file', new File([blob], filename, { type }))
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/upload — SECURISE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter un utilisateur non authentifie', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(makeUploadRequest('test.jpg', 'image/jpeg'))
    expect(res.status).toBe(401)
  })

  it('devrait rejeter un utilisateur non-admin', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'user' } })
    const res = await POST(makeUploadRequest('test.jpg', 'image/jpeg'))
    expect(res.status).toBe(401)
  })

  it('devrait rejeter si aucun fichier', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const formData = new FormData()
    const res = await POST(new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    }))
    expect(res.status).toBe(400)
  })

  it('devrait REJETER un fichier SVG (type MIME non autorise)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const res = await POST(makeUploadRequest('malicious.svg', 'image/svg+xml', '<svg></svg>'))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('non autorisé')
  })

  it('devrait REJETER un fichier executable', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const res = await POST(makeUploadRequest('virus.exe', 'application/x-executable', 'MZ'))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('non autorisé')
  })

  it('devrait REJETER un PDF', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const res = await POST(makeUploadRequest('doc.pdf', 'application/pdf', '%PDF'))
    expect(res.status).toBe(400)
  })

  it('devrait accepter une image JPEG', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const res = await POST(makeUploadRequest('photo.jpg', 'image/jpeg'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.url).toMatch(/^\/uploads\/\d+-[a-z0-9]+\.webp$/)
  })

  it('devrait accepter une image PNG', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const res = await POST(makeUploadRequest('photo.png', 'image/png'))
    expect(res.status).toBe(200)
  })

  it('devrait accepter une image WebP', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const res = await POST(makeUploadRequest('photo.webp', 'image/webp'))
    expect(res.status).toBe(200)
  })

  it('devrait generer un nom de fichier securise (pas de path traversal)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })
    const res = await POST(makeUploadRequest('../../../etc/passwd.jpg', 'image/jpeg'))
    expect(res.status).toBe(200)
    const data = await res.json()
    // Le nom est genere cote serveur, pas depuis le client
    expect(data.url).toMatch(/^\/uploads\/\d+-[a-z0-9]+\.webp$/)
    expect(data.url).not.toContain('..')
  })
})
