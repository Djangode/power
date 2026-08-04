/**
 * Cerveau du bot de gestion : transforme un message (ou un clic sur bouton) en réponse.
 *
 * Deux entrées :
 *   - handleMessage(text)      → un message texte du commerçant
 *   - handleCallback(data)     → un clic sur un bouton de confirmation
 *
 * Ergonomie voulue par le commerçant (souvent chez le fournisseur, doit aller vite) :
 *   - une commande seule = vue d'ensemble immédiate (comme /ca) ;
 *   - une commande + un nom = réponse ciblée directe ;
 *   - une commande + un nom + un nombre = modification (avec confirmation à bouton).
 *
 * Toute écriture (stock, prix, statut) passe d'abord par une confirmation : rien n'est
 * appliqué tant que le commerçant n'a pas tapé « Confirmer ».
 */

import {
    findProducts,
    setStock,
    setPrice,
    setPromo,
    clearPromo,
    restock,
    destroyStock,
    getPurchaseTable,
    getStockOverview,
    getRuptures,
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
const confirm = (data: string): InlineButton[][] => [[{ text: "✅ Confirmer", data }, CANCEL]]

/** Au-delà de cette taille, on tronque la liste « le reste » (limite de longueur Telegram). */
const REST_LIMIT = 60

const HELP = [
    "🤖 Power Man — gestion boutique",
    "",
    "STOCKS",
    "/stock — tout, les bas d'abord",
    "/stock fraises — un produit",
    "/stock fraises 12 — changer le stock",
    "/rupture — tout ce qui manque",
    "/perte tomates 5 — détruire du stock (perte)",
    "",
    "ACHATS",
    "/reappro tomates 30 1,20 2,40 — réappro (qté, achat, vente)",
    "/achats — liste de ce qu'il faut racheter",
    "",
    "PRIX & PROMO",
    "/prix fraises — voir le prix",
    "/prix fraises 3,90 — changer le prix",
    "/promo fraises 2,00 — mettre en promo",
    "/promo fraises off — retirer la promo",
    "",
    "COMMANDES",
    "/commandes — à préparer aujourd'hui",
    "/commande A1B2C3 — l'état d'une commande",
    "/preparer A1B2C3 — en préparation",
    "/remis A1B2C3 — remise / livrée",
    "",
    "/ca — recette du jour",
].join("\n")

/** Parse un nombre français ou anglais (« 4,50 » ou « 4.50 »). */
function parseNumber(raw: string): number | null {
    const n = Number(raw.replace(",", ".").trim())
    return Number.isFinite(n) ? n : null
}

/** « fraises bio 12 » → { query:"fraises bio", value:12 } ; renvoie null s'il n'y a pas de nombre final. */
function splitProductAndValue(rest: string): { query: string; value: number } | null {
    const parts = rest.trim().split(/\s+/)
    if (parts.length < 2) return null
    const value = parseNumber(parts[parts.length - 1])
    if (value === null) return null
    return { query: parts.slice(0, -1).join(" "), value }
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
                    "Je ne comprends pas encore les phrases libres (l'IA arrive).\n" +
                    "En attendant : /aide pour les commandes.",
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
            return stockCommand(rest)
        case "/rupture":
            return ruptureCommand(rest)
        case "/perte":
            return perteCommand(rest)
        case "/reappro":
        case "/réappro":
            return reapproCommand(rest)
        case "/achats":
            return achatsCommand()
        case "/prix":
            return prixCommand(rest)
        case "/promo":
            return promoCommand(rest)

        case "/commande":
            return commandeCommand(rest)

        default:
            return { text: `Commande inconnue : ${cmd}\n/aide pour la liste.` }
    }
}

// ── Stocks ───────────────────────────────────────────────────────────────────

async function stockCommand(rest: string): Promise<Reply> {
    // /stock seul → tableau de bord.
    if (!rest) return stockDashboard()

    // /stock fraises 12 → modification.
    const set = splitProductAndValue(rest)
    if (set) return confirmerStock(set.query, set.value)

    // /stock fraises → réponse directe.
    const matches = await findProducts(rest)
    if (!matches.length) return { text: `Aucun produit « ${rest} ».` }
    return { text: matches.map((p) => format.productDetail(p)).join("\n") }
}

async function stockDashboard(): Promise<Reply> {
    const { toRestock, rest } = await getStockOverview()
    const lines: string[] = ["📦 STOCKS"]

    if (toRestock.length) {
        lines.push("", "À réapprovisionner :")
        for (const p of toRestock) lines.push(format.stockLine(p))
    } else {
        lines.push("", "✅ Rien sous le seuil.")
    }

    if (rest.length) {
        const shown = rest.slice(0, REST_LIMIT)
        lines.push("", "Le reste :")
        for (const p of shown) lines.push(format.stockLine(p))
        if (rest.length > shown.length) lines.push(`…et ${rest.length - shown.length} autres`)
    }
    return { text: lines.join("\n") }
}

async function confirmerStock(query: string, value: number): Promise<Reply> {
    const matches = await findProducts(query)
    if (!matches.length) return { text: `Aucun produit « ${query} ».` }
    if (matches.length > 1) return preciser(matches)
    const p = matches[0]
    return {
        text: `Confirmer ?\n${p.name} : ${p.currentStock} → ${value} ${p.unit}`,
        buttons: confirm(`st:${p.id}:${value}`),
    }
}

// ── Ruptures ─────────────────────────────────────────────────────────────────

async function ruptureCommand(rest: string): Promise<Reply> {
    // /rupture seul → liste de toutes les ruptures.
    if (!rest) {
        const ruptures = await getRuptures()
        if (!ruptures.length) return { text: "Aucune rupture. 🎉" }
        const lines = ruptures.map((p) => `🔴 ${p.name}`)
        return { text: `Ruptures (${ruptures.length}) :\n${lines.join("\n")}` }
    }

    // /rupture fraises → mettre ce produit en rupture.
    const matches = await findProducts(rest)
    if (!matches.length) return { text: `Aucun produit « ${rest} ».` }
    if (matches.length > 1) return preciser(matches)
    const p = matches[0]
    return {
        text: `Mettre en rupture ?\n${p.name} (stock → 0)`,
        buttons: confirm(`st:${p.id}:0`),
    }
}

// ── Prix ─────────────────────────────────────────────────────────────────────

async function prixCommand(rest: string): Promise<Reply> {
    if (!rest) return { text: "Quel produit ?\nEx : /prix fraises  (ou  /prix fraises 3,90)" }

    const set = splitProductAndValue(rest)
    if (set) {
        if (set.value < 0) return { text: "Le prix doit être positif." }
        const matches = await findProducts(set.query)
        if (!matches.length) return { text: `Aucun produit « ${set.query} ».` }
        if (matches.length > 1) return preciser(matches)
        const p = matches[0]
        return {
            text: `Confirmer le prix ?\n${p.name} : ${format.euros(p.price)} → ${format.euros(set.value)} /${p.unit}`,
            buttons: confirm(`pr:${p.id}:${set.value}`),
        }
    }

    // /prix fraises → voir le prix.
    const matches = await findProducts(rest)
    if (!matches.length) return { text: `Aucun produit « ${rest} ».` }
    return { text: matches.map((p) => format.productDetail(p)).join("\n") }
}

async function promoCommand(rest: string): Promise<Reply> {
    if (!rest) return { text: "Ex : /promo fraises 2,00  (ou  /promo fraises off)" }
    const parts = rest.trim().split(/\s+/)
    const last = parts[parts.length - 1].toLowerCase()
    const isOff = ["off", "stop", "fin", "retirer", "retire"].includes(last)

    if (isOff) {
        const query = parts.slice(0, -1).join(" ")
        if (!query) return { text: "Quel produit ? Ex : /promo fraises off" }
        const matches = await findProducts(query)
        if (!matches.length) return { text: `Aucun produit « ${query} ».` }
        if (matches.length > 1) return preciser(matches)
        const p = matches[0]
        if (p.promoPrice == null) return { text: `${p.name} n'est pas en promo.` }
        return {
            text: `Retirer la promo ?\n${p.name} : retour à ${format.euros(p.price)}/${p.unit}`,
            buttons: confirm(`mc:${p.id}`),
        }
    }

    const parsed = splitProductAndValue(rest)
    if (!parsed || parsed.value < 0) return { text: "Ex : /promo fraises 2,00  (ou  /promo fraises off)" }
    const matches = await findProducts(parsed.query)
    if (!matches.length) return { text: `Aucun produit « ${parsed.query} ».` }
    if (matches.length > 1) return preciser(matches)
    const p = matches[0]
    const pct = p.price > 0 ? Math.round((1 - parsed.value / p.price) * 100) : 0
    return {
        text:
            `Mettre en promo ?\n${p.name} : ${format.euros(p.price)} → ${format.euros(parsed.value)}/${p.unit}` +
            (pct > 0 ? `  (−${pct} %)` : ""),
        buttons: confirm(`mp:${p.id}:${parsed.value}`),
    }
}

// ── Réapprovisionnement / perte / achats ─────────────────────────────────────

async function reapproCommand(rest: string): Promise<Reply> {
    const parts = rest.trim().split(/\s+/)
    const example = "Ex : /reappro tomates 30 1,20 2,40  (produit, quantité, prix d'achat, prix de vente)"
    if (parts.length < 4) return { text: `Il manque des infos.\n${example}` }

    const vente = parseNumber(parts.pop()!)
    const achat = parseNumber(parts.pop()!)
    const qty = parseNumber(parts.pop()!)
    const query = parts.join(" ")
    if (qty === null || achat === null || vente === null || qty <= 0 || achat < 0 || vente < 0) {
        return { text: `Quantité et prix doivent être des nombres.\n${example}` }
    }

    const matches = await findProducts(query)
    if (!matches.length) return { text: `Aucun produit « ${query} ».` }
    if (matches.length > 1) return preciser(matches)
    const p = matches[0]

    const marginPct = achat > 0 ? Math.round(((vente - achat) / achat) * 1000) / 10 : null
    const lines = [
        "Réappro ?",
        `${p.name} : ${p.currentStock} → ${p.currentStock + qty} ${p.unit}  (+${qty})`,
        `Achat ${format.euros(achat)} · Vente ${format.euros(vente)}/${p.unit}` +
            (marginPct !== null ? ` · marge ${marginPct} %` : ""),
    ]
    return { text: lines.join("\n"), buttons: confirm(`rs:${p.id}:${qty}:${achat}:${vente}`) }
}

async function perteCommand(rest: string): Promise<Reply> {
    const parsed = splitProductAndValue(rest)
    if (!parsed || parsed.value <= 0) return { text: "Format : /perte tomates 5  (produit, quantité)" }
    const matches = await findProducts(parsed.query)
    if (!matches.length) return { text: `Aucun produit « ${parsed.query} ».` }
    if (matches.length > 1) return preciser(matches)
    const p = matches[0]
    const after = Math.max(0, p.currentStock - parsed.value)
    return {
        text: `Détruire du stock ? (enregistré en perte)\n${p.name} : ${p.currentStock} → ${after} ${p.unit}  (−${parsed.value})`,
        buttons: confirm(`pt:${p.id}:${parsed.value}`),
    }
}

async function achatsCommand(): Promise<Reply> {
    const lines = await getPurchaseTable()
    if (!lines.length) return { text: "Rien à racheter, tous les stocks sont au-dessus du seuil. ✅" }
    const body = lines.map((l) => {
        const fourn = l.supplier ? ` · ${l.supplier}` : ""
        const prix = l.purchasePrice != null ? ` · achat ${format.euros(l.purchasePrice)}` : ""
        return `• ${l.name} : ${l.toBuy} ${l.unit}${fourn}${prix}`
    })
    return { text: `🛒 À COMMANDER (${lines.length})\n${body.join("\n")}` }
}

// ── Commandes ────────────────────────────────────────────────────────────────

async function commandesDuJour(): Promise<Reply> {
    const orders = await getTodaysOrders()
    if (!orders.length) return { text: "Aucune commande à préparer aujourd'hui. 🎉" }
    const lines = orders.map((o) => format.order(o))
    return { text: `📋 ${orders.length} commande(s) aujourd'hui :\n\n${lines.join("\n\n")}` }
}

async function chiffreDuJour(): Promise<Reply> {
    const { count, total } = await getDayRevenue()
    return { text: `💶 Aujourd'hui : ${format.euros(total)} sur ${count} commande(s).` }
}

async function commandeCommand(ref: string): Promise<Reply> {
    if (!ref) return { text: "Précise le code. Ex : /commande A1B2C3" }
    const o = await findOrder(ref)
    if (!o) return { text: `Commande introuvable : « ${ref} ».` }
    const phone = o.phone ? `\n📞 ${o.phone}` : ""
    return { text: `${format.order(o)}${phone}` }
}

async function demanderStatut(ref: string, status: string, verb: string): Promise<Reply> {
    if (!ref) return { text: "Précise le code. Ex : /remis A1B2C3" }
    const order = await findOrder(ref)
    if (!order) return { text: `Commande introuvable : « ${ref} ».` }
    return {
        text: `Confirmer : ${verb} ?\n\n${format.order(order)}`,
        buttons: confirm(`os:${order.id}:${status}`),
    }
}

// ── Aide au choix quand plusieurs produits correspondent (uniquement en modif) ──

function preciser(matches: ProductMatch[]): Reply {
    const lines = matches.map((p) => `• ${format.stockLine(p)}`)
    return { text: `Plusieurs produits, précise le nom :\n${lines.join("\n")}` }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clics sur boutons de confirmation
// ─────────────────────────────────────────────────────────────────────────────

export async function handleCallback(data: string): Promise<Reply> {
    if (data === "x") return { text: "Annulé. Rien n'a été modifié." }

    const parts = data.split(":")
    const [action, id] = parts

    switch (action) {
        case "st": {
            const p = await setStock(id, Number(parts[2]))
            if (!p) return { text: "Produit introuvable, rien modifié." }
            return { text: `✅ ${format.productDetail(p)}` }
        }
        case "pr": {
            const p = await setPrice(id, Number(parts[2]))
            if (!p) return { text: "Produit introuvable ou prix invalide, rien modifié." }
            return { text: `✅ ${format.productDetail(p)}` }
        }
        case "mp": {
            const p = await setPromo(id, Number(parts[2]))
            if (!p) return { text: "Produit introuvable ou prix invalide, rien modifié." }
            return { text: `✅ En promo.\n${format.productDetail(p)}` }
        }
        case "mc": {
            const p = await clearPromo(id)
            if (!p) return { text: "Produit introuvable, rien modifié." }
            return { text: `✅ Promo retirée.\n${format.productDetail(p)}` }
        }
        case "rs": {
            // rs:<id>:<qté>:<achat>:<vente>
            const r = await restock(id, Number(parts[2]), Number(parts[3]), Number(parts[4]))
            if (!r) return { text: "Produit introuvable, rien modifié." }
            const marge = r.marginPct !== null ? ` · marge ${r.marginPct} %` : ""
            return { text: `✅ Réappro faite (+${r.added}).\n${format.productDetail(r.product)}${marge}` }
        }
        case "pt": {
            const p = await destroyStock(id, Number(parts[2]))
            if (!p) return { text: "Produit introuvable, rien modifié." }
            return { text: `✅ Perte enregistrée.\n${format.productDetail(p)}` }
        }
        case "os": {
            const o = await setOrderStatus(id, parts[2])
            if (!o) return { text: "Commande introuvable, rien modifié." }
            return { text: `✅ ${o.number} — ${o.statusLabel}.` }
        }
        default:
            return { text: "Action inconnue." }
    }
}
