"use server"

import { prisma } from "@/lib/db"
import { z } from "zod"
import { sendContactNotification } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"

const contactSchema = z.object({
    name: z.string().trim().min(1, "Le nom est requis").max(100),
    email: z.string().trim().email("Email invalide").transform((value) => value.toLowerCase()),
    subject: z.string().trim().max(160).optional(),
    message: z.string().trim().min(10, "Le message doit faire au moins 10 caractères").max(3000),
})

export async function submitContactForm(data: z.infer<typeof contactSchema>) {
    const parsed = contactSchema.safeParse(data)

    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0].message }
    }

    const rl = await rateLimit(`contact:${parsed.data.email}`, 5, 60 * 60_000)
    if (!rl.ok) return { success: false, error: "Trop de messages envoyés. Réessayez plus tard." }

    try {
        await prisma.contactMessage.create({
            data: parsed.data
        })

        // Notifier l'équipe par email (best-effort : ne bloque pas la confirmation client)
        await sendContactNotification(
            parsed.data.name,
            parsed.data.email,
            parsed.data.subject || "",
            parsed.data.message,
        ).catch((e) => console.error("Notification contact échouée:", e))

        return { success: true }
    } catch (error) {
        console.error("Error submitting contact form:", error)
        return { success: false, error: "Erreur lors de l'envoi du message" }
    }
}
