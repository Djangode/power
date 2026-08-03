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

        const previous = await prisma.order.findUnique({
            where: { id },
            select: { status: true },
        })
        if (!previous) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status },
            include: { user: true }
        })

        // Annulation : le stock décrémenté à la commande doit revenir en rayon, sinon chaque
        // annulation retire définitivement de la marchandise de l'inventaire.
        // La transition est testée sur l'ancien statut pour ne pas recréditer deux fois si
        // l'admin renvoie « cancelled » sur une commande déjà annulée.
        if (status === "cancelled" && previous.status !== "cancelled") {
            const items = await prisma.orderItem.findMany({
                where: { orderId: id, productId: { not: null } },
                include: { product: { select: { id: true, currentStock: true } } },
            })
            for (const item of items) {
                if (!item.product) continue
                await prisma.product.update({
                    where: { id: item.product.id },
                    data: {
                        currentStock: item.product.currentStock + item.quantity,
                        inStock: true,
                    },
                })
            }
        }

        // Email de changement de statut — non bloquant : le statut est déjà enregistré, une
        // panne Resend ferait croire à l'admin que sa mise à jour a échoué.
        if (updatedOrder.user?.email) {
            try {
                if (status === "processing" && updatedOrder.deliveryMethod === "retrait" && updatedOrder.pickupCode) {
                    // For click & collect, send pickup ready email
                    await sendPickupReadyEmail(updatedOrder.user.email, id, updatedOrder.pickupCode)
                } else {
                    await sendOrderStatusUpdate(updatedOrder.user.email, id, status)
                }
            } catch (emailError) {
                console.error("⚠️ Email de changement de statut échoué:", emailError)
            }
        }

        return NextResponse.json(updatedOrder)
    } catch (error) {
        console.error("Erreur update order status:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
