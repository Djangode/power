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
            const { orderId, userId } = session.metadata || {}

            if (orderId && userId) {
                // Vérifier idempotence — ne pas retraiter une commande déjà validée
                const existingOrder = await prisma.order.findUnique({
                    where: { id: orderId }
                })

                if (!existingOrder || existingOrder.status === "validated") {
                    return NextResponse.json({ received: true })
                }

                // Valider la commande
                const order = await prisma.order.update({
                    where: { id: orderId },
                    data: { status: "validated" }
                })

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
                    await sendOrderConfirmation(user.email, order.id, order.total)
                }
            }
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error("🔴 Webhook error:", error)
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
    }
}
