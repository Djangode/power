"use server"

import { prisma } from "@/lib/db"

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' },
        })
        return { success: true, data: categories }
    } catch (error) {
        console.error("Error fetching categories:", error)
        return { success: false, data: [] }
    }
}
