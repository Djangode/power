import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { sendMarketingEmail } from "@/lib/email"
import crypto from "crypto"

/**
 * POST — Envoi d'email marketing à tous les clients
 * Avec option d'auto-générer un code promo intégré dans l'email
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const body = await req.json()
        const {
            subject,
            message,
            includePromo,
            promoType,       // "percentage" ou "fixed"
            promoValue,      // ex: 10 pour 10% ou 5 pour 5€
            promoMinOrder,   // minimum de commande
            promoMaxUses,    // 0 = illimité
            promoExpiresInDays, // nombre de jours avant expiration
        } = body

        if (!subject?.trim() || !message?.trim()) {
            return NextResponse.json({ error: "Sujet et message requis" }, { status: 400 })
        }

        // Générer un code promo si demandé
        let promoCode = null
        let promoLabel = ""

        if (includePromo) {
            const code = `POWER${crypto.randomBytes(3).toString("hex").toUpperCase()}`
            const expiresAt = promoExpiresInDays
                ? new Date(Date.now() + promoExpiresInDays * 24 * 60 * 60 * 1000)
                : null

            promoCode = await prisma.promoCode.create({
                data: {
                    code,
                    type: promoType || "percentage",
                    value: promoValue || 10,
                    minOrder: promoMinOrder || 0,
                    maxUses: promoMaxUses || 0,
                    isActive: true,
                    expiresAt,
                }
            })

            promoLabel = promoType === "fixed"
                ? `${promoValue}€ de réduction`
                : `${promoValue}% de réduction`
        }

        // RGPD : n'envoyer qu'aux clients ayant explicitement consenti (newsletter OU promotions)
        const customers = await prisma.user.findMany({
            where: {
                role: "user",
                isActive: true,
                preferences: {
                    OR: [{ promotions: true }, { newsletter: true }],
                },
            },
            select: { email: true }
        })

        if (customers.length === 0) {
            return NextResponse.json({ error: "Aucun client n'a consenti à recevoir des emails marketing (newsletter ou promotions)." }, { status: 400 })
        }

        // Construire le HTML du message
        let htmlContent = message
            .replace(/\n/g, "<br/>")
            .replace(/&/g, "&amp;")

        // Ajouter le bloc code promo si activé
        if (promoCode) {
            htmlContent += `
                <div style="margin: 24px 0; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px; padding: 24px; text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 11px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px;">Votre code promo exclusif</p>
                    <p style="margin: 0; font-size: 32px; font-weight: 900; color: #fff; letter-spacing: 6px;">${promoCode.code}</p>
                    <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); font-weight: bold;">${promoLabel}</p>
                    ${promoCode.minOrder > 0 ? `<p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.6);">Dès ${promoCode.minOrder.toFixed(2)}€ d'achat</p>` : ""}
                    ${promoCode.expiresAt ? `<p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.6);">Valable jusqu'au ${new Date(promoCode.expiresAt).toLocaleDateString("fr-FR")}</p>` : ""}
                </div>
            `
        }

        // Envoi des emails
        const emails = customers.map(c => c.email)
        const result = await sendMarketingEmail(emails, subject, htmlContent)

        return NextResponse.json({
            success: true,
            sent: result.sent || emails.length,
            promoCode: promoCode?.code || null,
            promoLabel: promoLabel || null,
        })
    } catch (error) {
        console.error("Marketing email error:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
