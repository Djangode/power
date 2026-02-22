import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const products = await prisma.product.findMany({
            include: {
                category: { select: { name: true } },
            },
            orderBy: { name: 'asc' }
        })

        const formattedProducts = products.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            selling_price: product.price,
            unit: product.unit,
            current_stock: product.currentStock,
            minimum_stock: product.minimumStock,
            status: !product.inStock ? 'out_of_stock' : product.currentStock <= product.minimumStock ? 'low_stock' : 'active',
            is_organic: product.organic,
            image_url: product.image,
            categories: product.category,
            supplier: product.supplier,
            origin: product.origin,
            purchasePrice: product.purchasePrice,
            margin: product.margin,
        }))

        return NextResponse.json(formattedProducts)
    } catch (error) {
        console.error("Erreur API products:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()

        const product = await prisma.product.create({
            data: {
                name: body.name,
                description: body.description || null,
                price: parseFloat(body.price),
                unit: body.unit || "kg",
                image: body.image || null,
                inStock: body.inStock ?? true,
                organic: body.organic ?? false,
                supplier: body.supplier || null,
                origin: body.origin || null,
                purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : null,
                margin: body.margin ? parseFloat(body.margin) : null,
                currentStock: body.currentStock ? parseInt(body.currentStock) : 0,
                minimumStock: body.minimumStock ? parseInt(body.minimumStock) : 10,
                categoryId: body.categoryId,
            }
        })

        return NextResponse.json(product, { status: 201 })
    } catch (error) {
        console.error("Erreur création produit:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
