import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { sendOrderStatusUpdate, sendPickupReadyEmail } from "@/lib/email"
import { z } from "zod"

const VALID_STATUSES = ["pending", "validated", "processing", "shipped", "delivered", "cancelled"] as const

const statusSchema = z.object({
    status: z.enum(VALID_STATUSES, {
        errorMap: () => ({ message: `Statut invalide. Valeurs autorisées : ${VALID_STATUSES.join(", ")}` }),
    }),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { id } = await params
        const body = await req.json()
        const parsed = statusSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            )
        }

        const { status } = parsed.data

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status },
            include: { user: true }
        })

        // Send status update email
        if (updatedOrder.user?.email) {
            if (status === "processing" && updatedOrder.deliveryMethod === "retrait" && updatedOrder.pickupCode) {
                // For click & collect, send pickup ready email
                await sendPickupReadyEmail(updatedOrder.user.email, id, updatedOrder.pickupCode)
            } else {
                await sendOrderStatusUpdate(updatedOrder.user.email, id, status)
            }
        }

        return NextResponse.json(updatedOrder)
    } catch (error) {
        console.error("Erreur update order status:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
