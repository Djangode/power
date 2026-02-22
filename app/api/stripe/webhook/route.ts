import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/db"
import { sendOrderConfirmation } from "@/lib/email"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
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
                // Valider la commande
                const order = await prisma.order.update({
                    where: { id: orderId },
                    data: { status: "validated" }
                })

                // Vider le panier
                const userCart = await prisma.cart.findUnique({ where: { userId } })
                if (userCart) {
                    await prisma.cartItem.deleteMany({
                        where: { cartId: userCart.id }
                    })
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
