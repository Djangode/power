import { prisma } from "@/lib/db"

/**
 * Limiteur de débit simple, adossé à la base (pas de service externe type Redis).
 *
 * Fenêtre par clé : « login:email », « forgot-ip:1.2.3.4 »… Chaque clé compte ses appels
 * jusqu'à `max` dans une fenêtre de `windowMs`, puis repart à zéro.
 *
 * Deux partis pris assumés :
 *  - FAIL-OPEN : en cas d'erreur base, on autorise. Mieux vaut laisser passer un abus rare
 *    qu'empêcher un vrai client de s'inscrire / se connecter à cause d'un hoquet de la base.
 *  - Contrainte Neon HTTP (pas de transaction) : l'incrément atomique `{ increment: 1 }`
 *    suffit ; une petite imprécision sous forte concurrence est acceptable pour du rate-limit.
 */
export type RateLimitResult = { ok: boolean; retryAfterSec: number }

export async function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    try {
        const existing = await prisma.rateLimit.findUnique({ where: { key } })

        // Pas de fenêtre en cours (ou expirée) → on en ouvre une neuve.
        if (!existing || existing.windowEnd.getTime() < now) {
            await prisma.rateLimit.upsert({
                where: { key },
                create: { key, count: 1, windowEnd: new Date(now + windowMs) },
                update: { count: 1, windowEnd: new Date(now + windowMs) },
            })
            return { ok: true, retryAfterSec: 0 }
        }

        if (existing.count >= max) {
            return {
                ok: false,
                retryAfterSec: Math.max(1, Math.ceil((existing.windowEnd.getTime() - now) / 1000)),
            }
        }

        await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } })
        return { ok: true, retryAfterSec: 0 }
    } catch (error) {
        console.error("Rate limit indisponible (fail-open):", error)
        return { ok: true, retryAfterSec: 0 }
    }
}

/** Adresse IP du client depuis les en-têtes (Vercel renseigne x-forwarded-for). */
export function clientIp(req: Request): string {
    const fwd = req.headers.get("x-forwarded-for")
    return fwd?.split(",")[0]?.trim() || "unknown"
}
