import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import crypto from "crypto"
import { Resend } from "resend"
import { rateLimit, clientIp } from "@/lib/rate-limit"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export async function POST(req: NextRequest) {
    try {
        const { email: rawEmail } = await req.json()

        if (!rawEmail || typeof rawEmail !== "string") {
            return NextResponse.json({ error: "Email requis" }, { status: 400 })
        }

        // Même normalisation qu'à l'inscription/connexion. Sans elle, une saisie « Jean@X.fr »
        // ne retrouve pas le compte stocké « jean@x.fr » → aucun mail envoyé, en silence.
        const email = rawEmail.trim().toLowerCase()

        // Anti-bombardement d'emails : par IP et par adresse ciblée. Réponse générique (comme
        // le « success » systématique) pour ne pas rouvrir la fuite d'énumération.
        const ipRl = await rateLimit(`forgot-ip:${clientIp(req)}`, 5, 15 * 60_000)
        const emailRl = await rateLimit(`forgot:${email}`, 3, 60 * 60_000)
        if (!ipRl.ok || !emailRl.ok) {
            return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 })
        }

        const user = await prisma.user.findUnique({ where: { email } })

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ success: true })
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString("hex")
        const expiry = new Date(Date.now() + 3600000) // 1 hour

        // On stocke le HASH du token, jamais le token en clair : un dump/backup de base ne
        // suffit plus à prendre le contrôle d'un compte. Le lien de l'email, lui, porte le
        // token en clair ; on le re-hache à la réinitialisation pour comparer.
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

        await prisma.siteSetting.upsert({
            where: { key: `reset_${user.id}` },
            create: {
                key: `reset_${user.id}`,
                value: JSON.stringify({ token: tokenHash, expiry: expiry.toISOString() }),
            },
            update: {
                value: JSON.stringify({ token: tokenHash, expiry: expiry.toISOString() }),
            },
        })

        // Send reset email
        const resetUrl = `${APP_URL}/mot-de-passe-oublie?token=${token}&uid=${user.id}`

        // Envoi best-effort : une panne Resend ne doit pas renvoyer 500. Sinon la réponse
        // diffère selon que le compte existe (500) ou non (200), ce qui rouvre la fuite
        // d'énumération que le « success » systématique était censé fermer.
        try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
            from: "Power Primeur <noreply@powerprimeur.com>",
            to: user.email,
            subject: "Réinitialisation de votre mot de passe",
            html: `
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
                    <div style="max-width: 600px; margin: 0 auto; background: #111; border-radius: 16px; overflow: hidden; margin-top: 20px;">
                        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #fff;">POWER</h1>
                            <p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px;">Primeur — Frais & Local</p>
                        </div>
                        <div style="padding: 32px 24px;">
                            <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 900; color: #fff;">Mot de passe oublié ?</h2>
                            <p style="margin: 0 0 24px; font-size: 15px; color: #999; line-height: 1.5;">
                                Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe. Ce lien expire dans 1 heure.
                            </p>
                            <div style="text-align: center; margin: 24px 0;">
                                <a href="${resetUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px;">
                                    Réinitialiser mon mot de passe
                                </a>
                            </div>
                            <p style="font-size: 12px; color: #666; margin-top: 24px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                        </div>
                        <div style="padding: 20px 24px; border-top: 1px solid #222; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #555;">Power — Primeur | 114 Rue Paul Vaillant Couturier, 94140 Alfortville</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        })
        } catch (emailError) {
            console.error("⚠️ Email de réinitialisation échoué:", emailError)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error in forgot password:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
