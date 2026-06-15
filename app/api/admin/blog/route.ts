import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

const blogSchema = z.object({
    title: z.string().min(1, "Le titre est requis").max(200),
    content: z.string().min(1, "Le contenu est requis"),
    excerpt: z.string().max(500).optional().nullable(),
    author: z.string().max(200).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    imageUrl: z.string().max(2000).optional().nullable(),
    published: z.boolean().optional(),
})

// GET — liste des articles
export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const posts = await prisma.blogPost.findMany({
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(posts)
    } catch (error) {
        console.error("Erreur API blog (GET):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// POST — créer un article
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const parsed = blogSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const data = parsed.data
        const post = await prisma.blogPost.create({
            data: {
                title: data.title,
                content: data.content,
                excerpt: data.excerpt || null,
                author: data.author || "Equipe Power",
                category: data.category || null,
                imageUrl: data.imageUrl || null,
                published: data.published ?? true,
            },
        })

        return NextResponse.json(post, { status: 201 })
    } catch (error) {
        console.error("Erreur API blog (POST):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// PUT — modifier un article
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

        const parsed = blogSchema.partial().safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const data = parsed.data
        const post = await prisma.blogPost.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.content !== undefined && { content: data.content }),
                ...(data.excerpt !== undefined && { excerpt: data.excerpt || null }),
                ...(data.author !== undefined && { author: data.author || "Equipe Power" }),
                ...(data.category !== undefined && { category: data.category || null }),
                ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
                ...(data.published !== undefined && { published: data.published }),
            },
        })

        return NextResponse.json(post)
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Article introuvable" }, { status: 404 })
        }
        console.error("Erreur API blog (PUT):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// DELETE — supprimer un article
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

        await prisma.blogPost.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Article introuvable" }, { status: 404 })
        }
        console.error("Erreur API blog (DELETE):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
