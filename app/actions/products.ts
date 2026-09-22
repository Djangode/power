"use server"

import { prisma } from "@/lib/db"

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            where: {
                inStock: true,
            },
            orderBy: { name: 'asc' },
            // Données publiques uniquement : prix d'achat, marge et fournisseur restent
            // strictement internes à Power.
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                promoPrice: true,
                unit: true,
                image: true,
                inStock: true,
                organic: true,
                origin: true,
                currentStock: true,
                categoryId: true,
            },
        })
        return { success: true, data: products }
    } catch (error) {
        console.error("Error fetching products:", error)
        return { success: false, data: [] }
    }
}
