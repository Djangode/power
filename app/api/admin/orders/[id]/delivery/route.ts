import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { sendOrderStatusUpdate } from "@/lib/email"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { carrier, trackingNumber, deliveryDate, deliverySlot } = body

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                carrier: carrier || null,
                trackingNumber: trackingNumber || null,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
                deliverySlot: deliverySlot || undefined,
                status: "shipped"
            },
            include: { user: true }
        })

        // Send shipping notification email
        if (updatedOrder.user?.email) {
            await sendOrderStatusUpdate(updatedOrder.user.email, id, "shipped", trackingNumber)
        }

        return NextResponse.json({ success: true, data: updatedOrder })
    } catch (error) {
        console.error("Error updating delivery info:", error)
        return NextResponse.json({ success: false, error: "Failed to update delivery info" }, { status: 500 })
    }
}
