"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const preferencesSchema = z.object({
    emailNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    orderUpdates: z.boolean().optional(),
    promotions: z.boolean().optional(),
    newsletter: z.boolean().optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    language: z.enum(["fr", "en"]).optional(),
})

export async function getUserPreferences() {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Non autorisé" }

    try {
        let preferences = await prisma.userPreference.findUnique({
            where: { userId: session.user.id }
        })

        if (!preferences) {
            preferences = await prisma.userPreference.create({
                data: { userId: session.user.id }
            })
        }

        return { success: true, data: preferences }
    } catch (error) {
        console.error("Error fetching preferences:", error)
        return { success: false, error: "Erreur lors de la récupération des préférences" }
    }
}

export async function updateUserPreferences(data: z.infer<typeof preferencesSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Non autorisé" }

    const parsed = preferencesSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "Données invalides" }
    }

    try {
        const preferences = await prisma.userPreference.upsert({
            where: { userId: session.user.id },
            update: parsed.data,
            create: {
                userId: session.user.id,
                ...parsed.data,
            }
        })

        return { success: true, data: preferences }
    } catch (error) {
        console.error("Error updating preferences:", error)
        return { success: false, error: "Erreur lors de la mise à jour des préférences" }
    }
}
