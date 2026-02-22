"use server"

import { prisma } from "@/lib/db"
import { z } from "zod"

const contactSchema = z.object({
    name: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    subject: z.string().optional(),
    message: z.string().min(10, "Le message doit faire au moins 10 caractères"),
})

export async function submitContactForm(data: z.infer<typeof contactSchema>) {
    const parsed = contactSchema.safeParse(data)

    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0].message }
    }

    try {
        await prisma.contactMessage.create({
            data: parsed.data
        })

        return { success: true }
    } catch (error) {
        console.error("Error submitting contact form:", error)
        return { success: false, error: "Erreur lors de l'envoi du message" }
    }
}
