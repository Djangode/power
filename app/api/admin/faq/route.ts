import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

const faqSchema = z.object({
    question: z.string().min(1, "La question est requise").max(500),
    answer: z.string().min(1, "La réponse est requise"),
    order: z.union([z.number(), z.string()]).optional().transform((val) => {
        if (val === null || val === undefined || val === "") return 0
        const num = typeof val === "string" ? parseInt(val, 10) : val
        return isNaN(num) ? 0 : num
    }),
})

// GET — liste des FAQ
export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const faqs = await prisma.faq.findMany({
            orderBy: { order: "asc" },
        })

        return NextResponse.json(faqs)
    } catch (error) {
        console.error("Erreur API faq (GET):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// POST — créer une FAQ
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const parsed = faqSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const data = parsed.data
        const faq = await prisma.faq.create({
            data: {
                question: data.question,
                answer: data.answer,
                order: data.order ?? 0,
            },
        })

        return NextResponse.json(faq, { status: 201 })
    } catch (error) {
        console.error("Erreur API faq (POST):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// PUT — modifier une FAQ
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

        const parsed = faqSchema.partial().safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const data = parsed.data
        const faq = await prisma.faq.update({
            where: { id },
            data: {
                ...(data.question !== undefined && { question: data.question }),
                ...(data.answer !== undefined && { answer: data.answer }),
                ...(data.order !== undefined && { order: data.order }),
            },
        })

        return NextResponse.json(faq)
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Question introuvable" }, { status: 404 })
        }
        console.error("Erreur API faq (PUT):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// DELETE — supprimer une FAQ
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

        await prisma.faq.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Question introuvable" }, { status: 404 })
        }
        console.error("Erreur API faq (DELETE):", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
