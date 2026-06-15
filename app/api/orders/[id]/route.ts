import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { name: true, price: true, image: true } },
            composition: { select: { name: true, basePrice: true, imageUrl: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
    }

    // Only allow the order owner or admin to view
    if (order.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: `CMD-${order.id.slice(-6).toUpperCase()}`,
      total: order.total,
      status: order.status,
      deliveryMethod: order.deliveryMethod,
      deliveryDate: order.deliveryDate?.toISOString() || null,
      deliverySlot: order.deliverySlot,
      deliveryAddress: order.deliveryAddress,
      deliveryCity: order.deliveryCity,
      deliveryPostalCode: order.deliveryPostalCode,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      promoCode: order.promoCode,
      phone: order.phone,
      pickupCode: order.pickupCode,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      invoiceNumber: order.invoiceNumber,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        name: item.product?.name || item.composition?.name || "Article",
        quantity: item.quantity,
        price: item.priceAtPurchase,
        image: item.product?.image || item.composition?.imageUrl || null,
        customData: item.customData,
      })),
    })
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
