import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Nettoyage périodique (cron Vercel, voir vercel.json).
 *
 * - Supprime les lignes de rate-limit dont la fenêtre est passée.
 * - Supprime les jetons de réinitialisation de mot de passe expirés (stockés dans SiteSetting
 *   sous « reset_* ») — ils ne sont sinon purgés qu'à la prochaine demande du même compte.
 *
 * Sécurité : Vercel Cron ajoute l'en-tête « Authorization: Bearer <CRON_SECRET> » quand la
 * variable CRON_SECRET est définie. On refuse tout appel qui ne le présente pas.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const now = new Date()
    let rateLimitDeleted = 0
    let resetTokensDeleted = 0

    try {
        const rl = await prisma.rateLimit.deleteMany({ where: { windowEnd: { lt: now } } })
        rateLimitDeleted = rl.count
    } catch (error) {
        console.error("Cleanup RateLimit échoué:", error)
    }

    try {
        const resetSettings = await prisma.siteSetting.findMany({ where: { key: { startsWith: "reset_" } } })
        for (const s of resetSettings) {
            let expired = false
            try {
                const data = JSON.parse(s.value)
                expired = !data.expiry || new Date(data.expiry) < now
            } catch {
                expired = true // valeur corrompue → on purge aussi
            }
            if (expired) {
                await prisma.siteSetting.delete({ where: { key: s.key } }).catch(() => {})
                resetTokensDeleted++
            }
        }
    } catch (error) {
        console.error("Cleanup jetons reset échoué:", error)
    }

    return NextResponse.json({ ok: true, rateLimitDeleted, resetTokensDeleted })
}
