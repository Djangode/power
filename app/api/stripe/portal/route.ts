import { NextResponse } from "next/server"
import { auth } from "@/auth"
import Stripe from "stripe"
import { prisma } from "@/lib/db"

function getStripe() {
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-01-27.acacia" as any,
    })
}

/**
 * Ouvre le portail de facturation Stripe du client.
 * Crée le client Stripe à la volée si nécessaire (et mémorise son id sur le User).
 * NB: le portail doit être activé dans le dashboard Stripe (Settings > Billing > Customer portal).
 */
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const stripe = getStripe()
        const user = await prisma.user.findUnique({ where: { id: session.user.id } })
        if (!user) {
            return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
        }

        let customerId = user.stripeCustomerId
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
            })
            customerId = customer.id
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId },
            })
        }

        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const portal = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/mon-compte`,
        })

        return NextResponse.json({ url: portal.url })
    } catch (error) {
        console.error("Erreur portail Stripe:", error)
        return NextResponse.json({ error: "Impossible d'ouvrir le portail de paiement pour le moment." }, { status: 500 })
    }
}
