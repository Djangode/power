import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/db"
import { sendOrderConfirmation } from "@/lib/email"

function getStripe() {
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-01-27.acacia" as any,
    })
}

export async function POST(req: Request) {
    const stripe = getStripe()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

    try {
        const body = await req.text()
        const headersList = await headers()
        const signature = headersList.get("stripe-signature")

        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 400 })
        }

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err: any) {
            return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session
            const { orderId, userId, deliverySlotId } = session.metadata || {}

            // Ne traiter que les paiements réellement réglés
            if (session.payment_status && session.payment_status !== "paid") {
                return NextResponse.json({ received: true })
            }

            if (orderId && userId) {
                // Vérifier idempotence — ne pas retraiter une commande déjà validée
                const existingOrder = await prisma.order.findUnique({
                    where: { id: orderId }
                })

                if (!existingOrder || existingOrder.status === "validated") {
                    return NextResponse.json({ received: true })
                }

                // Générer le numéro de facture
                const invoiceNumber = `FAC-${Date.now().toString(36).toUpperCase()}-${orderId.slice(-4).toUpperCase()}`

                // Valider la commande + sauvegarder le sessionId Stripe
                const order = await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: "validated",
                        stripeSessionId: session.id,
                        invoiceNumber,
                    }
                })

                // Incrémenter l'utilisation du code promo — uniquement au paiement confirmé,
                // et une seule fois grâce au verrou d'idempotence ci-dessus.
                if (order.promoCode) {
                    await prisma.promoCode.updateMany({
                        where: { code: order.promoCode },
                        data: { currentUses: { increment: 1 } },
                    })
                }

                // Réserver le créneau de livraison — une seule fois, au paiement confirmé
                if (deliverySlotId) {
                    await prisma.deliverySlot.updateMany({
                        where: { id: deliverySlotId },
                        data: { currentOrders: { increment: 1 } },
                    })
                }

                // Décrémenter le stock des produits commandés
                const orderItems = await prisma.orderItem.findMany({
                    where: { orderId },
                    include: { product: true }
                })
                for (const item of orderItems) {
                    if (item.productId && item.product) {
                        const newStock = Math.max(0, item.product.currentStock - item.quantity)
                        await prisma.product.update({
                            where: { id: item.productId },
                            data: {
                                currentStock: newStock,
                                inStock: newStock > 0,
                            }
                        })
                    }
                }

                // Vider le panier — items un par un (Neon HTTP pas de deleteMany)
                const userCart = await prisma.cart.findUnique({ where: { userId } })
                if (userCart) {
                    const cartItems = await prisma.cartItem.findMany({ where: { cartId: userCart.id } })
                    for (const item of cartItems) {
                        await prisma.cartItem.delete({ where: { id: item.id } })
                    }
                }

                // Récupérer l'email de l'user pour notification
                const user = await prisma.user.findUnique({
                    where: { id: userId }
                })

                if (user?.email) {
                    await sendOrderConfirmation(
                        user.email,
                        order.id,
                        order.total,
                        order.deliveryMethod || undefined,
                        order.pickupCode
                    )
                }
            }
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error("🔴 Webhook error:", error)
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
    }
}
