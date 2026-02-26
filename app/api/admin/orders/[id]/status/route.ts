import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { sendOrderStatusUpdate, sendPickupReadyEmail } from "@/lib/email"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { id } = await params
        const body = await req.json()
        const { status } = body

        if (!status) {
            return new NextResponse("Bad Request", { status: 400 })
        }

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
