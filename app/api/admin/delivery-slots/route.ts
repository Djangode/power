import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

// GET all delivery slots
export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const slots = await prisma.deliverySlot.findMany({
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        })

        return NextResponse.json(slots.map(slot => ({
            ...slot,
            date: slot.date.toISOString().split('T')[0],
        })))
    } catch (error) {
        console.error("Error fetching delivery slots:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// POST create a new delivery slot
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const { date, startTime, endTime, maxOrders, isActive } = body

        if (!date || !startTime || !endTime) {
            return NextResponse.json({ error: "date, startTime, endTime requis" }, { status: 400 })
        }

        const slot = await prisma.deliverySlot.create({
            data: {
                date: new Date(date),
                startTime,
                endTime,
                maxOrders: maxOrders || 10,
                isActive: isActive !== false,
            }
        })

        return NextResponse.json(slot)
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ error: "Ce créneau existe déjà pour cette date" }, { status: 409 })
        }
        console.error("Error creating delivery slot:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// DELETE a delivery slot
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

        await prisma.deliverySlot.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting delivery slot:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// PUT update a delivery slot
export async function PUT(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const { id, date, startTime, endTime, maxOrders, isActive } = body

        if (!id) {
            return NextResponse.json({ error: "id requis" }, { status: 400 })
        }

        const slot = await prisma.deliverySlot.update({
            where: { id },
            data: {
                ...(date && { date: new Date(date) }),
                ...(startTime && { startTime }),
                ...(endTime && { endTime }),
                ...(maxOrders !== undefined && { maxOrders }),
                ...(isActive !== undefined && { isActive }),
            }
        })

        return NextResponse.json(slot)
    } catch (error) {
        console.error("Error updating delivery slot:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
