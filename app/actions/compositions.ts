"use server"

import { prisma } from "@/lib/db"

export async function getCompositionsByTypes(types: string[]) {
    try {
        const compositions = await prisma.composition.findMany({
            where: {
                type: {
                    in: types,
                },
            },
            orderBy: { name: 'asc' },
        })
        return { success: true, data: compositions }
    } catch (error) {
        console.error("Error fetching compositions:", error)
        return { success: false, data: [] }
    }
}
