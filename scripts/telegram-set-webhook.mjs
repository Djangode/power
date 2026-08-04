/**
 * Déclare (ou met à jour) le webhook du bot de gestion auprès de Telegram.
 *
 * À lancer UNE FOIS après le déploiement, et à chaque fois que l'URL publique change.
 * Telegram enverra alors chaque message reçu par le bot vers /api/telegram/webhook.
 *
 * Génère un secret partagé (TELEGRAM_WEBHOOK_SECRET) s'il n'existe pas encore et l'écrit dans
 * .env : ce secret voyage dans un en-tête à chaque appel et empêche n'importe qui de POSTer
 * sur l'URL publique du webhook.
 *
 * Usage :
 *   node --env-file=.env scripts/telegram-set-webhook.mjs [URL_PUBLIQUE]
 *   (URL_PUBLIQUE facultative si NEXT_PUBLIC_APP_URL est défini, ex : https://powerprimeur.com)
 */

import { readFileSync, writeFileSync } from "node:fs"
import { randomBytes } from "node:crypto"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const API = "https://api.telegram.org"

function upsertEnv(key, value) {
    let env = readFileSync(".env", "utf8")
    const line = `${key}=${value}`
    if (new RegExp(`^${key}=.*$`, "m").test(env)) {
        env = env.replace(new RegExp(`^${key}=.*$`, "m"), line)
    } else {
        env = env.replace(/\s*$/, "") + `\n${line}\n`
    }
    writeFileSync(".env", env)
}

async function main() {
    if (!TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN manquant dans .env.")
        process.exit(1)
    }

    const appUrl = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
    if (!appUrl || appUrl.startsWith("http://localhost")) {
        console.error(
            "URL publique manquante ou locale.\n" +
                "Telegram ne peut pas joindre localhost — déploie d'abord, puis :\n" +
                "  node --env-file=.env scripts/telegram-set-webhook.mjs https://ton-domaine.com",
        )
        process.exit(1)
    }

    let secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (!secret) {
        secret = randomBytes(24).toString("hex")
        upsertEnv("TELEGRAM_WEBHOOK_SECRET", secret)
        console.log("✓ Secret généré et écrit dans .env (TELEGRAM_WEBHOOK_SECRET).")
        console.log("  ⚠️  Reporte-le dans les variables d'environnement de production (Vercel).")
    }

    const webhookUrl = `${appUrl}/api/telegram/webhook`
    const res = await fetch(`${API}/bot${TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: webhookUrl,
            secret_token: secret,
            allowed_updates: ["message", "edited_message", "callback_query"],
        }),
        signal: AbortSignal.timeout(15_000),
    })
    const json = await res.json()

    if (!json.ok) {
        console.error("Échec setWebhook :", json.description ?? json)
        process.exit(1)
    }
    console.log(`✓ Webhook enregistré : ${webhookUrl}`)
    console.log("  Écris un message à ton bot pour tester (commence par /aide).")
}

main().catch((error) => {
    console.error("Échec :", error.message)
    process.exit(1)
})
