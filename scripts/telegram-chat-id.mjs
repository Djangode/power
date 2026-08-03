/**
 * Récupère l'identifiant de conversation Telegram et l'écrit dans .env.
 *
 * Telegram ne permet pas de connaître à l'avance l'identifiant d'un destinataire : il
 * n'apparaît qu'après un premier message envoyé AU bot. Ce script attend ce message
 * plutôt que d'imposer un aller-retour manuel par getUpdates.
 *
 * Usage : node --env-file=.env scripts/telegram-chat-id.mjs
 */

import { readFileSync, writeFileSync } from "node:fs"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const API = "https://api.telegram.org"
const POLL_SECONDS = 90

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getBot() {
    const res = await fetch(`${API}/bot${TOKEN}/getMe`, { signal: AbortSignal.timeout(15_000) })
    const json = await res.json()
    if (!json.ok) throw new Error(json.description ?? "jeton invalide")
    return json.result
}

/** Conversations vues dans les mises à jour en attente. */
async function findChats() {
    const res = await fetch(`${API}/bot${TOKEN}/getUpdates`, { signal: AbortSignal.timeout(15_000) })
    const json = await res.json()
    if (!json.ok) throw new Error(json.description ?? "getUpdates a échoué")

    const chats = new Map()
    for (const update of json.result ?? []) {
        const chat = update.message?.chat ?? update.channel_post?.chat ?? update.my_chat_member?.chat
        if (chat) chats.set(String(chat.id), chat)
    }
    return [...chats.values()]
}

function describe(chat) {
    const label = [chat.first_name, chat.last_name, chat.title].filter(Boolean).join(" ")
    const handle = chat.username ? ` (@${chat.username})` : ""
    return `${label}${handle} — ${chat.type}`
}

function writeChatId(id) {
    let env = readFileSync(".env", "utf8")
    if (/^TELEGRAM_CHAT_ID=.*$/m.test(env)) {
        env = env.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${id}`)
    } else {
        env = env.replace(/\s*$/, "") + `\nTELEGRAM_CHAT_ID=${id}\n`
    }
    writeFileSync(".env", env)
}

async function main() {
    if (!TOKEN) {
        console.log("TELEGRAM_BOT_TOKEN manquant dans .env.")
        process.exit(1)
    }

    const bot = await getBot()
    console.log(`Bot : ${bot.first_name} (@${bot.username})\n`)

    let chats = await findChats()

    if (!chats.length) {
        console.log(`Ouvrez Telegram, cherchez @${bot.username} et envoyez-lui n'importe quel message.`)
        console.log(`J'attends jusqu'à ${POLL_SECONDS} s…\n`)

        const deadline = Date.now() + POLL_SECONDS * 1000
        while (Date.now() < deadline && !chats.length) {
            await sleep(3000)
            chats = await findChats()
            if (!chats.length) process.stdout.write(".")
        }
        console.log("")
    }

    if (!chats.length) {
        console.log("Toujours aucun message reçu. Relancez le script après avoir écrit au bot.")
        process.exit(1)
    }

    if (chats.length > 1) {
        console.log("Plusieurs conversations trouvées :")
        for (const chat of chats) console.log(`  ${chat.id} — ${describe(chat)}`)
        console.log("\nJe retiens la première. Modifiez TELEGRAM_CHAT_ID dans .env si ce n'est pas la bonne.")
    }

    const chosen = chats[0]
    writeChatId(chosen.id)
    console.log(`✓ TELEGRAM_CHAT_ID=${chosen.id} — ${describe(chosen)}`)
    console.log("\nEnregistré dans .env. Vérifiez avec : yarn telegram:test")
}

main().catch((error) => {
    console.error("Échec :", error.message)
    process.exit(1)
})
