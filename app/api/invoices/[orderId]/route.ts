import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

function generateInvoiceHTML(order: any, user: any) {
  const orderNumber = `CMD-${order.id.slice(-6).toUpperCase()}`
  const invoiceNumber = order.invoiceNumber || `FAC-${order.id.slice(-8).toUpperCase()}`
  const date = new Date(order.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const itemsRows = order.items
    .map((item: any) => {
      const name = item.product?.name || item.composition?.name || "Article"
      const unitPrice = item.priceAtPurchase
      const total = unitPrice * item.quantity
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${name}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">${unitPrice.toFixed(2)} €</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${total.toFixed(2)} €</td>
        </tr>
      `
    })
    .join("")

  const subtotal = order.items.reduce((sum: number, item: any) => sum + item.priceAtPurchase * item.quantity, 0)
  const deliveryFee = order.deliveryFee || 0

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Facture ${invoiceNumber}</title></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #111;">
      <div style="max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
          <div>
            <h1 style="font-size: 28px; font-weight: 900; color: #f97316; margin: 0;">POWER</h1>
            <p style="color: #666; margin: 4px 0 0;">Primeur — Produits frais & locaux</p>
            <p style="color: #666; margin: 2px 0;">114 Rue Paul Vaillant Couturier, 94140 Alfortville</p>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 24px; font-weight: 900; margin: 0; color: #111;">FACTURE</h2>
            <p style="color: #f97316; font-weight: bold; margin: 4px 0 0;">${invoiceNumber}</p>
            <p style="color: #666; margin: 2px 0;">Date : ${date}</p>
          </div>
        </div>

        <!-- Client Info -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
          <p style="font-weight: bold; margin: 0 0 4px;">Facturé à :</p>
          <p style="margin: 2px 0;">${user.firstName || ""} ${user.lastName || ""}</p>
          <p style="margin: 2px 0; color: #666;">${user.email}</p>
          ${user.address ? `<p style="margin: 2px 0; color: #666;">${user.address}, ${user.postalCode || ""} ${user.city || ""}</p>` : ""}
          ${user.phone ? `<p style="margin: 2px 0; color: #666;">${user.phone}</p>` : ""}
        </div>

        <!-- Order Reference -->
        <p style="color: #666; margin-bottom: 16px;">Référence commande : <strong>${orderNumber}</strong></p>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #111; color: #fff;">
              <th style="padding: 12px 16px; text-align: left; border-radius: 8px 0 0 0;">Article</th>
              <th style="padding: 12px 16px; text-align: center;">Qté</th>
              <th style="padding: 12px 16px; text-align: right;">Prix unit.</th>
              <th style="padding: 12px 16px; text-align: right; border-radius: 0 8px 0 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 280px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #666;">
              <span>Sous-total HT</span>
              <span>${subtotal.toFixed(2)} €</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #666;">
              <span>Livraison</span>
              <span>${deliveryFee === 0 ? "Gratuit" : deliveryFee.toFixed(2) + " €"}</span>
            </div>
            ${order.discount > 0 ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; color: #16a34a;">
              <span>Remise${order.promoCode ? ` (${order.promoCode})` : ""}</span>
              <span>-${order.discount.toFixed(2)} €</span>
            </div>` : ""}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #111; font-size: 18px; font-weight: 900;">
              <span>Total TTC</span>
              <span style="color: #f97316;">${order.total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px; text-align: center;">
          <p>Power — Primeur | 114 Rue Paul Vaillant Couturier, 94140 Alfortville</p>
          <p>Merci pour votre confiance !</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { orderId } = await params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: { select: { name: true } },
            composition: { select: { name: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
    }

    if (order.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Generate invoice number if not exists
    if (!order.invoiceNumber) {
      const invoiceNumber = `FAC-${Date.now().toString(36).toUpperCase()}-${order.id.slice(-4).toUpperCase()}`
      await prisma.order.update({
        where: { id: orderId },
        data: { invoiceNumber },
      })
      order.invoiceNumber = invoiceNumber
    }

    const html = generateInvoiceHTML(order, order.user)

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="facture-${order.invoiceNumber}.html"`,
      },
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
