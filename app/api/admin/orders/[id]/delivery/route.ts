import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { NextResponse } from "next/server"

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
                carrier,
                trackingNumber,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                deliverySlot: deliverySlot || null,
                status: "shipped"
            }
        })

        return NextResponse.json({ success: true, data: updatedOrder })
    } catch (error) {
        console.error("Error updating delivery info:", error)
        return NextResponse.json({ success: false, error: "Failed to update delivery info" }, { status: 500 })
    }
}
