import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const orders = await prisma.order.findMany({
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                items: {
                    include: {
                        product: { select: { name: true, unit: true } },
                        composition: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const formattedOrders = orders.map(order => ({
            ...order,
            order_number: `CMD-${order.id.slice(-6).toUpperCase()}`,
            created_at: order.createdAt,
            order_items: order.items.map((item) => ({
                ...item,
                quantity_ordered: item.quantity,
                unit_price: item.priceAtPurchase,
                total_price: item.quantity * item.priceAtPurchase,
                products: item.product,
                compositions: item.composition
            })),
            profiles: order.user ? {
                first_name: order.user.firstName,
                last_name: order.user.lastName,
                email: order.user.email
            } : null
        }))

        return NextResponse.json(formattedOrders)
    } catch (error) {
        console.error("Erreur API orders:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
