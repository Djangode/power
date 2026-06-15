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

        // Patch sûr : on n'écrit que les champs fournis et on ne laisse JAMAIS passer
        // une valeur NaN (parseFloat("") => NaN ferait planter Prisma).
        const num = (v: any) => { const n = parseFloat(v); return isNaN(n) ? undefined : n }
        const int = (v: any) => { const n = parseInt(v); return isNaN(n) ? undefined : n }
        const data: Record<string, any> = {}

        if (body.name !== undefined) data.name = String(body.name).trim()
        if (body.description !== undefined) data.description = body.description || null
        if (body.unit !== undefined) data.unit = body.unit
        if (body.image !== undefined) data.image = body.image || null
        if (body.inStock !== undefined) data.inStock = Boolean(body.inStock)
        if (body.organic !== undefined) data.organic = Boolean(body.organic)
        if (body.supplier !== undefined) data.supplier = body.supplier || null
        if (body.origin !== undefined) data.origin = body.origin || null
        if (body.categoryId) data.categoryId = body.categoryId

        const price = num(body.price)
        if (body.price !== undefined && price !== undefined) data.price = Math.max(0, price)

        if (body.purchasePrice !== undefined)
            data.purchasePrice = body.purchasePrice === "" || body.purchasePrice === null ? null : (num(body.purchasePrice) ?? null)
        if (body.margin !== undefined)
            data.margin = body.margin === "" || body.margin === null ? null : (num(body.margin) ?? null)

        const cs = int(body.currentStock)
        if (body.currentStock !== undefined && cs !== undefined) data.currentStock = Math.max(0, cs)
        const ms = int(body.minimumStock)
        if (body.minimumStock !== undefined && ms !== undefined) data.minimumStock = Math.max(0, ms)

        if (body.name !== undefined && !data.name) {
            return NextResponse.json({ error: "Le nom est requis" }, { status: 400 })
        }

        const product = await prisma.product.update({ where: { id }, data })

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
