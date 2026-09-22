"use server"

import { prisma } from "@/lib/db"

export async function getAvailableDeliverySlots(
    startDate: string,
    endDate: string,
    // En retrait (Click & Collect), le client vient au magasin : il n'occupe pas une place de
    // livraison. On ne filtre donc pas sur la capacité et on propose tous les créneaux actifs.
    mode: "livraison" | "retrait" = "livraison",
) {
    try {
        // Fenêtre couvrant toute(s) la(les) journée(s) demandée(s).
        // Les créneaux sont stockés à minuit UTC ; on requête [début 00:00 UTC, fin 23:59:59 UTC]
        // pour ne pas rater de créneau à cause d'une largeur de fenêtre nulle.
        const start = new Date(`${startDate}T00:00:00.000Z`)
        const end = new Date(`${endDate}T23:59:59.999Z`)
        const rangeMs = end.getTime() - start.getTime()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
            || isNaN(start.getTime()) || isNaN(end.getTime()) || rangeMs < 0 || rangeMs > 31 * 24 * 60 * 60 * 1000) {
            return { success: false, data: [] }
        }

        const range = { date: { gte: start, lte: end }, isActive: true }
        const order = [{ date: 'asc' as const }, { startTime: 'asc' as const }]

        let slots
        if (mode === "retrait") {
            // Créneaux de RETRAIT dédiés en priorité.
            slots = await prisma.deliverySlot.findMany({ where: { ...range, type: "retrait" }, orderBy: order })
            // À défaut, on réutilise les créneaux de livraison pour l'horaire (sans consommer
            // leur capacité) : évite de bloquer le retrait les jours sans créneau de retrait.
            if (!slots.length) {
                slots = await prisma.deliverySlot.findMany({ where: { ...range, type: "livraison" }, orderBy: order })
            }
        } else {
            slots = await prisma.deliverySlot.findMany({ where: { ...range, type: "livraison" }, orderBy: order })
        }

        // Livraison : seulement les créneaux non complets. Retrait : tous (pas de quota).
        const available = mode === "retrait" ? slots : slots.filter(slot => slot.currentOrders < slot.maxOrders)

        return {
            success: true,
            data: available.map(slot => ({
                id: slot.id,
                date: slot.date.toISOString().split('T')[0],
                startTime: slot.startTime,
                endTime: slot.endTime,
                // En retrait, la capacité n'a pas de sens : on renvoie une valeur positive pour
                // que le créneau soit toujours proposé.
                remainingSlots: mode === "retrait" ? 1 : slot.maxOrders - slot.currentOrders,
            }))
        }
    } catch (error) {
        console.error("Error fetching delivery slots:", error)
        return { success: false, data: [] }
    }
}
