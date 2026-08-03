"use server"

import { prisma } from "@/lib/db"

/** Composition prête à être configurée côté client : ses formats et ses ingrédients. */
export type CompositionWithChoices = {
    id: string
    name: string
    type: string
    description: string | null
    basePrice: number
    imageUrl: string | null
    sizes: { id: string; name: string; price: number; description: string | null; isDefault: boolean }[]
    options: {
        id: string
        name: string
        extraPrice: number
        includedByDefault: boolean
        isRemovable: boolean
    }[]
}

const SELECT_CHOICES = {
    sizes: {
        orderBy: [{ order: "asc" as const }, { price: "asc" as const }],
        select: { id: true, name: true, price: true, description: true, isDefault: true, includedChoices: true },
    },
    options: {
        where: { isActive: true },
        orderBy: [{ order: "asc" as const }, { name: "asc" as const }],
        select: { id: true, name: true, extraPrice: true, includedByDefault: true, isRemovable: true },
    },
}

export async function getCompositionsByTypes(types: string[]): Promise<{
    success: boolean
    data: CompositionWithChoices[]
}> {
    try {
        const compositions = await prisma.composition.findMany({
            where: { type: { in: types } },
            orderBy: { name: "asc" },
            include: SELECT_CHOICES,
        })
        return { success: true, data: compositions }
    } catch (error) {
        console.error("Error fetching compositions:", error)
        return { success: false, data: [] }
    }
}

export async function getComposition(id: string): Promise<{
    success: boolean
    data: CompositionWithChoices | null
}> {
    try {
        const composition = await prisma.composition.findUnique({
            where: { id },
            include: SELECT_CHOICES,
        })
        return { success: true, data: composition }
    } catch (error) {
        console.error(`Error fetching composition ${id}:`, error)
        return { success: false, data: null }
    }
}
