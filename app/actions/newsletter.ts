"use server"

import { prisma } from "@/lib/db"
import { z } from "zod"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Inscription à la newsletter (ouverte à tous, clients ou non).
 * - Enregistre l'email dans NewsletterSubscriber (idempotent).
 * - Si un compte existe avec cet email, active aussi sa préférence newsletter
 *   (cohérent avec le filtre de consentement RGPD côté envoi marketing).
 */
export async function subscribeNewsletter(rawEmail: string) {
    const parsed = z.string().trim().email("Email invalide").max(254).safeParse(rawEmail)
    if (!parsed.success) {
        return { success: false, error: "Veuillez saisir une adresse email valide." }
    }

    const email = parsed.data.toLowerCase().trim()

    const rl = await rateLimit(`newsletter:${email}`, 5, 24 * 60 * 60_000)
    if (!rl.ok) return { success: false, error: "Trop de tentatives. Réessayez plus tard." }

    try {
        await prisma.newsletterSubscriber.upsert({
            where: { email },
            update: {},
            create: { email },
        })

        const user = await prisma.user.findUnique({ where: { email } })
        if (user) {
            await prisma.userPreference.upsert({
                where: { userId: user.id },
                update: { newsletter: true },
                create: { userId: user.id, newsletter: true },
            })
        }

        return { success: true }
    } catch (error) {
        console.error("Erreur inscription newsletter:", error)
        return { success: false, error: "Erreur lors de l'inscription. Réessayez." }
    }
}
