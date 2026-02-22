import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") return new NextResponse("Unauthorized", { status: 401 })

        const { id } = await params

        const order = await prisma.order.findUnique({ where: { id } })
        if (!order) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
        }

        if (order.status !== "pending") {
            return NextResponse.json({ error: "Seules les commandes en attente peuvent être validées" }, { status: 400 })
        }

        const updated = await prisma.order.update({
            where: { id },
            data: { status: "validated" }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Erreur validation commande:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
