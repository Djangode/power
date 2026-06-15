"use server"

import { prisma } from "@/lib/db"

export async function getAvailableDeliverySlots(startDate: string, endDate: string) {
    try {
        // Fenêtre couvrant toute(s) la(les) journée(s) demandée(s).
        // Les créneaux sont stockés à minuit UTC ; on requête [début 00:00 UTC, fin 23:59:59 UTC]
        // pour ne pas rater de créneau à cause d'une largeur de fenêtre nulle.
        const start = new Date(`${startDate}T00:00:00.000Z`)
        const end = new Date(`${endDate}T23:59:59.999Z`)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return { success: false, data: [] }
        }

        const slots = await prisma.deliverySlot.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end,
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
