"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateProfileSchema = z.object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(240).optional(),
    city: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
    clientType: z.string().optional(),
    billingType: z.string().optional(),
    country: z.string().trim().max(80).optional(),
    companyName: z.string().trim().max(160).optional(),
    siret: z.string().trim().max(20).optional(),
})

const ACCOUNT_TYPES = ["particulier", "professionnel"]

const publicProfileSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    address: true,
    city: true,
    postalCode: true,
    clientType: true,
    billingType: true,
    country: true,
    companyName: true,
    siret: true,
} as const

export async function getUserProfile() {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Non autorisé" }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            // Liste blanche : ne jamais sérialiser password, rôle, salaire ou identifiants
            // Stripe vers le navigateur du client.
            select: publicProfileSelect,
        })

        if (!user) return { success: false, error: "Utilisateur non trouvé" }

        return { success: true, data: user }
    } catch (error) {
        console.error("Error fetching user profile:", error)
        return { success: false, error: "Erreur lors du chargement du profil" }
    }
}

export async function updateUserProfile(data: z.infer<typeof updateProfileSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Non autorisé" }

    const parsed = updateProfileSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "Données invalides" }
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                firstName: parsed.data.firstName || undefined,
                lastName: parsed.data.lastName || undefined,
                phone: parsed.data.phone || undefined,
                address: parsed.data.address || undefined,
                city: parsed.data.city || undefined,
                postalCode: parsed.data.postalCode || undefined,
                clientType: ACCOUNT_TYPES.includes(parsed.data.clientType || "") ? parsed.data.clientType : undefined,
                billingType: ACCOUNT_TYPES.includes(parsed.data.billingType || "") ? parsed.data.billingType : undefined,
                country: parsed.data.country || undefined,
                companyName: parsed.data.companyName || undefined,
                siret: parsed.data.siret || undefined,
            },
            select: publicProfileSelect,
        })
        return { success: true, data: updatedUser }
    } catch (error) {
        console.error("Erreur update profile:", error)
        return { success: false, error: "Erreur de mise à jour" }
    }
}

export async function getUserOrders() {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Non autorisé", data: [] }

        const orders = await prisma.order.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                createdAt: true,
                status: true,
                total: true,
                deliveryMethod: true,
                invoiceNumber: true,
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        priceAtPurchase: true,
                        product: { select: { name: true, unit: true } },
                        composition: { select: { name: true } },
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: orders }
    } catch (error) {
        console.error("Error fetching user orders:", error)
        return { success: false, error: "Erreur lors du chargement des commandes", data: [] }
    }
}
