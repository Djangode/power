import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const customers = await prisma.user.findMany({
            where: {
                role: { notIn: ["admin", "cashier", "preparation", "delivery"] }
            },
            include: {
                orders: {
                    select: {
                        id: true,
                        total: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                preferences: true
            },
            orderBy: { createdAt: 'desc' }
        })

        const formattedCustomers = customers.map((user) => {
            const totalOrders = user.orders.length
            const totalSpent = user.orders.reduce((sum, order) => sum + order.total, 0)
            const lastOrderDate = user.orders[0] ? user.orders[0].createdAt.toISOString().split('T')[0] : "Aucune"

            return {
                id: user.id,
                firstName: user.firstName || "Inconnu",
                lastName: user.lastName || "Inconnu",
                email: user.email,
                address: user.address || "Non renseignée",
                city: user.city || "Non renseignée",
                clientType: user.clientType,
                billingType: user.billingType,
                totalOrders,
                totalSpent,
                lastOrderDate,
                notifications: {
                    newsletter: user.preferences?.newsletter ?? false,
                    promotions: user.preferences?.promotions ?? false,
                    sms: user.preferences?.smsNotifications ?? false,
                    updates: user.preferences?.orderUpdates ?? true
                },
                createdAt: user.createdAt.toISOString().split('T')[0],
                isActive: user.isActive,
                abandonedCarts: 0,
            }
        })

        return NextResponse.json(formattedCustomers)
    } catch (error) {
        console.error("API Admin Customers:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
