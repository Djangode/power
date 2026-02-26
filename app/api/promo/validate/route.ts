import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
    try {
        const { code, subtotal } = await req.json()

        if (!code) {
            return NextResponse.json({ error: "Code requis" }, { status: 400 })
        }

        const promo = await prisma.promoCode.findUnique({
            where: { code: code.toUpperCase().trim() }
        })

        if (!promo) {
            return NextResponse.json({ error: "Code promo invalide" }, { status: 404 })
        }

        if (!promo.isActive) {
            return NextResponse.json({ error: "Ce code promo n'est plus actif" }, { status: 400 })
        }

        if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
            return NextResponse.json({ error: "Ce code promo a expiré" }, { status: 400 })
        }

        if (promo.maxUses > 0 && promo.currentUses >= promo.maxUses) {
            return NextResponse.json({ error: "Ce code promo a atteint sa limite d'utilisation" }, { status: 400 })
        }

        if (subtotal && subtotal < promo.minOrder) {
            return NextResponse.json({
                error: `Commande minimum de ${promo.minOrder.toFixed(2)}€ requise pour ce code`
            }, { status: 400 })
        }

        let discount = 0
        if (promo.type === "percentage") {
            discount = (subtotal || 0) * (promo.value / 100)
        } else {
            discount = promo.value
        }

        // Don't exceed subtotal
        if (subtotal) {
            discount = Math.min(discount, subtotal)
        }

        return NextResponse.json({
            valid: true,
            code: promo.code,
            type: promo.type,
            value: promo.value,
            discount: Math.round(discount * 100) / 100,
            label: promo.type === "percentage" ? `-${promo.value}%` : `-${promo.value.toFixed(2)}€`,
        })
    } catch (error) {
        console.error("Error validating promo code:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
