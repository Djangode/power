import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getInvoiceSettings, type InvoiceSettings } from "@/app/actions/content"
import { nextInvoiceNumber } from "@/lib/invoice"

/**
 * Échappe une valeur avant insertion dans le HTML de la facture.
 * Nom, adresse et intitulés proviennent de saisies libres : sans échappement, un client
 * peut injecter du script dans un document que le commerçant ouvrira dans son navigateur.
 */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function generateInvoiceHTML(order: any, user: any, settings: InvoiceSettings) {
  const orderNumber = `CMD-${order.id.slice(-6).toUpperCase()}`
  const invoiceNumber = order.invoiceNumber || `FAC-${order.id.slice(-8).toUpperCase()}`
  const date = new Date(order.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const itemsRows = order.items
    .map((item: any) => {
      const name = esc(item.product?.name || item.composition?.name || "Article")
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

  // Les prix du catalogue sont affichés TTC : la base HT et la TVA se déduisent du total.
  const assujetti = settings.vatRegime === "assujetti"
  const totalTTC = order.total
  const baseHT = assujetti ? totalTTC / (1 + settings.vatRate / 100) : totalTTC
  const montantTVA = totalTTC - baseHT

  const vatBlock = assujetti
    ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; color: #666;">
         <span>Total HT</span><span>${baseHT.toFixed(2)} €</span>
       </div>
       <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #666;">
         <span>TVA ${settings.vatRate.toFixed(1).replace(".", ",")} %</span><span>${montantTVA.toFixed(2)} €</span>
       </div>`
    : `<div style="padding: 8px 0; color: #666; font-size: 13px;">
         TVA non applicable, art. 293 B du CGI
       </div>`

  const legalLines = [
    settings.legalName + (settings.legalForm ? ` — ${settings.legalForm}` : ""),
    settings.address,
    settings.siret ? `SIRET : ${settings.siret}` : "",
    settings.rcs ? `RCS : ${settings.rcs}` : "",
    assujetti && settings.vatNumber ? `TVA intracommunautaire : ${settings.vatNumber}` : "",
    settings.phone ? `Tél. : ${settings.phone}` : "",
    settings.email,
  ]
    .filter(Boolean)
    .map((line) => `<p style="margin: 2px 0;">${esc(line)}</p>`)
    .join("")

  // Un défaut de mention obligatoire est signalé sur le document : le commerçant doit le voir
  // avant de le transmettre à un client ou à son comptable.
  const complianceWarning = settings.missing.length
    ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; color: #92400e; font-size: 13px;">
         <strong>Facture incomplète.</strong> Mentions légales obligatoires manquantes :
         ${esc(settings.missing.join(", "))}. À renseigner dans Admin → Réglages.
       </div>`
    : ""

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Facture ${invoiceNumber}</title></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #111;">
      <div style="max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
          <div style="color: #666; font-size: 13px;">
            <h1 style="font-size: 28px; font-weight: 900; color: #f97316; margin: 0 0 6px;">POWER</h1>
            ${legalLines}
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 24px; font-weight: 900; margin: 0; color: #111;">FACTURE</h2>
            <p style="color: #f97316; font-weight: bold; margin: 4px 0 0;">${esc(invoiceNumber)}</p>
            <p style="color: #666; margin: 2px 0;">Date : ${esc(date)}</p>
          </div>
        </div>

        ${complianceWarning}

        <!-- Client Info -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
          <p style="font-weight: bold; margin: 0 0 4px;">Facturé à :</p>
          <p style="margin: 2px 0;">${esc(user.firstName || "")} ${esc(user.lastName || "")}</p>
          <p style="margin: 2px 0; color: #666;">${esc(user.email)}</p>
          ${user.address ? `<p style="margin: 2px 0; color: #666;">${esc(user.address)}, ${esc(user.postalCode || "")} ${esc(user.city || "")}</p>` : ""}
          ${user.phone ? `<p style="margin: 2px 0; color: #666;">${esc(user.phone)}</p>` : ""}
        </div>

        <!-- Order Reference -->
        <p style="color: #666; margin-bottom: 16px;">Référence commande : <strong>${esc(orderNumber)}</strong></p>

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
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #666;">
              <span>Sous-total</span>
              <span>${subtotal.toFixed(2)} €</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #666;">
              <span>Livraison</span>
              <span>${deliveryFee === 0 ? "Gratuit" : deliveryFee.toFixed(2) + " €"}</span>
            </div>
            ${order.discount > 0 ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; color: #16a34a;">
              <span>Remise${order.promoCode ? ` (${esc(order.promoCode)})` : ""}</span>
              <span>-${order.discount.toFixed(2)} €</span>
            </div>` : ""}
            ${vatBlock}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #111; font-size: 18px; font-weight: 900;">
              <span>Total TTC</span>
              <span style="color: #f97316;">${totalTTC.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <!-- Conditions de paiement (art. L441-9 du code de commerce) -->
        <div style="margin-top: 32px; color: #666; font-size: 12px; line-height: 1.6;">
          <p style="margin: 2px 0;"><strong>Conditions de règlement :</strong> ${esc(settings.paymentTerms)}</p>
          <p style="margin: 2px 0;">
            En cas de retard de paiement, pénalités au taux de 3 fois le taux d'intérêt légal,
            majorées d'une indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 du code de commerce).
          </p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px; text-align: center;">
          <p>${esc(settings.legalName)} | ${esc(settings.address)}</p>
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

    // Numéro de facture attribué à la création de la commande. S'il manque (commande
    // antérieure à cette règle), on en attribue un plutôt que de servir un document sans
    // référence — la numérotation séquentielle est assurée par nextInvoiceNumber().
    if (!order.invoiceNumber) {
      const invoiceNumber = await nextInvoiceNumber()
      await prisma.order.update({
        where: { id: orderId },
        data: { invoiceNumber },
      })
      order.invoiceNumber = invoiceNumber
    }

    const settings = await getInvoiceSettings()
    const html = generateInvoiceHTML(order, order.user, settings)

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
