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

        const ALLOWED_TYPES = ["jus", "soupe", "legumes-decoupes", "fruits-decoupes"]
        if (body.type !== undefined && !ALLOWED_TYPES.includes(body.type)) {
            return NextResponse.json(
                { error: "Type invalide. Valeurs : jus, soupe, legumes-decoupes, fruits-decoupes" },
                { status: 400 }
            )
        }

        const data: Record<string, any> = {}
        if (body.name !== undefined) data.name = String(body.name).trim()
        if (body.type !== undefined) data.type = body.type
        if (body.description !== undefined) data.description = body.description || null
        if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null
        if (body.basePrice !== undefined) {
            const n = parseFloat(body.basePrice)
            if (isNaN(n) || n < 0) {
                return NextResponse.json({ error: "Prix de base invalide" }, { status: 400 })
            }
            data.basePrice = n
        }

        const composition = await prisma.composition.update({ where: { id }, data })

        return NextResponse.json(composition)
    } catch (error) {
        console.error("Erreur modification composition:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
