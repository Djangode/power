import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const compositions = await prisma.composition.findMany({
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(compositions)
    } catch (error) {
        console.error("Erreur API compositions:", error)
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

        const composition = await prisma.composition.create({
            data: {
                name: body.name,
                type: body.type,
                description: body.description || null,
                basePrice: parseFloat(body.basePrice),
                imageUrl: body.imageUrl || null,
            }
        })

        return NextResponse.json(composition, { status: 201 })
    } catch (error) {
        console.error("Erreur création composition:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
