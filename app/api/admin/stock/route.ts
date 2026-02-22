import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const stock = await prisma.product.findMany({
            orderBy: { name: 'asc' }
        })

        const formattedStock = stock.map((item) => {
            let status = 'in_stock'
            if (item.currentStock <= 0) status = 'out_of_stock'
            else if (item.currentStock <= item.minimumStock) status = 'low_stock'

            return {
                id: item.id,
                productName: item.name,
                supplier: item.supplier || "Non renseigné",
                origin: item.origin || "Local",
                purchasePrice: item.purchasePrice || 0,
                sellingPrice: item.price,
                margin: item.margin || 0,
                currentStock: item.currentStock,
                minimumStock: item.minimumStock,
                lastRestockDate: item.updatedAt.toISOString().split('T')[0],
                status
            }
        })

        return NextResponse.json(formattedStock)
    } catch (error) {
        console.error("API Admin Stock:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const data = await req.json()
        const { productId, quantity, type } = data

        if (!productId || quantity === undefined) {
            return NextResponse.json({ error: "productId et quantity sont requis" }, { status: 400 })
        }

        const product = await prisma.product.findUnique({ where: { id: productId } })
        if (!product) {
            return NextResponse.json({ error: "Produit introuvable" }, { status: 404 })
        }

        const newStock = type === "restock"
            ? product.currentStock + parseInt(quantity)
            : parseInt(quantity)

        const updated = await prisma.product.update({
            where: { id: productId },
            data: {
                currentStock: Math.max(0, newStock),
                inStock: newStock > 0,
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error("API Admin Stock POST:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
