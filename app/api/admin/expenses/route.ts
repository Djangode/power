import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

const expenseSchema = z.object({
    type: z.string().trim().min(1, "Le type est requis").max(100),
    description: z.string().trim().min(1, "La description est requise").max(500),
    amount: z.union([z.number(), z.string()]).transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val
        return num
    }).pipe(
        z.number({ message: "Montant invalide" })
            .finite("Montant invalide")
            .positive("Le montant doit être supérieur à 0")
    ),
    date: z.union([z.string(), z.number(), z.date()]).transform((val) => {
        const d = val instanceof Date ? val : new Date(val)
        return d
    }).refine((d) => !isNaN(d.getTime()), { message: "Date invalide" }),
    category: z.string().trim().max(100).optional().nullable(),
})

// GET : liste des charges (plus récentes en premier)
export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' },
        })

        return NextResponse.json(expenses)
    } catch (error) {
        console.error("Erreur API expenses (GET):", error)
        return NextResponse.json(
            { error: "Erreur interne du serveur" },
            { status: 500 }
        )
    }
}

// POST : création d'une charge
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { error: "Corps de requête invalide" },
                { status: 400 }
            )
        }

        const parsed = expenseSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            )
        }

        const data = parsed.data

        const expense = await prisma.expense.create({
            data: {
                type: data.type,
                description: data.description,
                amount: data.amount,
                date: data.date,
                category: data.category || null,
            },
        })

        return NextResponse.json(expense, { status: 201 })
    } catch (error) {
        console.error("Erreur API expenses (POST):", error)
        return NextResponse.json(
            { error: "Erreur interne du serveur" },
            { status: 500 }
        )
    }
}

// DELETE : suppression d'une charge via ?id=...
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const id = req.nextUrl.searchParams.get("id")
        if (!id) {
            return NextResponse.json(
                { error: "L'identifiant de la charge est requis" },
                { status: 400 }
            )
        }

        const existing = await prisma.expense.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json(
                { error: "Charge introuvable" },
                { status: 404 }
            )
        }

        await prisma.expense.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Erreur API expenses (DELETE):", error)
        return NextResponse.json(
            { error: "Erreur interne du serveur" },
            { status: 500 }
        )
    }
}
