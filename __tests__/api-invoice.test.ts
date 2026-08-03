import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TESTS — Génération de facture.
 *
 * Couvre trois exigences distinctes :
 *  - le contrôle d'accès (une facture porte nom, adresse et téléphone d'un client) ;
 *  - l'échappement du HTML, les champs client étant des saisies libres ;
 *  - les mentions de TVA, qui diffèrent selon le régime et dont l'absence rend la
 *    facture non conforme.
 */

const mockAuth = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockOrderUpdate = vi.fn()
const mockGetInvoiceSettings = vi.fn()
const mockNextInvoiceNumber = vi.fn()

vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

vi.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findUnique: (...a: any[]) => mockOrderFindUnique(...a),
      update: (...a: any[]) => mockOrderUpdate(...a),
    },
  },
}))

vi.mock('@/app/actions/content', () => ({
  getInvoiceSettings: () => mockGetInvoiceSettings(),
}))

vi.mock('@/lib/invoice', () => ({
  nextInvoiceNumber: () => mockNextInvoiceNumber(),
}))

import { GET } from '@/app/api/invoices/[orderId]/route'
import { NextRequest } from 'next/server'

const params = Promise.resolve({ orderId: 'o1' })
const req = () => new NextRequest('http://localhost/api/invoices/o1')

const SETTINGS_COMPLETE = {
  legalName: 'POWER', legalForm: 'SARL',
  address: '114 rue Paul Vaillant Couturier, 94140 Alfortville',
  siret: '944 504 794 00016', rcs: 'RCS Créteil 944 504 794',
  vatNumber: 'FR00944504794', phone: '0100000000', email: 'contact@powerprimeur.com',
  vatRegime: 'franchise' as const, vatRate: 5.5,
  paymentTerms: 'Paiement comptant à la réception.', missing: [] as string[],
}

function makeOrder(overrides: any = {}) {
  return {
    id: 'order_abcdef', userId: 'u1', total: 24.9, deliveryFee: 4.9, discount: 0,
    promoCode: null, invoiceNumber: 'FAC-000001', createdAt: new Date('2026-08-03'),
    user: {
      firstName: 'Jean', lastName: 'Dupont', email: 'jean@test.fr',
      address: '5 rue des Lilas', postalCode: '94140', city: 'Alfortville', phone: '0612345678',
    },
    items: [
      { priceAtPurchase: 10, quantity: 2, product: { name: 'Tomates' }, composition: null },
    ],
    ...overrides,
  }
}

describe('GET /api/invoices/[orderId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } })
    mockOrderFindUnique.mockResolvedValue(makeOrder())
    mockGetInvoiceSettings.mockResolvedValue(SETTINGS_COMPLETE)
    mockNextInvoiceNumber.mockResolvedValue('FAC-000002')
  })

  describe('accès', () => {
    it('devrait refuser un visiteur non authentifie', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await GET(req(), { params })
      expect(res.status).toBe(401)
    })

    it('devrait refuser la facture d un autre client', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'autre', role: 'user' } })
      const res = await GET(req(), { params })
      expect(res.status).toBe(403)
    })

    it('devrait autoriser un admin', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'admin1', role: 'admin' } })
      const res = await GET(req(), { params })
      expect(res.status).toBe(200)
    })

    it('devrait repondre 404 sur une commande inexistante', async () => {
      mockOrderFindUnique.mockResolvedValue(null)
      const res = await GET(req(), { params })
      expect(res.status).toBe(404)
    })
  })

  describe('échappement HTML', () => {
    it('ne devrait pas injecter de script depuis le nom du client', async () => {
      mockOrderFindUnique.mockResolvedValue(
        makeOrder({
          user: {
            firstName: '<script>alert(1)</script>', lastName: 'Dupont',
            email: 'jean@test.fr', address: '5 rue', postalCode: '94140',
            city: 'Alfortville', phone: '0612345678',
          },
        }),
      )

      const html = await (await GET(req(), { params })).text()

      expect(html).not.toContain('<script>alert(1)</script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('ne devrait pas injecter de balise depuis le nom d un article', async () => {
      mockOrderFindUnique.mockResolvedValue(
        makeOrder({
          items: [
            { priceAtPurchase: 10, quantity: 2, product: { name: '<img src=x onerror=alert(1)>' }, composition: null },
          ],
        }),
      )

      const html = await (await GET(req(), { params })).text()

      expect(html).not.toContain('<img src=x')
      expect(html).toContain('&lt;img')
    })
  })

  describe('TVA', () => {
    it('devrait porter la mention de franchise en base', async () => {
      const html = await (await GET(req(), { params })).text()
      expect(html).toContain('TVA non applicable')
      expect(html).toContain('293 B')
    })

    it('devrait detailler HT et TVA pour un assujetti', async () => {
      mockGetInvoiceSettings.mockResolvedValue({ ...SETTINGS_COMPLETE, vatRegime: 'assujetti' })

      const html = await (await GET(req(), { params })).text()

      expect(html).toContain('Total HT')
      expect(html).toContain('TVA 5,5 %')
      // 24,90 € TTC à 5,5 % → 23,60 € HT et 1,30 € de TVA
      expect(html).toContain('23.60')
      expect(html).toContain('1.30')
    })
  })

  describe('mentions légales', () => {
    it('devrait afficher SIRET et RCS', async () => {
      const html = await (await GET(req(), { params })).text()
      expect(html).toContain('944 504 794 00016')
      expect(html).toContain('RCS Créteil')
    })

    it('devrait signaler les mentions manquantes', async () => {
      mockGetInvoiceSettings.mockResolvedValue({
        ...SETTINGS_COMPLETE, siret: '', missing: ['Numéro SIRET', 'Régime de TVA'],
      })

      const html = await (await GET(req(), { params })).text()

      expect(html).toContain('Facture incomplète')
      expect(html).toContain('Numéro SIRET')
    })

    it('devrait rappeler les penalites de retard', async () => {
      const html = await (await GET(req(), { params })).text()
      expect(html).toContain('L441-10')
    })
  })

  describe('numérotation', () => {
    it('devrait attribuer un numero sequentiel si la commande n en a pas', async () => {
      mockOrderFindUnique.mockResolvedValue(makeOrder({ invoiceNumber: null }))

      const html = await (await GET(req(), { params })).text()

      expect(mockNextInvoiceNumber).toHaveBeenCalled()
      expect(mockOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { invoiceNumber: 'FAC-000002' } }),
      )
      expect(html).toContain('FAC-000002')
    })

    it('devrait conserver le numero existant', async () => {
      const html = await (await GET(req(), { params })).text()
      expect(mockNextInvoiceNumber).not.toHaveBeenCalled()
      expect(html).toContain('FAC-000001')
    })
  })
})
