import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

const productSchema = z.object({
    name: z.string().min(1, "Le nom est requis").max(200),
    description: z.string().max(2000).optional().nullable(),
    price: z.union([z.number(), z.string()]).transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val
        return num
    }).pipe(z.number({ message: "Prix invalide" }).min(0, "Le prix doit être positif").finite("Prix invalide")),
    unit: z.string().default("kg"),
    image: z.string().optional().nullable(),
    inStock: z.boolean().default(true),
    organic: z.boolean().default(false),
    supplier: z.string().max(200).optional().nullable(),
    origin: z.string().max(200).optional().nullable(),
    purchasePrice: z.union([z.number(), z.string()]).optional().nullable().transform((val) => {
        if (val === null || val === undefined || val === '') return null
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) ? null : num
    }),
    margin: z.union([z.number(), z.string()]).optional().nullable().transform((val) => {
        if (val === null || val === undefined || val === '') return null
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) ? null : num
    }),
    currentStock: z.union([z.number(), z.string()]).optional().transform((val) => {
        if (val === null || val === undefined || val === '') return 0
        const num = typeof val === 'string' ? parseInt(String(val)) : val
        return isNaN(num) ? 0 : Math.max(0, num)
    }),
    minimumStock: z.union([z.number(), z.string()]).optional().transform((val) => {
        if (val === null || val === undefined || val === '') return 10
        const num = typeof val === 'string' ? parseInt(String(val)) : val
        return isNaN(num) ? 10 : Math.max(0, num)
    }),
    categoryId: z.string().min(1, "La catégorie est requise"),
})

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
        const parsed = productSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            )
        }

        const data = parsed.data

        const product = await prisma.product.create({
            data: {
                name: data.name,
                description: data.description || null,
                price: data.price,
                unit: data.unit,
                image: data.image || null,
                inStock: data.inStock,
                organic: data.organic,
                supplier: data.supplier || null,
                origin: data.origin || null,
                purchasePrice: data.purchasePrice ?? null,
                margin: data.margin ?? null,
                currentStock: data.currentStock ?? 0,
                minimumStock: data.minimumStock ?? 10,
                categoryId: data.categoryId,
            }
        })

        return NextResponse.json(product, { status: 201 })
    } catch (error) {
        console.error("Erreur création produit:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
