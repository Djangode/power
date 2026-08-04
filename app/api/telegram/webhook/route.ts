import { NextRequest, NextResponse } from "next/server"
import { handleMessage, handleCallback } from "@/lib/bot/handler"
import { sendText, sendButtons, answerCallback } from "@/lib/bot/telegram-io"

/**
 * Webhook du bot de gestion Telegram.
 *
 * Telegram POST ici chaque message reçu par le bot. On répond TOUJOURS 200 : un code d'erreur
 * ferait retenter Telegram en boucle, on gère donc les refus en interne sans les lui remonter.
 *
 * Sécurité, deux barrières :
 *   1. En-tête secret (X-Telegram-Bot-Api-Secret-Token) fixé à la déclaration du webhook, vérifié
 *      à chaque appel : empêche n'importe qui de POSTer sur cette URL publique.
 *   2. Identifiant de conversation : seul le TELEGRAM_CHAT_ID configuré (le commerçant) est servi.
 *      Un inconnu qui trouverait le bot ne pourrait rien piloter.
 */

function authorizedChat(id: unknown): boolean {
    const allowed = process.env.TELEGRAM_CHAT_ID
    return Boolean(allowed) && String(id) === allowed
}

export async function POST(req: NextRequest) {
    // Barrière 1 : l'en-tête secret. Sans secret configuré côté serveur, on refuse tout —
    // mieux vaut un bot muet qu'un webhook ouvert à tous.
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    const header = req.headers.get("x-telegram-bot-api-secret-token")
    if (!secret || header !== secret) {
        return NextResponse.json({ ok: true }) // 200 volontaire : on n'informe pas l'appelant.
    }

    const update = await req.json().catch(() => null)
    if (!update) return NextResponse.json({ ok: true })

    try {
        // Clic sur un bouton de confirmation.
        if (update.callback_query) {
            const cb = update.callback_query
            const chatId = cb.message?.chat?.id
            if (!authorizedChat(chatId)) {
                await answerCallback(cb.id) // on ferme le « chargement » sans rien faire
                return NextResponse.json({ ok: true })
            }
            await answerCallback(cb.id)
            const reply = await handleCallback(String(cb.data ?? ""))
            await sendText(String(chatId), reply.text)
            return NextResponse.json({ ok: true })
        }

        // Message texte.
        const message = update.message ?? update.edited_message
        const chatId = message?.chat?.id
        const text = message?.text

        // Barrière 2 : seul le commerçant configuré est servi.
        if (!authorizedChat(chatId)) {
            return NextResponse.json({ ok: true })
        }
        if (typeof text !== "string" || !text.trim()) {
            return NextResponse.json({ ok: true })
        }

        const reply = await handleMessage(text)
        if (reply.buttons) {
            await sendButtons(String(chatId), reply.text, reply.buttons)
        } else {
            await sendText(String(chatId), reply.text)
        }
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error("🔴 Erreur webhook Telegram:", error)
        // On tente d'avertir le commerçant, sans jamais faire échouer la requête Telegram.
        const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id
        if (authorizedChat(chatId)) {
            await sendText(String(chatId), "⚠️ Une erreur est survenue. Réessaie dans un instant.")
        }
        return NextResponse.json({ ok: true })
    }
}
