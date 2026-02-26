import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: { stripeSessionId: sessionId },
      include: {
        items: {
          include: {
            product: { select: { name: true, price: true, image: true } },
            composition: { select: { name: true, basePrice: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: `CMD-${order.id.slice(-6).toUpperCase()}`,
      total: order.total,
      deliveryMethod: order.deliveryMethod,
      deliveryDate: order.deliveryDate?.toISOString() || null,
      deliverySlot: order.deliverySlot,
      deliveryAddress: order.deliveryAddress,
      deliveryCity: order.deliveryCity,
      deliveryPostalCode: order.deliveryPostalCode,
      deliveryFee: order.deliveryFee,
      pickupCode: order.pickupCode,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        name: item.product?.name || item.composition?.name || "Article",
        quantity: item.quantity,
        price: item.priceAtPurchase,
      })),
    })
  } catch (error) {
    console.error("Error fetching order by session:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
