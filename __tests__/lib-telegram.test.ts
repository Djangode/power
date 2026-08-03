import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  sendNewOrderToTelegram,
  sendTelegramMessage,
  isTelegramConfigured,
  type TelegramOrderPayload,
} from '@/lib/telegram'

/**
 * TESTS — Notification Telegram.
 *
 * Deux exigences : ne jamais faire échouer une commande quand Telegram est absent ou en
 * panne, et échapper correctement le MarkdownV2, dont la ponctuation non échappée fait
 * rejeter le message entier par l'API (le commerçant ne recevrait rien, silencieusement).
 */

const ORDER: TelegramOrderPayload = {
  orderNumber: 'CMD-A1B2C3',
  customerName: 'Jean Dupont',
  customerPhone: '06 12 34 56 78',
  total: 24.9,
  deliveryMethod: 'retrait',
  deliveryDate: new Date('2026-08-10T12:00:00'),
  deliverySlot: '10h - 12h',
  pickupCode: 'AB12CD',
  address: null,
  paymentLabel: 'Espèces à la réception',
  items: [{ name: 'Tomates', quantity: 2, price: 10 }],
}

describe('lib/telegram', () => {
  const OLD_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const OLD_CHAT = process.env.TELEGRAM_CHAT_ID

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    process.env.TELEGRAM_CHAT_ID = '123456'
  })

  afterEach(() => {
    if (OLD_TOKEN === undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN = OLD_TOKEN
    if (OLD_CHAT === undefined) delete process.env.TELEGRAM_CHAT_ID
    else process.env.TELEGRAM_CHAT_ID = OLD_CHAT
  })

  describe('configuration absente', () => {
    it('devrait se declarer non configure sans jeton', () => {
      delete process.env.TELEGRAM_BOT_TOKEN
      expect(isTelegramConfigured()).toBe(false)
    })

    it('ne devrait pas appeler l API sans configuration', async () => {
      delete process.env.TELEGRAM_CHAT_ID
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      const sent = await sendNewOrderToTelegram(ORDER)

      expect(sent).toBe(false)
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('résilience', () => {
    it('devrait renvoyer false sans lever si l API repond une erreur', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Bad Request', { status: 400 }),
      )
      await expect(sendTelegramMessage('test')).resolves.toBe(false)
    })

    it('devrait renvoyer false sans lever si le reseau tombe', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
      await expect(sendTelegramMessage('test')).resolves.toBe(false)
    })
  })

  describe('contenu du message', () => {
    async function capturePayload(order = ORDER) {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
      await sendNewOrderToTelegram(order)
      const [, init] = fetchSpy.mock.calls[0]
      return JSON.parse(String(init?.body))
    }

    it('devrait poster vers le bon bot et la bonne conversation', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
      await sendNewOrderToTelegram(ORDER)

      const [url] = fetchSpy.mock.calls[0]
      expect(String(url)).toContain('/bottest-token/sendMessage')
      expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)).chat_id).toBe('123456')
    })

    it('devrait signer avec le nom du bot', async () => {
      const payload = await capturePayload()
      expect(payload.text).toContain('Power Man')
    })

    it('devrait porter le numero de commande, le total et les articles', async () => {
      const payload = await capturePayload()
      expect(payload.text).toContain('CMD')
      expect(payload.text).toContain('Tomates')
      expect(payload.text).toContain('24')
    })

    it('devrait annoncer le code de retrait pour un click and collect', async () => {
      const payload = await capturePayload()
      expect(payload.text).toContain('Retrait en magasin')
      expect(payload.text).toContain('AB12CD')
    })

    it('devrait afficher l adresse pour une livraison', async () => {
      const payload = await capturePayload({
        ...ORDER,
        deliveryMethod: 'livraison',
        pickupCode: null,
        address: { line: '5 rue des Lilas', postalCode: '94140', city: 'Alfortville' },
      })
      expect(payload.text).toContain('Livraison')
      expect(payload.text).toContain('Alfortville')
    })

    // Un point ou un tiret non échappé fait rejeter tout le message par Telegram.
    it('devrait echapper la ponctuation MarkdownV2', async () => {
      const payload = await capturePayload({
        ...ORDER,
        customerName: 'Jean-Luc M. (pro)',
        items: [{ name: 'Pommes [bio] 1.5kg', quantity: 1, price: 3.5 }],
      })

      expect(payload.parse_mode).toBe('MarkdownV2')
      expect(payload.text).toContain('Jean\\-Luc M\\. \\(pro\\)')
      expect(payload.text).toContain('Pommes \\[bio\\] 1\\.5kg')
    })
  })

  describe('unités et compositions', () => {
    async function capture(order: TelegramOrderPayload) {
      const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
      await sendNewOrderToTelegram(order)
      return JSON.parse(String(spy.mock.calls[0][1]?.body)).text as string
    }

    // « 0.3 » ne se prépare pas derrière un étal : le commerçant a besoin du poids.
    it('devrait annoncer le poids plutot que la quantite brute', async () => {
      const text = await capture({
        ...ORDER,
        items: [{ name: 'Tomates', quantity: 0.3, price: 3.8, unit: 'kg' }],
      })
      expect(text).toContain('300 g')
      expect(text).not.toContain('× 0.3')
    })

    it('devrait accorder les unites indivisibles', async () => {
      const text = await capture({
        ...ORDER,
        items: [{ name: 'Salade', quantity: 2, price: 1.5, unit: 'piece' }],
      })
      expect(text).toContain('2 pièces')
    })

    // Sans le détail, un plateau arrive sans recette : le commerçant ne sait pas quoi mettre.
    it('devrait detailler le format et les ingredients d une composition', async () => {
      const text = await capture({
        ...ORDER,
        items: [{
          name: 'Plateau de fruits découpés',
          quantity: 1,
          price: 30,
          unit: null,
          selection: {
            sizeName: 'Moyen',
            included: ['Ananas', 'Melon', 'Kiwi'],
            extras: [{ name: 'Mangue', price: 2 }],
          },
        }],
      })
      expect(text).toContain('Format')
      expect(text).toContain('Moyen')
      expect(text).toContain('Compris')
      expect(text).toContain('Ananas, Melon, Kiwi')
      expect(text).toContain('Mangue')
    })

    it('devrait lister chaque supplement avec son prix', async () => {
      const text = await capture({
        ...ORDER,
        items: [{
          name: 'Smoothie',
          quantity: 1,
          price: 7,
          unit: null,
          selection: {
            sizeName: 'Smoothie',
            included: ['Banane', 'Fraise'],
            extras: [{ name: 'Mangue', price: 1 }, { name: 'Chia', price: 1.5 }],
          },
        }],
      })
      expect(text).toContain('Mangue')
      expect(text).toContain('Chia')
      expect(text).toContain('1\\.50')
    })

    it('ne devrait rien ajouter pour un produit simple', async () => {
      const text = await capture({
        ...ORDER,
        items: [{ name: 'Tomates', quantity: 1, price: 3.8, unit: 'kg' }],
      })
      expect(text).not.toContain('Format')
      expect(text).not.toContain('Compris')
    })
  })
})
