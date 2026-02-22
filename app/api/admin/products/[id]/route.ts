import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") return new NextResponse("Unauthorized", { status: 401 })

        const { id } = await params
        const product = await prisma.product.findUnique({
            where: { id },
            include: { category: true }
        })

        if (!product) return new NextResponse("Not Found", { status: 404 })

        return NextResponse.json(product)
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") return new NextResponse("Unauthorized", { status: 401 })

        const { id } = await params
        const body = await req.json()

        const product = await prisma.product.update({
            where: { id },
            data: {
                name: body.name,
                description: body.description,
                price: body.price !== undefined ? parseFloat(body.price) : undefined,
                unit: body.unit,
                image: body.image,
                inStock: body.inStock,
                organic: body.organic,
                supplier: body.supplier,
                origin: body.origin,
                purchasePrice: body.purchasePrice !== undefined ? parseFloat(body.purchasePrice) : undefined,
                margin: body.margin !== undefined ? parseFloat(body.margin) : undefined,
                currentStock: body.currentStock !== undefined ? parseInt(body.currentStock) : undefined,
                minimumStock: body.minimumStock !== undefined ? parseInt(body.minimumStock) : undefined,
                categoryId: body.categoryId,
            }
        })

        return NextResponse.json(product)
    } catch (error) {
        console.error("Erreur modification produit:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") return new NextResponse("Unauthorized", { status: 401 })

        const { id } = await params
        await prisma.product.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
