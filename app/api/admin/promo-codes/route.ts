import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const codes = await prisma.promoCode.findMany({
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(codes)
    } catch (error) {
        console.error("Error fetching promo codes:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const { code, type, value, minOrder, maxUses, expiresAt } = body

        if (!code || !type || value === undefined) {
            return NextResponse.json({ error: "code, type, value requis" }, { status: 400 })
        }

        const promo = await prisma.promoCode.create({
            data: {
                code: code.toUpperCase().trim(),
                type,
                value,
                minOrder: minOrder || 0,
                maxUses: maxUses || 0,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            }
        })

        return NextResponse.json(promo)
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ error: "Ce code existe déjà" }, { status: 409 })
        }
        console.error("Error creating promo code:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { id } = await req.json()
        await prisma.promoCode.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting promo code:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const { id, ...data } = body

        if (!id) {
            return NextResponse.json({ error: "id requis" }, { status: 400 })
        }

        const updateData: any = {}
        if (data.code) updateData.code = data.code.toUpperCase().trim()
        if (data.type) updateData.type = data.type
        if (data.value !== undefined) updateData.value = data.value
        if (data.minOrder !== undefined) updateData.minOrder = data.minOrder
        if (data.maxUses !== undefined) updateData.maxUses = data.maxUses
        if (data.isActive !== undefined) updateData.isActive = data.isActive
        if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

        const promo = await prisma.promoCode.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json(promo)
    } catch (error) {
        console.error("Error updating promo code:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
