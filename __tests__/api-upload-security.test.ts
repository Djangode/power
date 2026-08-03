import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

const mockBlobPut = vi.fn()
vi.mock('@vercel/blob', () => ({
  put: (...args: unknown[]) => mockBlobPut(...args),
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

  // Comportement de production : le disque est en lecture seule sur Vercel, l'image doit
  // partir sur Vercel Blob. C'est le chemin qui était cassé et qui laissait le catalogue
  // sans aucune photo.
  describe('stockage en production', () => {
    const OLD_ENV = process.env.BLOB_READ_WRITE_TOKEN

    afterEach(() => {
      if (OLD_ENV === undefined) delete process.env.BLOB_READ_WRITE_TOKEN
      else process.env.BLOB_READ_WRITE_TOKEN = OLD_ENV
    })

    it('devrait televerser vers Vercel Blob quand le jeton est present', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test'
      mockBlobPut.mockResolvedValueOnce({ url: 'https://abc.public.blob.vercel-storage.com/products/x.webp' })
      mockAuth.mockResolvedValueOnce({ user: { role: 'admin' } })

      const res = await POST(makeUploadRequest('photo.jpg', 'image/jpeg'))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.url).toBe('https://abc.public.blob.vercel-storage.com/products/x.webp')
      expect(mockBlobPut).toHaveBeenCalledWith(
        expect.stringMatching(/^products\/\d+-[a-z0-9]+\.webp$/),
        expect.anything(),
        expect.objectContaining({ access: 'public', contentType: 'image/webp' }),
      )
    })
  })
})
