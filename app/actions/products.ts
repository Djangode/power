"use server"

import { prisma } from "@/lib/db"

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            where: {
                inStock: true,
            },
            orderBy: { name: 'asc' },
        })
        return { success: true, data: products }
    } catch (error) {
        console.error("Error fetching products:", error)
        return { success: false, data: [] }
    }
}
