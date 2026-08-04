/**
 * Communication ENTRANTE/SORTANTE du bot de gestion Telegram.
 *
 * `lib/telegram.ts` ne fait que notifier (app → commerçant) et met en forme en MarkdownV2,
 * très strict sur la ponctuation. Le bot, lui, a besoin d'envoyer du texte libre, des
 * boutons de confirmation et d'accuser réception des clics. On sépare volontairement les
 * deux : la route de notification des commandes est testée en production et ne doit pas
 * bouger pour le bot.
 *
 * Toutes les fonctions échouent en silence (renvoient false) si le bot n'est pas configuré,
 * exactement comme les notifications : une panne du canal ne doit jamais faire planter l'app.
 */

const TELEGRAM_API = "https://api.telegram.org"

function botToken(): string | null {
    return process.env.TELEGRAM_BOT_TOKEN || null
}

export function isBotConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

/** Un bouton en ligne : libellé affiché + données renvoyées au webhook au clic (≤ 64 octets). */
export type InlineButton = { text: string; data: string }

async function call(method: string, body: Record<string, unknown>): Promise<boolean> {
    const token = botToken()
    if (!token) return false

    try {
        const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) {
            const detail = await res.text().catch(() => "")
            console.error(`⚠️ Telegram ${method} HTTP ${res.status}: ${detail.slice(0, 300)}`)
            return false
        }
        return true
    } catch (error) {
        console.error(`⚠️ Telegram ${method} indisponible:`, error)
        return false
    }
}

/**
 * Envoie un message texte simple. Pas de MarkdownV2 ici : le bot répond en langage courant
 * (noms de produits, montants, accents), qui déclencherait sans arrêt les erreurs d'échappement
 * du mode Markdown. On reste en texte brut, quitte à perdre le gras.
 */
export function sendText(chatId: string, text: string): Promise<boolean> {
    return call("sendMessage", {
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
    })
}

/**
 * Envoie un message accompagné de boutons de confirmation. C'est le garde-fou des actions
 * qui MODIFIENT quelque chose (stock, prix, statut de commande) : rien n'est appliqué tant
 * que le commerçant n'a pas tapé « Confirmer ».
 *
 * `rows` est une grille de boutons (une ligne = un tableau). Les `data` transitent tels quels
 * dans le webhook au clic ; Telegram les plafonne à 64 octets, d'où le format compact
 * `action:id:valeur` côté handler.
 */
export function sendButtons(chatId: string, text: string, rows: InlineButton[][]): Promise<boolean> {
    return call("sendMessage", {
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: rows.map((row) =>
                row.map((b) => ({ text: b.text, callback_data: b.data })),
            ),
        },
    })
}

/**
 * Accuse réception d'un clic sur bouton. Sans ça, Telegram laisse le bouton en « chargement »
 * quelques secondes côté commerçant, ce qui donne l'impression que le bot a planté.
 */
export function answerCallback(callbackQueryId: string, text?: string): Promise<boolean> {
    return call("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
    })
}
