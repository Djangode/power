import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") return new NextResponse("Unauthorized", { status: 401 })

        const { id } = await params
        const { stock } = await req.json()
        const stockValue = parseInt(stock)

        const updated = await prisma.product.update({
            where: { id },
            data: {
                currentStock: stockValue,
                inStock: stockValue > 0,
            }
        })
        return NextResponse.json(updated)
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
