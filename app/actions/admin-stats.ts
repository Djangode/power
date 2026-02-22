"use server"

import { prisma } from "@/lib/db"
import { startOfMonth, eachDayOfInterval, format, startOfDay, endOfDay } from "date-fns"

export async function getDashboardChartData() {
    try {
        const start = startOfMonth(new Date()) // Début du mois en cours
        const end = new Date()
        const days = eachDayOfInterval({ start, end })

        const chartData = await Promise.all(days.map(async (day) => {
            const orders = await prisma.order.findMany({
                where: {
                    status: "validated",
                    createdAt: {
                        gte: startOfDay(day),
                        lte: endOfDay(day)
                    }
                },
                select: { total: true }
            })

            const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

            return {
                date: format(day, "yyyy-MM-dd"),
                revenue: totalRevenue,
                orders: orders.length
            }
        }))

        return { success: true, data: chartData }
    } catch (error) {
        console.error("Error fetching chart data:", error)
        return { success: false, data: [] }
    }
}
