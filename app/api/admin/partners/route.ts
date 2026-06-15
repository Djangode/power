import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

const partnerSchema = z.object({
    name: z.string().min(1, "Le nom est requis").max(200),
    logoUrl: z.string().max(2000).optional().nullable(),
    isActive: z.boolean().optional(),
})

// GET — liste des partenaires
export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const partners = await prisma.partner.findMany({
            orderBy: { name: "asc" },
        })

        return NextResponse.json(partners)
    } catch (error) {
        console.error("Erreur API partners (GET):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// POST — créer un partenaire
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const parsed = partnerSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const data = parsed.data
        const partner = await prisma.partner.create({
            data: {
                name: data.name,
                logoUrl: data.logoUrl || null,
                isActive: data.isActive ?? true,
            },
        })

        return NextResponse.json(partner, { status: 201 })
    } catch (error) {
        console.error("Erreur API partners (POST):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// PUT — modifier un partenaire
export async function PUT(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const { id } = body
        if (!id) {
            return NextResponse.json({ error: "id requis" }, { status: 400 })
        }

        const parsed = partnerSchema.partial().safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const data = parsed.data
        const partner = await prisma.partner.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        })

        return NextResponse.json(partner)
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Partenaire introuvable" }, { status: 404 })
        }
        console.error("Erreur API partners (PUT):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// DELETE — supprimer un partenaire
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { id } = await req.json()
        if (!id) {
            return NextResponse.json({ error: "id requis" }, { status: 400 })
        }

        await prisma.partner.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Partenaire introuvable" }, { status: 404 })
        }
        console.error("Erreur API partners (DELETE):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
