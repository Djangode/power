"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    subWeeks,
    subMonths,
    subYears,
    format,
} from "date-fns"
import { fr } from "date-fns/locale"

export type AnalyticsPeriod = "week" | "month" | "year"

interface Trend {
    value: string // ex: "+12.5%"
    isPositive: boolean
}

export interface TopProduct {
    name: string
    quantity: number
    revenue: number
}

export interface CategorySlice {
    name: string
    value: number // pourcentage (0-100)
}

export interface MonthlyPoint {
    name: string // 'Jan', 'Fév', ...
    revenue: number
    orders: number
}

export interface AnalyticsData {
    period: AnalyticsPeriod
    revenue: number
    revenueTrend: Trend
    ordersCount: number
    ordersTrend: Trend
    avgBasket: number
    newCustomers: number
    newCustomersTrend: Trend
    topProducts: TopProduct[]
    categoryDistribution: CategorySlice[]
    monthlyEvolution: MonthlyPoint[]
}

/**
 * Calcule la borne de la période courante et de la période précédente
 * pour le calcul des tendances (trend).
 */
function getRanges(period: AnalyticsPeriod) {
    const now = new Date()

    if (period === "week") {
        const currentStart = startOfWeek(now, { weekStartsOn: 1 })
        const currentEnd = endOfWeek(now, { weekStartsOn: 1 })
        const prevRef = subWeeks(now, 1)
        return {
            currentStart,
            currentEnd,
            previousStart: startOfWeek(prevRef, { weekStartsOn: 1 }),
            previousEnd: endOfWeek(prevRef, { weekStartsOn: 1 }),
        }
    }

    if (period === "year") {
        const currentStart = startOfYear(now)
        const currentEnd = endOfYear(now)
        const prevRef = subYears(now, 1)
        return {
            currentStart,
            currentEnd,
            previousStart: startOfYear(prevRef),
            previousEnd: endOfYear(prevRef),
        }
    }

    // month (défaut)
    const currentStart = startOfMonth(now)
    const currentEnd = endOfMonth(now)
    const prevRef = subMonths(now, 1)
    return {
        currentStart,
        currentEnd,
        previousStart: startOfMonth(prevRef),
        previousEnd: endOfMonth(prevRef),
    }
}

/**
 * Calcule un trend (variation %) entre une valeur courante et précédente.
 */
function computeTrend(current: number, previous: number): Trend {
    if (previous === 0) {
        if (current === 0) {
            return { value: "0%", isPositive: true }
        }
        // Pas de base de comparaison : croissance "à partir de zéro"
        return { value: "+100%", isPositive: true }
    }
    const pct = ((current - previous) / previous) * 100
    const rounded = Math.round(pct * 10) / 10
    const sign = rounded >= 0 ? "+" : ""
    return {
        value: `${sign}${rounded}%`,
        isPositive: rounded >= 0,
    }
}

/**
 * Revenu (CA) = somme des Order.total où status === 'delivered' sur l'intervalle.
 */
async function getDeliveredRevenue(start: Date, end: Date): Promise<number> {
    const agg = await prisma.order.aggregate({
        where: {
            status: "delivered",
            createdAt: { gte: start, lte: end },
        },
        _sum: { total: true },
    })
    return agg._sum.total ?? 0
}

/**
 * Nombre de commandes 'delivered' (pour le panier moyen).
 */
async function getDeliveredCount(start: Date, end: Date): Promise<number> {
    return prisma.order.count({
        where: {
            status: "delivered",
            createdAt: { gte: start, lte: end },
        },
    })
}

/**
 * Volume de commandes = commandes non annulées (status !== 'cancelled').
 */
async function getActiveOrdersCount(start: Date, end: Date): Promise<number> {
    return prisma.order.count({
        where: {
            status: { not: "cancelled" },
            createdAt: { gte: start, lte: end },
        },
    })
}

/**
 * Nouveaux clients = User role 'user' créés sur l'intervalle.
 */
async function getNewCustomersCount(start: Date, end: Date): Promise<number> {
    return prisma.user.count({
        where: {
            role: "user",
            createdAt: { gte: start, lte: end },
        },
    })
}

/**
 * Top 5 produits par quantité vendue (lignes des commandes 'delivered').
 */
async function getTopProducts(start: Date, end: Date): Promise<TopProduct[]> {
    const items = await prisma.orderItem.findMany({
        where: {
            productId: { not: null },
            order: {
                status: "delivered",
                createdAt: { gte: start, lte: end },
            },
        },
        select: {
            quantity: true,
            priceAtPurchase: true,
            product: { select: { name: true } },
        },
    })

    const map = new Map<string, { name: string; quantity: number; revenue: number }>()

    for (const item of items) {
        const name = item.product?.name
        if (!name) continue
        const existing = map.get(name) ?? { name, quantity: 0, revenue: 0 }
        existing.quantity += item.quantity
        existing.revenue += item.priceAtPurchase * item.quantity
        map.set(name, existing)
    }

    return Array.from(map.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map((p) => ({
            name: p.name,
            quantity: p.quantity,
            revenue: Math.round(p.revenue * 100) / 100,
        }))
}

/**
 * Répartition du CA par catégorie de produit (% sur les ventes 'delivered').
 * Les compositions (sans produit/catégorie) sont regroupées sous "Compositions".
 */
async function getCategoryDistribution(start: Date, end: Date): Promise<CategorySlice[]> {
    const items = await prisma.orderItem.findMany({
        where: {
            order: {
                status: "delivered",
                createdAt: { gte: start, lte: end },
            },
        },
        select: {
            quantity: true,
            priceAtPurchase: true,
            product: {
                select: {
                    category: { select: { name: true } },
                },
            },
            compositionId: true,
        },
    })

    const map = new Map<string, number>()
    let total = 0

    for (const item of items) {
        const lineRevenue = item.priceAtPurchase * item.quantity
        const categoryName = item.product?.category?.name
            ?? (item.compositionId ? "Compositions" : "Autres")
        map.set(categoryName, (map.get(categoryName) ?? 0) + lineRevenue)
        total += lineRevenue
    }

    if (total === 0) return []

    return Array.from(map.entries())
        .map(([name, revenue]) => ({
            name,
            value: Math.round((revenue / total) * 1000) / 10, // % avec 1 décimale
        }))
        .sort((a, b) => b.value - a.value)
}

/**
 * Évolution sur les 6 derniers mois :
 * revenue = CA des commandes 'delivered', orders = commandes non annulées.
 */
async function getMonthlyEvolution(): Promise<MonthlyPoint[]> {
    const now = new Date()
    const points: MonthlyPoint[] = []

    for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i)
        const start = startOfMonth(monthDate)
        const end = endOfMonth(monthDate)

        const [revenue, orders] = await Promise.all([
            getDeliveredRevenue(start, end),
            getActiveOrdersCount(start, end),
        ])

        points.push({
            name: format(start, "MMM", { locale: fr }),
            revenue: Math.round(revenue * 100) / 100,
            orders,
        })
    }

    return points
}

/**
 * Données d'analytics réelles calculées depuis la base.
 * Réservé aux administrateurs.
 */
export async function getAnalyticsData(
    period: AnalyticsPeriod = "month"
): Promise<{ success: boolean; data: AnalyticsData | null; error?: string }> {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return { success: false, data: null, error: "Non autorisé" }
        }

        const safePeriod: AnalyticsPeriod =
            period === "week" || period === "year" ? period : "month"

        const { currentStart, currentEnd, previousStart, previousEnd } = getRanges(safePeriod)

        const [
            revenue,
            prevRevenue,
            deliveredCount,
            ordersCount,
            prevOrdersCount,
            newCustomers,
            prevNewCustomers,
            topProducts,
            categoryDistribution,
            monthlyEvolution,
        ] = await Promise.all([
            getDeliveredRevenue(currentStart, currentEnd),
            getDeliveredRevenue(previousStart, previousEnd),
            getDeliveredCount(currentStart, currentEnd),
            getActiveOrdersCount(currentStart, currentEnd),
            getActiveOrdersCount(previousStart, previousEnd),
            getNewCustomersCount(currentStart, currentEnd),
            getNewCustomersCount(previousStart, previousEnd),
            getTopProducts(currentStart, currentEnd),
            getCategoryDistribution(currentStart, currentEnd),
            getMonthlyEvolution(),
        ])

        const avgBasket = deliveredCount > 0 ? revenue / deliveredCount : 0

        const data: AnalyticsData = {
            period: safePeriod,
            revenue: Math.round(revenue * 100) / 100,
            revenueTrend: computeTrend(revenue, prevRevenue),
            ordersCount,
            ordersTrend: computeTrend(ordersCount, prevOrdersCount),
            avgBasket: Math.round(avgBasket * 100) / 100,
            newCustomers,
            newCustomersTrend: computeTrend(newCustomers, prevNewCustomers),
            topProducts,
            categoryDistribution,
            monthlyEvolution,
        }

        return { success: true, data }
    } catch (error) {
        console.error("Error fetching analytics data:", error)
        return { success: false, data: null, error: "Erreur lors du calcul des analytics" }
    }
}
