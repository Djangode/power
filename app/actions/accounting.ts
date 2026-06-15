"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export type AccountingPeriod = "month" | "year" | "all"

export interface ProductProfit {
    id: string
    name: string
    category: string
    soldQuantity: number
    buyPrice: number
    sellPrice: number
    totalRevenue: number
    totalCost: number
    profit: number
    margin: number
}

export interface ExpenseRecord {
    id: string
    type: string
    description: string
    amount: number
    date: string
    category: string | null
    createdAt: string
}

export interface AccountingData {
    revenue: number
    purchaseCosts: number
    expensesTotal: number
    expensesByCategory: Record<string, number>
    netProfit: number
    productProfits: ProductProfit[]
    expenses: ExpenseRecord[]
    period: AccountingPeriod
}

/**
 * Détermine la borne de date (createdAt/date >= cette valeur) selon la période.
 * "month" -> 1er du mois courant ; "year" -> 1er janvier ; "all" -> pas de borne.
 */
function getPeriodStart(period: AccountingPeriod): Date | null {
    const now = new Date()
    switch (period) {
        case "month":
            return new Date(now.getFullYear(), now.getMonth(), 1)
        case "year":
            return new Date(now.getFullYear(), 0, 1)
        case "all":
        default:
            return null
    }
}

function emptyData(period: AccountingPeriod): AccountingData {
    return {
        revenue: 0,
        purchaseCosts: 0,
        expensesTotal: 0,
        expensesByCategory: {},
        netProfit: 0,
        productProfits: [],
        expenses: [],
        period,
    }
}

/**
 * Calcule l'intégralité des données comptables depuis la base (aucune donnée en dur).
 * - revenue : somme des Order.total où status === 'delivered' (sur la période).
 * - purchaseCosts : somme (product.purchasePrice ?? 0) * quantity sur les OrderItem
 *   des commandes 'delivered' (compositions ignorées car sans prix d'achat).
 * - expensesByCategory : regroupement des Expense par 'type'.
 * - productProfits : agrégation par produit (vendu/CA/coût/profit/marge).
 */
export async function getAccountingData(
    period: AccountingPeriod = "month"
): Promise<AccountingData> {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return emptyData(period)
        }

        const periodStart = getPeriodStart(period)

        // Filtre commun aux commandes encaissées (CA = status 'delivered')
        const orderWhere = {
            status: "delivered",
            ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
        }

        // 1) CA (revenue) = somme des Order.total des commandes livrées sur la période
        const revenueAgg = await prisma.order.aggregate({
            where: orderWhere,
            _sum: { total: true },
        })
        const revenue = revenueAgg._sum.total ?? 0

        // 2) Lignes de commande des commandes livrées (avec le produit pour le prix d'achat)
        const items = await prisma.orderItem.findMany({
            where: {
                order: orderWhere,
            },
            include: {
                product: {
                    include: {
                        category: { select: { name: true } },
                    },
                },
            },
        })

        // 3) Coûts d'achat + agrégation de rentabilité par produit
        let purchaseCosts = 0
        const productMap = new Map<
            string,
            {
                id: string
                name: string
                category: string
                buyPrice: number
                soldQuantity: number
                totalRevenue: number
                totalCost: number
            }
        >()

        for (const item of items) {
            // Ignore les compositions (productId null) : pas de prix d'achat connu
            if (!item.productId || !item.product) continue

            const qty = item.quantity
            const buyPrice = item.product.purchasePrice ?? 0
            const lineCost = buyPrice * qty
            const lineRevenue = item.priceAtPurchase * qty

            purchaseCosts += lineCost

            const existing = productMap.get(item.productId)
            if (existing) {
                existing.soldQuantity += qty
                existing.totalRevenue += lineRevenue
                existing.totalCost += lineCost
            } else {
                productMap.set(item.productId, {
                    id: item.productId,
                    name: item.product.name,
                    category: item.product.category?.name ?? "—",
                    buyPrice,
                    soldQuantity: qty,
                    totalRevenue: lineRevenue,
                    totalCost: lineCost,
                })
            }
        }

        const productProfits: ProductProfit[] = Array.from(productMap.values())
            .map((p) => {
                const profit = p.totalRevenue - p.totalCost
                const sellPrice = p.soldQuantity > 0 ? p.totalRevenue / p.soldQuantity : 0
                const margin = p.totalRevenue > 0 ? (profit / p.totalRevenue) * 100 : 0
                return {
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    soldQuantity: p.soldQuantity,
                    buyPrice: p.buyPrice,
                    sellPrice,
                    totalRevenue: p.totalRevenue,
                    totalCost: p.totalCost,
                    profit,
                    margin,
                }
            })
            .sort((a, b) => b.profit - a.profit)

        // 4) Charges (Expense) sur la période, regroupées par type
        const expenseRecords = await prisma.expense.findMany({
            where: periodStart ? { date: { gte: periodStart } } : {},
            orderBy: { date: "desc" },
        })

        const expensesByCategory: Record<string, number> = {}
        let expensesTotal = 0
        for (const e of expenseRecords) {
            expensesTotal += e.amount
            expensesByCategory[e.type] = (expensesByCategory[e.type] ?? 0) + e.amount
        }

        const expenses: ExpenseRecord[] = expenseRecords.map((e) => ({
            id: e.id,
            type: e.type,
            description: e.description,
            amount: e.amount,
            date: e.date.toISOString(),
            category: e.category,
            createdAt: e.createdAt.toISOString(),
        }))

        const netProfit = revenue - purchaseCosts - expensesTotal

        return {
            revenue,
            purchaseCosts,
            expensesTotal,
            expensesByCategory,
            netProfit,
            productProfits,
            expenses,
            period,
        }
    } catch (error) {
        console.error("Erreur getAccountingData:", error)
        return emptyData(period)
    }
}
