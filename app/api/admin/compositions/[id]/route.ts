import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") return new NextResponse("Unauthorized", { status: 401 })

        const { id } = await params
        await prisma.composition.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Erreur suppression composition:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") return new NextResponse("Unauthorized", { status: 401 })

        const { id } = await params
        const body = await req.json()

        const composition = await prisma.composition.update({
            where: { id },
            data: {
                name: body.name,
                type: body.type,
                description: body.description || null,
                basePrice: body.basePrice !== undefined ? parseFloat(body.basePrice) : undefined,
                imageUrl: body.imageUrl || null,
            }
        })

        return NextResponse.json(composition)
    } catch (error) {
        console.error("Erreur modification composition:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
