/**
 * Notification des commandes par Telegram.
 *
 * Complète l'email : sur un téléphone, une notification Telegram arrive immédiatement,
 * là où un email de commande peut rester plusieurs minutes dans une boîte ou finir en
 * indésirables. Le commerçant a besoin de savoir tout de suite qu'une commande est tombée.
 *
 * Configuration (variables d'environnement) :
 *   TELEGRAM_BOT_TOKEN  — jeton donné par @BotFather à la création du bot
 *   TELEGRAM_CHAT_ID    — identifiant de la conversation ou du groupe destinataire
 *
 * Sans ces deux variables, les fonctions ne font rien : la boutique doit continuer à
 * fonctionner normalement quand la notification n'est pas configurée.
 */

import { formatQuantity } from "@/lib/units"

const TELEGRAM_API = "https://api.telegram.org"

/** Nom sous lequel l'assistant signe ses messages. */
export const BOT_NAME = "Power Man"

export type TelegramOrderItem = {
    name: string
    quantity: number
    price: number
    /** Unité de vente, pour annoncer « 300 g » plutôt qu'un nombre nu. */
    unit?: string | null
    /** Détail d'une composition : sans lui, le commerçant ne sait pas quoi préparer. */
    selection?: {
        sizeName: string | null
        included: string[]
        extras: { name: string; price: number }[]
    } | null
}

export type TelegramOrderPayload = {
    orderNumber: string
    customerName: string
    customerPhone?: string | null
    total: number
    deliveryMethod: string | null
    deliveryDate: Date | null
    deliverySlot: string | null
    pickupCode?: string | null
    address?: { line?: string | null; postalCode?: string | null; city?: string | null } | null
    paymentLabel: string
    items: TelegramOrderItem[]
}

export function isTelegramConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

/** Échappe le texte pour le mode MarkdownV2 de Telegram, très strict sur la ponctuation. */
function escapeMarkdown(value: string): string {
    return value.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`)
}

function formatDate(date: Date | null): string {
    if (!date) return "non précisée"
    return new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Europe/Paris",
    }).format(date)
}

/** Envoie un message brut. Renvoie false en cas d'échec, sans jamais lever d'exception. */
export async function sendTelegramMessage(text: string): Promise<boolean> {
    if (!isTelegramConfigured()) return false

    try {
        const res = await fetch(`${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text,
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true,
            }),
            signal: AbortSignal.timeout(10_000),
        })

        if (!res.ok) {
            const detail = await res.text().catch(() => "")
            console.error(`⚠️ Telegram HTTP ${res.status}: ${detail.slice(0, 300)}`)
            return false
        }
        return true
    } catch (error) {
        console.error("⚠️ Telegram indisponible:", error)
        return false
    }
}

/** Notification de nouvelle commande, mise en forme pour une lecture au coup d'œil. */
export async function sendNewOrderToTelegram(order: TelegramOrderPayload): Promise<boolean> {
    const isPickup = order.deliveryMethod === "retrait"

    const lines: string[] = [
        `🛒 *${escapeMarkdown(BOT_NAME)}* — Nouvelle commande ${escapeMarkdown(order.orderNumber)}`,
        "",
        `👤 ${escapeMarkdown(order.customerName)}`,
    ]

    if (order.customerPhone) {
        lines.push(`📞 ${escapeMarkdown(order.customerPhone)}`)
    }

    lines.push(
        "",
        isPickup ? "🏪 *Retrait en magasin*" : "🚚 *Livraison*",
        `📅 ${escapeMarkdown(formatDate(order.deliveryDate))}${order.deliverySlot ? ` — ${escapeMarkdown(order.deliverySlot)}` : ""}`,
    )

    if (!isPickup && order.address?.line) {
        const full = [order.address.line, order.address.postalCode, order.address.city]
            .filter(Boolean)
            .join(" ")
        lines.push(`📍 ${escapeMarkdown(full)}`)
    }

    if (isPickup && order.pickupCode) {
        lines.push(`🔑 Code de retrait : *${escapeMarkdown(order.pickupCode)}*`)
    }

    lines.push("", "*Articles*")
    for (const item of order.items) {
        const total = (item.price * item.quantity).toFixed(2)
        // La quantité est annoncée dans l'unité de vente : « 300 g » se prépare,
        // « 0.3 » ne veut rien dire derrière un étal.
        const qty = item.unit ? formatQuantity(item.quantity, item.unit) : `× ${item.quantity}`
        lines.push(`• ${escapeMarkdown(item.name)} — ${escapeMarkdown(qty)} — ${escapeMarkdown(total)} €`)

        // Détail d'une composition : c'est la préparation à faire, pas un supplément
        // d'information. Sans ces lignes, un plateau ou un smoothie arrive sans recette.
        if (item.selection) {
            if (item.selection.sizeName) {
                lines.push(`    ↳ Format : ${escapeMarkdown(item.selection.sizeName)}`)
            }
            if (item.selection.included.length) {
                lines.push(`    ↳ Compris : ${escapeMarkdown(item.selection.included.join(", "))}`)
            }
            for (const extra of item.selection.extras) {
                lines.push(
                    `    ↳ Supplément : ${escapeMarkdown(extra.name)} \\(\\+${escapeMarkdown(extra.price.toFixed(2))} €\\)`,
                )
            }
        }
    }

    lines.push(
        "",
        `💶 *Total : ${escapeMarkdown(order.total.toFixed(2))} €*`,
        `💳 ${escapeMarkdown(order.paymentLabel)}`,
    )

    return sendTelegramMessage(lines.join("\n"))
}
