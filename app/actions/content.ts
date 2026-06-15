"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function getFaqs() {
    try {
        const faqs = await prisma.faq.findMany({
            orderBy: { order: 'asc' }
        })
        return { success: true, data: faqs }
    } catch (error) {
        console.error("Error fetching FAQs:", error)
        return { success: false, data: [] }
    }
}

export async function getBlogPosts() {
    try {
        const posts = await prisma.blogPost.findMany({
            where: { published: true },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: posts }
    } catch (error) {
        console.error("Error fetching blog posts:", error)
        return { success: false, data: [] }
    }
}

export async function getRecipes() {
    try {
        const recipes = await prisma.recipe.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: recipes }
    } catch (error) {
        console.error("Error fetching recipes:", error)
        return { success: false, data: [] }
    }
}

export async function getPartners() {
    try {
        const partners = await prisma.partner.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: partners }
    } catch (error) {
        console.error("Error fetching partners:", error)
        return { success: false, data: [] }
    }
}

export async function getSiteSetting(key: string) {
    try {
        const setting = await prisma.siteSetting.findUnique({
            where: { key }
        })
        return { success: true, data: setting?.value || null }
    } catch (error) {
        console.error(`Error fetching site setting ${key}:`, error)
        return { success: false, data: null }
    }
}

// Liste des clés autorisées pour éviter d'écrire n'importe quoi en base.
const ALLOWED_SETTING_KEYS = [
    "shop_name",
    "contact_email",
    "delivery_fee",
    "free_delivery_threshold",
    "order_notification_email",
] as const

type AllowedSettingKey = (typeof ALLOWED_SETTING_KEYS)[number]

export async function getSiteSettings() {
    try {
        const settings = await prisma.siteSetting.findMany({
            where: { key: { in: [...ALLOWED_SETTING_KEYS] } }
        })
        const map: Record<string, string> = {}
        for (const s of settings) map[s.key] = s.value
        return { success: true, data: map }
    } catch (error) {
        console.error("Error fetching site settings:", error)
        return { success: false, data: {} as Record<string, string> }
    }
}

export async function setSiteSetting(key: string, value: string) {
    const session = await auth()
    if (session?.user?.role !== "admin") {
        return { success: false, error: "Non autorisé" }
    }

    if (!ALLOWED_SETTING_KEYS.includes(key as AllowedSettingKey)) {
        return { success: false, error: "Clé de paramètre invalide" }
    }

    try {
        await prisma.siteSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        })
        return { success: true }
    } catch (error) {
        console.error(`Error saving site setting ${key}:`, error)
        return { success: false, error: "Erreur lors de l'enregistrement" }
    }
}

/**
 * Lit la configuration de livraison (frais + seuil de gratuité) depuis les
 * SiteSetting. Lecture publique : appelable côté serveur dans une route sans
 * contrôle admin. Valeurs par défaut : fee=4.9, threshold=30 si absent/NaN.
 */
export async function getDeliveryConfig(): Promise<{ fee: number; threshold: number }> {
    const DEFAULT_FEE = 4.9
    const DEFAULT_THRESHOLD = 30

    try {
        const settings = await prisma.siteSetting.findMany({
            where: { key: { in: ["delivery_fee", "free_delivery_threshold"] } },
        })
        const map: Record<string, string> = {}
        for (const s of settings) map[s.key] = s.value

        const parsedFee = parseFloat(map["delivery_fee"])
        const parsedThreshold = parseFloat(map["free_delivery_threshold"])

        return {
            fee: Number.isNaN(parsedFee) ? DEFAULT_FEE : parsedFee,
            threshold: Number.isNaN(parsedThreshold) ? DEFAULT_THRESHOLD : parsedThreshold,
        }
    } catch (error) {
        console.error("Error fetching delivery config:", error)
        return { fee: DEFAULT_FEE, threshold: DEFAULT_THRESHOLD }
    }
}

/**
 * Lit l'adresse email qui reçoit une notification à chaque nouvelle commande.
 * Lecture publique : appelable côté serveur dans une route sans contrôle admin.
 * Fallback "contact@powerprimeur.com" si absent ou vide.
 */
export async function getOrderNotificationEmail(): Promise<string> {
    const FALLBACK_EMAIL = "contact@powerprimeur.com"

    try {
        const setting = await prisma.siteSetting.findUnique({
            where: { key: "order_notification_email" },
        })
        const value = setting?.value?.trim()
        return value ? value : FALLBACK_EMAIL
    } catch (error) {
        console.error("Error fetching order notification email:", error)
        return FALLBACK_EMAIL
    }
}

export async function getBlogPost(id: string) {
    try {
        const post = await prisma.blogPost.findUnique({
            where: { id }
        })
        return { success: true, data: post }
    } catch (error) {
        console.error(`Error fetching blog post ${id}:`, error)
        return { success: false, data: null }
    }
}

export async function getRecipe(id: string) {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id }
        })
        return { success: true, data: recipe }
    } catch (error) {
        console.error(`Error fetching recipe ${id}:`, error)
        return { success: false, data: null }
    }
}
