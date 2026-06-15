import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

// Jours de livraison : Mardi(2) → Samedi(6)
const DELIVERY_DAYS = [2, 3, 4, 5, 6] // 0=Dim, 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam
const START_HOUR = 9
const END_HOUR = 17
const MAX_ORDERS_PER_SLOT = 10
const WEEKS_AHEAD = 4 // Générer 4 semaines à l'avance

function getDayName(day: number): string {
    const names = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    return names[day]
}

/**
 * POST — Génération automatique des créneaux de livraison
 * Mardi → Samedi, 9h → 17h, créneaux d'1h
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const weeksAhead = body.weeksAhead || WEEKS_AHEAD

        // Aujourd'hui à minuit UTC — les créneaux sont stockés à minuit UTC, de façon
        // indépendante du fuseau du serveur (cohérent avec la requête côté client).
        const now = new Date()
        const startUTCms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

        let created = 0
        let skipped = 0

        // Parcourir chaque jour sur N semaines
        for (let dayOffset = 0; dayOffset < weeksAhead * 7; dayOffset++) {
            const date = new Date(startUTCms + dayOffset * 86_400_000)

            const dayOfWeek = date.getUTCDay()

            // Sauter les jours hors planning (dimanche + lundi)
            if (!DELIVERY_DAYS.includes(dayOfWeek)) continue

            // Générer les créneaux horaires pour cette journée
            for (let hour = START_HOUR; hour < END_HOUR; hour++) {
                const startTime = `${String(hour).padStart(2, "0")}:00`
                const endTime = `${String(hour + 1).padStart(2, "0")}:00`

                // Vérifier si le créneau existe déjà (éviter les doublons)
                const existing = await prisma.deliverySlot.findFirst({
                    where: {
                        date,
                        startTime,
                    }
                })

                if (existing) {
                    skipped++
                    continue
                }

                await prisma.deliverySlot.create({
                    data: {
                        date,
                        startTime,
                        endTime,
                        maxOrders: MAX_ORDERS_PER_SLOT,
                        isActive: true,
                    }
                })
                created++
            }
        }

        return NextResponse.json({
            success: true,
            message: `${created} créneaux créés, ${skipped} déjà existants`,
            created,
            skipped,
            planning: `${getDayName(DELIVERY_DAYS[0])} → ${getDayName(DELIVERY_DAYS[DELIVERY_DAYS.length - 1])}, ${START_HOUR}h-${END_HOUR}h`,
            semaines: weeksAhead,
        })
    } catch (error) {
        console.error("Auto-generate slots error:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}

/**
 * DELETE — Supprimer tous les créneaux futurs (reset)
 */
export async function DELETE() {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Récupérer les créneaux futurs sans commandes
        const futureSlots = await prisma.deliverySlot.findMany({
            where: {
                date: { gte: today },
                currentOrders: 0,
            }
        })

        let deleted = 0
        for (const slot of futureSlots) {
            await prisma.deliverySlot.delete({ where: { id: slot.id } })
            deleted++
        }

        return NextResponse.json({
            success: true,
            message: `${deleted} créneaux vides supprimés`,
            deleted,
        })
    } catch (error) {
        console.error("Delete future slots error:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
