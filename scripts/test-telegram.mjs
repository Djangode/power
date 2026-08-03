/**
 * Envoie un message Telegram de test, pour valider la configuration sans passer
 * une vraie commande.
 *
 * Usage : node --env-file=.env scripts/test-telegram.mjs
 *
 * Traduit les refus de l'API en action corrective : les erreurs Telegram sont laconiques
 * et la cause réelle (jeton invalide, conversation jamais ouverte, Markdown mal échappé)
 * n'est pas lisible dans la réponse brute.
 */

const TELEGRAM_API = "https://api.telegram.org"
const BOT_NAME = "Power Man"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

function explain(payload) {
    const code = payload?.error_code
    const description = payload?.description ?? ""

    if (code === 401) {
        return "Jeton invalide. Reprenez celui donné par @BotFather (format 123456789:AA...)."
    }
    if (description.includes("chat not found")) {
        return "Conversation introuvable. Écrivez d'abord un message à votre bot depuis Telegram, " +
            "puis relevez l'identifiant via https://api.telegram.org/bot<JETON>/getUpdates."
    }
    if (description.includes("bot was blocked")) {
        return "Le bot a été bloqué par le destinataire. Débloquez-le dans Telegram."
    }
    if (description.includes("can't parse entities")) {
        return "Markdown mal échappé — un caractère de ponctuation n'a pas été protégé."
    }
    return description || "Erreur inconnue."
}

async function main() {
    const missing = []
    if (!TOKEN) missing.push("TELEGRAM_BOT_TOKEN")
    if (!CHAT_ID) missing.push("TELEGRAM_CHAT_ID")

    if (missing.length) {
        console.log("Configuration incomplète. Variables manquantes dans .env :\n")
        for (const key of missing) console.log(`  ${key}=`)
        console.log("\n1. Dans Telegram, écrivez à @BotFather et envoyez /newbot")
        console.log("2. Écrivez un message au bot créé")
        console.log("3. Ouvrez https://api.telegram.org/bot<JETON>/getUpdates et relevez \"chat\":{\"id\":...}")
        process.exit(1)
    }

    // Échappement MarkdownV2 : la même règle que lib/telegram.ts, sans quoi Telegram
    // rejette le message entier.
    const esc = (v) => v.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`)

    const text = [
        `🛒 *${esc(BOT_NAME)}* — message de test`,
        "",
        "Si vous lisez ceci, les notifications de commande sont opérationnelles\\.",
        "",
        `👤 ${esc("Client de test")}`,
        `📞 ${esc("06 12 34 56 78")}`,
        "",
        "🏪 *Retrait en magasin*",
        `📅 ${esc("aujourd'hui")} — ${esc("10h - 12h")}`,
        `🔑 Code de retrait : *${esc("TEST01")}*`,
        "",
        "*Articles*",
        `• ${esc("Tomates")} × 2 — ${esc("20.00")} €`,
        "",
        `💶 *Total : ${esc("24.90")} €*`,
        `💳 ${esc("Espèces à la réception")}`,
    ].join("\n")

    console.log(`Envoi d'un message de test vers la conversation ${CHAT_ID}…\n`)

    const res = await fetch(`${TELEGRAM_API}/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: CHAT_ID,
            text,
            parse_mode: "MarkdownV2",
            disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(15_000),
    })

    const payload = await res.json().catch(() => ({}))

    if (res.ok && payload?.ok) {
        console.log("✓ Message envoyé")
        console.log("\nRegardez Telegram : vous devriez avoir reçu le récapitulatif de test.")
        return
    }

    console.log(`✗ Refusé par Telegram (HTTP ${res.status})`)
    console.log(`\n  ${explain(payload)}`)
    process.exit(1)
}

main().catch((error) => {
    console.error("Échec :", error.message)
    process.exit(1)
})
