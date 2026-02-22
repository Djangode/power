"use server"

import { prisma } from "@/lib/db"

export async function getAvailableDeliverySlots(startDate: string, endDate: string) {
    try {
        const slots = await prisma.deliverySlot.findMany({
            where: {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
                isActive: true,
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        })

        const available = slots.filter(slot => slot.currentOrders < slot.maxOrders)

        return {
            success: true,
            data: available.map(slot => ({
                id: slot.id,
                date: slot.date.toISOString().split('T')[0],
                startTime: slot.startTime,
                endTime: slot.endTime,
                remainingSlots: slot.maxOrders - slot.currentOrders,
            }))
        }
    } catch (error) {
        console.error("Error fetching delivery slots:", error)
        return { success: false, data: [] }
    }
}

export async function reserveDeliverySlot(slotId: string) {
    try {
        const slot = await prisma.deliverySlot.findUnique({ where: { id: slotId } })

        if (!slot || !slot.isActive) {
            return { success: false, error: "Créneau indisponible" }
        }

        if (slot.currentOrders >= slot.maxOrders) {
            return { success: false, error: "Ce créneau est complet" }
        }

        await prisma.deliverySlot.update({
            where: { id: slotId },
            data: { currentOrders: { increment: 1 } }
        })

        return { success: true }
    } catch (error) {
        console.error("Error reserving delivery slot:", error)
        return { success: false, error: "Erreur lors de la réservation" }
    }
}
