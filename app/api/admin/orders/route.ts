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
                        phone: true,
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
            id: order.id,
            order_number: `CMD-${order.id.slice(-6).toUpperCase()}`,
            created_at: order.createdAt,
            createdAt: order.createdAt,
            status: order.status,
            total: order.total,
            deliveryMethod: order.deliveryMethod,
            deliveryDate: order.deliveryDate,
            deliverySlot: order.deliverySlot,
            deliveryAddress: order.deliveryAddress,
            deliveryCity: order.deliveryCity,
            deliveryPostalCode: order.deliveryPostalCode,
            deliveryFee: order.deliveryFee,
            pickupCode: order.pickupCode,
            carrier: order.carrier,
            trackingNumber: order.trackingNumber,
            invoiceNumber: order.invoiceNumber,
            // stripeSessionId volontairement omis pour des raisons de sécurité
            user: order.user,
            profiles: order.user ? {
                first_name: order.user.firstName,
                last_name: order.user.lastName,
                email: order.user.email
            } : null,
            items: order.items,
            order_items: order.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                compositionId: item.compositionId,
                quantity: item.quantity,
                quantity_ordered: item.quantity,
                priceAtPurchase: item.priceAtPurchase,
                unit_price: item.priceAtPurchase,
                total_price: item.quantity * item.priceAtPurchase,
                product: item.product,
                products: item.product,
                composition: item.composition,
                compositions: item.composition,
            })),
        }))

        return NextResponse.json(formattedOrders)
    } catch (error) {
        console.error("Erreur API orders:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
