import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

const compositionSchema = z.object({
    name: z.string().min(1, "Le nom est requis").max(200),
    type: z.enum(["jus", "soupe", "legumes-decoupes"], {
        errorMap: () => ({ message: "Type invalide. Valeurs : jus, soupe, legumes-decoupes" }),
    }),
    description: z.string().max(2000).optional().nullable(),
    basePrice: z.union([z.number(), z.string()]).transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val
        if (isNaN(num) || num < 0) throw new Error("Prix de base invalide")
        return num
    }),
    imageUrl: z.string().url().optional().nullable(),
})

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
        const parsed = compositionSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            )
        }

        const data = parsed.data

        const composition = await prisma.composition.create({
            data: {
                name: data.name,
                type: data.type,
                description: data.description || null,
                basePrice: data.basePrice,
                imageUrl: data.imageUrl || null,
            }
        })

        return NextResponse.json(composition, { status: 201 })
    } catch (error) {
        console.error("Erreur création composition:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
