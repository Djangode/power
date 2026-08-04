/**
 * Cerveau du bot de gestion : transforme un message (ou un clic sur bouton) en réponse.
 *
 * Deux entrées :
 *   - handleMessage(text)      → un message texte du commerçant
 *   - handleCallback(data)     → un clic sur un bouton de confirmation
 *
 * Toute action qui MODIFIE la base (stock, prix, statut) passe d'abord par une confirmation :
 * le message propose des boutons, et l'écriture n'a lieu qu'au clic « Confirmer ». Les lectures
 * (commandes du jour, chiffre d'affaires) répondent directement.
 */

import {
    findProducts,
    setStock,
    setPrice,
    getTodaysOrders,
    findOrder,
    setOrderStatus,
    getDayRevenue,
    format,
    type ProductMatch,
} from "@/lib/bot/actions"
import { interpretMessage } from "@/lib/bot/interpret"
import type { InlineButton } from "@/lib/bot/telegram-io"

/** Réponse à renvoyer : du texte, éventuellement accompagné de boutons de confirmation. */
export type Reply = { text: string; buttons?: InlineButton[][] }

const CANCEL: InlineButton = { text: "❌ Annuler", data: "x" }

const HELP = [
    "🤖 Power Man — gestion de la boutique",
    "",
    "📋 /commandes — commandes à préparer aujourd'hui",
    "✅ /preparer <code> — passer une commande en préparation",
    "📦 /remis <code> — marquer une commande remise / livrée",
    "🥕 /stock <produit> <nombre> — fixer le stock",
    "🚫 /rupture <produit> — mettre en rupture",
    "🏷️ /prix <produit> <montant> — changer le prix",
    "💶 /ca — chiffre d'affaires du jour",
    "",
    "Exemples : « /stock fraises 12 », « /prix tomates 3,90 », « /remis A1B2C3 »",
].join("\n")

/** Parse un nombre français ou anglais (« 4,50 » ou « 4.50 »). */
function parseNumber(raw: string): number | null {
    const n = Number(raw.replace(",", ".").trim())
    return Number.isFinite(n) ? n : null
}

/** Sépare une commande produit du type « fraises bio 12 » en (query="fraises bio", value=12). */
function splitProductAndValue(rest: string): { query: string; value: number } | null {
    const parts = rest.trim().split(/\s+/)
    if (parts.length < 2) return null
    const value = parseNumber(parts[parts.length - 1])
    if (value === null) return null
    return { query: parts.slice(0, -1).join(" "), value }
}

/** Quand plusieurs produits correspondent, on liste au lieu d'agir au hasard. */
function ambiguous(matches: ProductMatch[]): Reply {
    const lines = matches.map((p) => `• ${format.product(p)}`)
    return {
        text: `Plusieurs produits correspondent, précise :\n${lines.join("\n")}`,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages entrants
// ─────────────────────────────────────────────────────────────────────────────

export async function handleMessage(rawText: string): Promise<Reply> {
    let text = rawText.trim()

    // Langage naturel : on tente de le traduire en commande. Si le moteur n'est pas branché
    // (pas de clé) ou n'a rien compris, on invite à utiliser les commandes.
    if (!text.startsWith("/")) {
        const interpreted = await interpretMessage(text)
        if (!interpreted) {
            return {
                text:
                    "Je ne comprends pas encore les phrases libres (la connexion à l'IA arrive).\n" +
                    "En attendant, utilise les commandes — tape /aide pour la liste.",
            }
        }
        text = interpreted.trim()
    }

    const [cmd, ...argParts] = text.split(/\s+/)
    const rest = argParts.join(" ").trim()

    switch (cmd.toLowerCase()) {
        case "/start":
        case "/aide":
        case "/help":
            return { text: HELP }

        case "/commandes":
            return commandesDuJour()

        case "/ca":
            return chiffreDuJour()

        case "/preparer":
            return demanderStatut(rest, "processing", "passer en préparation")

        case "/remis":
        case "/livre":
            return demanderStatut(rest, "delivered", "marquer remise / livrée")

        case "/stock":
            return demanderStock(rest)

        case "/rupture":
            return demanderRupture(rest)

        case "/prix":
            return demanderPrix(rest)

        default:
            return { text: `Commande inconnue : ${cmd}\nTape /aide pour la liste.` }
    }
}

async function commandesDuJour(): Promise<Reply> {
    const orders = await getTodaysOrders()
    if (!orders.length) return { text: "Aucune commande à préparer aujourd'hui. 🎉" }
    const lines = orders.map((o) => format.order(o))
    return { text: `📋 ${orders.length} commande(s) aujourd'hui :\n\n${lines.join("\n\n")}` }
}

async function chiffreDuJour(): Promise<Reply> {
    const { count, total } = await getDayRevenue()
    return {
        text: `💶 Aujourd'hui : ${format.euros(total)} sur ${count} commande(s).`,
    }
}

async function demanderStatut(ref: string, status: string, verb: string): Promise<Reply> {
    if (!ref) return { text: "Précise le code de la commande. Ex : /remis A1B2C3" }
    const order = await findOrder(ref)
    if (!order) return { text: `Commande introuvable : « ${ref} ».` }
    return {
        text: `Confirmer : ${verb} ?\n\n${format.order(order)}`,
        buttons: [[{ text: "✅ Confirmer", data: `os:${order.id}:${status}` }, CANCEL]],
    }
}

async function demanderStock(rest: string): Promise<Reply> {
    const parsed = splitProductAndValue(rest)
    if (!parsed) return { text: "Format : /stock <produit> <nombre>. Ex : /stock fraises 12" }
    const matches = await findProducts(parsed.query)
    if (!matches.length) return { text: `Aucun produit « ${parsed.query} ».` }
    if (matches.length > 1) return ambiguous(matches)
    const p = matches[0]
    return {
        text: `Confirmer le nouveau stock ?\n\n${p.name} : ${p.currentStock} → ${parsed.value} ${p.unit}`,
        buttons: [[{ text: "✅ Confirmer", data: `st:${p.id}:${parsed.value}` }, CANCEL]],
    }
}

async function demanderRupture(rest: string): Promise<Reply> {
    const query = rest.trim()
    if (!query) return { text: "Format : /rupture <produit>. Ex : /rupture cerises" }
    const matches = await findProducts(query)
    if (!matches.length) return { text: `Aucun produit « ${query} ».` }
    if (matches.length > 1) return ambiguous(matches)
    const p = matches[0]
    return {
        text: `Confirmer la mise en rupture ?\n\n${p.name} — stock remis à 0`,
        buttons: [[{ text: "✅ Confirmer", data: `st:${p.id}:0` }, CANCEL]],
    }
}

async function demanderPrix(rest: string): Promise<Reply> {
    const parsed = splitProductAndValue(rest)
    if (!parsed) return { text: "Format : /prix <produit> <montant>. Ex : /prix tomates 3,90" }
    if (parsed.value < 0) return { text: "Le prix doit être positif." }
    const matches = await findProducts(parsed.query)
    if (!matches.length) return { text: `Aucun produit « ${parsed.query} ».` }
    if (matches.length > 1) return ambiguous(matches)
    const p = matches[0]
    return {
        text: `Confirmer le nouveau prix ?\n\n${p.name} : ${format.euros(p.price)} → ${format.euros(parsed.value)} /${p.unit}`,
        buttons: [[{ text: "✅ Confirmer", data: `pr:${p.id}:${parsed.value}` }, CANCEL]],
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clics sur boutons de confirmation
// ─────────────────────────────────────────────────────────────────────────────

export async function handleCallback(data: string): Promise<Reply> {
    if (data === "x") return { text: "Annulé. Rien n'a été modifié." }

    const [action, id, value] = data.split(":")

    switch (action) {
        case "st": {
            const p = await setStock(id, Number(value))
            if (!p) return { text: "Produit introuvable, rien modifié." }
            return { text: `✅ Stock mis à jour.\n${format.product(p)}` }
        }
        case "pr": {
            const p = await setPrice(id, Number(value))
            if (!p) return { text: "Produit introuvable ou prix invalide, rien modifié." }
            return { text: `✅ Prix mis à jour.\n${format.product(p)}` }
        }
        case "os": {
            const o = await setOrderStatus(id, value)
            if (!o) return { text: "Commande introuvable, rien modifié." }
            return { text: `✅ ${o.number} — ${o.statusLabel}.` }
        }
        default:
            return { text: "Action inconnue." }
    }
}
