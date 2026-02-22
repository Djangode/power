import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import Stripe from "stripe"
import { prisma } from "@/lib/db"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
})

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Récupération du panier dynamique de l'utilisateur
        const cartItems = await prisma.cartItem.findMany({
            where: { cart: { userId: session.user.id } },
            include: {
                product: true,
                composition: true
            }
        })

        if (!cartItems.length) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
        }

        // Calculer le total et préparer les items pour la commande
        let total = 0
        const orderItemsData = cartItems.map(item => {
            const price = item.productId ? item.product!.price : item.composition!.basePrice
            total += price * item.quantity
            return {
                productId: item.productId || null,
                compositionId: item.compositionId || null,
                quantity: item.quantity,
                priceAtPurchase: price
            }
        })

        // Création de la commande "pending"
        const order = await prisma.order.create({
            data: {
                userId: session.user.id,
                total,
                status: "pending",
                items: {
                    create: orderItemsData
                }
            }
        })

        // Préparer les items Stripe
        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map(item => {
            const name = item.productId ? item.product!.name : item.composition!.name
            const image = item.productId ? item.product!.image : item.composition!.imageUrl
            const price = item.productId ? item.product!.price : item.composition!.basePrice

            return {
                quantity: item.quantity,
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: name,
                        images: image ? [image] : undefined,
                    },
                    unit_amount: Math.round(price * 100), // Stripe attend des centimes
                }
            }
        })

        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/panier`,
            metadata: {
                orderId: order.id,
                userId: session.user.id
            }
        })

        return NextResponse.json({ url: checkoutSession.url })
    } catch (error) {
        console.error("🔴 Checkout error:", error)
        return NextResponse.json({ error: "Mise en place du checkout impossible." }, { status: 500 })
    }
}
