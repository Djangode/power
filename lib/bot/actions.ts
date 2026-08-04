/**
 * Actions de gestion exposées au bot Telegram.
 *
 * Couche métier pure : chaque fonction lit ou écrit en base et renvoie de quoi construire
 * une réponse lisible. Volontairement indépendante du canal (Telegram) ET du moteur de
 * langage (commandes tapées à la main aujourd'hui, GPT demain) — les deux appellent ces
 * mêmes fonctions.
 *
 * Contrainte technique héritée du reste du projet : l'adaptateur Neon HTTP N'ACCEPTE PAS les
 * transactions. Toute écriture est donc unitaire (un `update` à la fois), jamais imbriquée
 * ni groupée. Voir lib/db.ts et app/api/orders/place/route.ts.
 */

import { prisma } from "@/lib/db"

const TZ = "Europe/Paris"

/** Bornes UTC de la journée courante à Paris (00:00 → lendemain 00:00). */
function parisDayRange(now = new Date()): { start: Date; end: Date } {
    // Offset de Paris pour un instant donné, via un aller-retour de formatage.
    const offsetMs = (date: Date): number => {
        const p = new Intl.DateTimeFormat("en-US", {
            timeZone: TZ,
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).formatToParts(date)
        const g = (t: string) => Number(p.find((x) => x.type === t)?.value)
        const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"))
        return asUTC - date.getTime()
    }

    const ymd = new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now)
    const [y, m, d] = ymd.split("-").map(Number)
    const guessMidnightUTC = Date.UTC(y, m - 1, d, 0, 0, 0)
    const start = new Date(guessMidnightUTC - offsetMs(new Date(guessMidnightUTC)))
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return { start, end }
}

/** Numéro de commande affiché, aligné sur le reste de l'app (CMD-XXXXXX). */
function orderNumber(id: string): string {
    return `CMD-${id.slice(-6).toUpperCase()}`
}

/** Montant en euros, format français. */
function euros(n: number): string {
    return n.toFixed(2).replace(".", ",") + " €"
}

/** Libellé lisible d'un statut de commande. */
const STATUS_LABEL: Record<string, string> = {
    pending: "en attente",
    validated: "validée",
    processing: "en préparation",
    shipped: "expédiée",
    delivered: "remise / livrée",
    cancelled: "annulée",
}

// ─────────────────────────────────────────────────────────────────────────────
// Produits
// ─────────────────────────────────────────────────────────────────────────────

export type ProductMatch = {
    id: string
    name: string
    price: number
    unit: string
    currentStock: number
    inStock: boolean
}

/**
 * Recherche de produits par nom (insensible à la casse, correspondance partielle).
 * Renvoie plusieurs résultats : c'est le handler qui décide (0 → introuvable,
 * 1 → on agit, plusieurs → on demande de préciser).
 */
export async function findProducts(query: string): Promise<ProductMatch[]> {
    const q = query.trim()
    if (!q) return []
    const products = await prisma.product.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, price: true, unit: true, currentStock: true, inStock: true },
        orderBy: { name: "asc" },
        take: 10,
    })
    return products
}

export async function getProduct(id: string): Promise<ProductMatch | null> {
    return prisma.product.findUnique({
        where: { id },
        select: { id: true, name: true, price: true, unit: true, currentStock: true, inStock: true },
    })
}

/** Fixe le stock d'un produit. `inStock` suit automatiquement (rupture si 0). */
export async function setStock(id: string, value: number): Promise<ProductMatch | null> {
    const stock = Math.max(0, value)
    await prisma.product.update({
        where: { id },
        data: { currentStock: stock, inStock: stock > 0 },
    })
    return getProduct(id)
}

/** Fixe le prix de vente d'un produit. */
export async function setPrice(id: string, value: number): Promise<ProductMatch | null> {
    if (!Number.isFinite(value) || value < 0) return null
    await prisma.product.update({
        where: { id },
        data: { price: Math.round(value * 100) / 100 },
    })
    return getProduct(id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Commandes
// ─────────────────────────────────────────────────────────────────────────────

export type OrderSummary = {
    id: string
    number: string
    status: string
    statusLabel: string
    total: number
    method: string | null
    pickupCode: string | null
    slot: string | null
    customer: string
    phone: string | null
}

function toSummary(o: {
    id: string
    status: string
    total: number
    deliveryMethod: string | null
    pickupCode: string | null
    deliverySlot: string | null
    phone: string | null
    user: { firstName: string | null; lastName: string | null } | null
}): OrderSummary {
    const name = `${o.user?.firstName ?? ""} ${o.user?.lastName ?? ""}`.trim() || "Client"
    return {
        id: o.id,
        number: orderNumber(o.id),
        status: o.status,
        statusLabel: STATUS_LABEL[o.status] ?? o.status,
        total: o.total,
        method: o.deliveryMethod,
        pickupCode: o.pickupCode,
        slot: o.deliverySlot,
        customer: name,
        phone: o.phone,
    }
}

const ACTIVE_STATUSES = ["pending", "validated", "processing", "shipped"]

/**
 * Commandes à traiter aujourd'hui : celles dont la date de retrait/livraison tombe dans la
 * journée parisienne courante et qui ne sont ni livrées ni annulées.
 */
export async function getTodaysOrders(): Promise<OrderSummary[]> {
    const { start, end } = parisDayRange()
    const orders = await prisma.order.findMany({
        where: {
            deliveryDate: { gte: start, lt: end },
            status: { in: ACTIVE_STATUSES },
        },
        select: {
            id: true,
            status: true,
            total: true,
            deliveryMethod: true,
            pickupCode: true,
            deliverySlot: true,
            phone: true,
            user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { deliverySlot: "asc" },
    })
    return orders.map(toSummary)
}

/** Retrouve une commande par son code de retrait OU par les 6 derniers caractères de l'id. */
export async function findOrder(ref: string): Promise<OrderSummary | null> {
    const clean = ref.trim().replace(/^CMD-/i, "")
    if (!clean) return null

    const select = {
        id: true,
        status: true,
        total: true,
        deliveryMethod: true,
        pickupCode: true,
        deliverySlot: true,
        phone: true,
        user: { select: { firstName: true, lastName: true } },
    } as const

    const byCode = await prisma.order.findFirst({
        where: { pickupCode: clean.toUpperCase() },
        select,
    })
    if (byCode) return toSummary(byCode)

    // orderNumber = id.slice(-6).toUpperCase() → l'id se termine par la référence en minuscules.
    const bySuffix = await prisma.order.findFirst({
        where: { id: { endsWith: clean.toLowerCase() } },
        select,
        orderBy: { createdAt: "desc" },
    })
    return bySuffix ? toSummary(bySuffix) : null
}

/** Change le statut d'une commande (préparation, remise, etc.). */
export async function setOrderStatus(id: string, status: string): Promise<OrderSummary | null> {
    await prisma.order.update({ where: { id }, data: { status } })
    const o = await prisma.order.findUnique({
        where: { id },
        select: {
            id: true,
            status: true,
            total: true,
            deliveryMethod: true,
            pickupCode: true,
            deliverySlot: true,
            phone: true,
            user: { select: { firstName: true, lastName: true } },
        },
    })
    return o ? toSummary(o) : null
}

// ─────────────────────────────────────────────────────────────────────────────
// Chiffre d'affaires
// ─────────────────────────────────────────────────────────────────────────────

export type DayRevenue = { count: number; total: number }

/**
 * Chiffre d'affaires du jour : somme des commandes créées aujourd'hui (Paris), hors annulées.
 * On se base sur la création, pas sur la date de livraison : c'est l'encaissement du jour.
 */
export async function getDayRevenue(): Promise<DayRevenue> {
    const { start, end } = parisDayRange()
    const orders = await prisma.order.findMany({
        where: {
            createdAt: { gte: start, lt: end },
            status: { not: "cancelled" },
        },
        select: { total: true },
    })
    const total = orders.reduce((sum, o) => sum + o.total, 0)
    return { count: orders.length, total: Math.round(total * 100) / 100 }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mise en forme des réponses (réutilisée par le handler)
// ─────────────────────────────────────────────────────────────────────────────

export const format = {
    euros,
    orderNumber,

    product(p: ProductMatch): string {
        const stockLabel = p.inStock ? `${p.currentStock} ${p.unit}` : "RUPTURE"
        return `${p.name} — ${euros(p.price)}/${p.unit} — stock : ${stockLabel}`
    },

    order(o: OrderSummary): string {
        const method = o.method === "retrait" ? "🏪 Retrait" : "🚚 Livraison"
        const code = o.pickupCode ? ` · code ${o.pickupCode}` : ""
        const slot = o.slot ? ` · ${o.slot}` : ""
        return `${o.number} — ${o.customer} — ${method}${slot}${code}\n   ${euros(o.total)} · ${o.statusLabel}`
    },
}
