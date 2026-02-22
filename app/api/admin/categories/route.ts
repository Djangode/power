import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(categories)
    } catch (error) {
        console.error("Erreur API categories:", error)
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

        const slug = body.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")

        const category = await prisma.category.create({
            data: {
                name: body.name,
                description: body.description || null,
                slug,
            }
        })

        return NextResponse.json(category, { status: 201 })
    } catch (error) {
        console.error("Erreur création catégorie:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
