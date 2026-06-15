import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

const recipeSchema = z.object({
    title: z.string().min(1, "Le titre est requis").max(200),
    description: z.string().max(2000).optional().nullable(),
    content: z.string().optional().nullable(),
    duration: z.string().max(100).optional().nullable(),
    difficulty: z.string().max(100).optional().nullable(),
    imageUrl: z.string().max(2000).optional().nullable(),
})

// GET — liste des recettes
export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const recipes = await prisma.recipe.findMany({
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(recipes)
    } catch (error) {
        console.error("Erreur API recipes (GET):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// POST — créer une recette
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const parsed = recipeSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const data = parsed.data
        const recipe = await prisma.recipe.create({
            data: {
                title: data.title,
                description: data.description || null,
                content: data.content || null,
                duration: data.duration || null,
                difficulty: data.difficulty || null,
                imageUrl: data.imageUrl || null,
            },
        })

        return NextResponse.json(recipe, { status: 201 })
    } catch (error) {
        console.error("Erreur API recipes (POST):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// PUT — modifier une recette
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

        const parsed = recipeSchema.partial().safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const data = parsed.data
        const recipe = await prisma.recipe.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description || null }),
                ...(data.content !== undefined && { content: data.content || null }),
                ...(data.duration !== undefined && { duration: data.duration || null }),
                ...(data.difficulty !== undefined && { difficulty: data.difficulty || null }),
                ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
            },
        })

        return NextResponse.json(recipe)
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Recette introuvable" }, { status: 404 })
        }
        console.error("Erreur API recipes (PUT):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// DELETE — supprimer une recette
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

        await prisma.recipe.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Recette introuvable" }, { status: 404 })
        }
        console.error("Erreur API recipes (DELETE):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
