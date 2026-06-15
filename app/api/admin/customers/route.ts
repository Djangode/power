import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateCustomerSchema = z.object({
    userId: z.string().min(1, "userId requis"),
    clientType: z.enum(["particulier", "professionnel"]).optional(),
    billingType: z.enum(["particulier", "professionnel"]).optional(),
    isActive: z.boolean().optional(),
    notifications: z.object({
        newsletter: z.boolean().optional(),
        promotions: z.boolean().optional(),
        sms: z.boolean().optional(),
        updates: z.boolean().optional(),
    }).optional(),
})

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

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = updateCustomerSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const { userId, clientType, billingType, isActive, notifications } = parsed.data

        const existing = await prisma.user.findUnique({ where: { id: userId } })
        if (!existing) {
            return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
        }

        // Mise à jour des champs utilisateur fournis uniquement
        const userData: { clientType?: string; billingType?: string; isActive?: boolean } = {}
        if (clientType !== undefined) userData.clientType = clientType
        if (billingType !== undefined) userData.billingType = billingType
        if (isActive !== undefined) userData.isActive = isActive

        if (Object.keys(userData).length > 0) {
            await prisma.user.update({ where: { id: userId }, data: userData })
        }

        // Mise à jour des préférences de notification via upsert
        if (notifications) {
            const prefUpdate: {
                newsletter?: boolean
                promotions?: boolean
                smsNotifications?: boolean
                orderUpdates?: boolean
            } = {}
            if (notifications.newsletter !== undefined) prefUpdate.newsletter = notifications.newsletter
            if (notifications.promotions !== undefined) prefUpdate.promotions = notifications.promotions
            if (notifications.sms !== undefined) prefUpdate.smsNotifications = notifications.sms
            if (notifications.updates !== undefined) prefUpdate.orderUpdates = notifications.updates

            if (Object.keys(prefUpdate).length > 0) {
                await prisma.userPreference.upsert({
                    where: { userId },
                    update: prefUpdate,
                    create: { userId, ...prefUpdate },
                })
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("API Admin Customers PATCH:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
