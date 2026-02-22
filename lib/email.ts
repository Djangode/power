import { Resend } from "resend"

const FROM_EMAIL = "Power <noreply@power-primeur.com>"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendOrderConfirmation(email: string, orderId: string, total: number) {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Confirmation de commande #${orderId.slice(-6).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #000; color: #fff;">
          <h1 style="color: #f97316;">Merci de votre confiance !</h1>
          <p style="color: #ccc;">Votre commande d'un montant total de <strong>${total.toFixed(2)}€</strong> a été parfaitement validée.</p>
          <p style="color: #ccc;">Nos équipes préparent vos produits frais dès maintenant.</p>
          <p style="color: #ccc;">À très vite,<br/>L'équipe Power.</p>
        </div>
      `
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur Resend:", error)
    return { success: false, error }
  }
}

export async function sendContactNotification(name: string, email: string, subject: string, message: string) {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: "contact@power-primeur.com",
      subject: `Nouveau message de contact: ${subject || "Sans objet"}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Nouveau message de contact</h2>
          <p><strong>De :</strong> ${name} (${email})</p>
          <p><strong>Sujet :</strong> ${subject || "Non spécifié"}</p>
          <hr/>
          <p>${message.replace(/\n/g, "<br/>")}</p>
        </div>
      `
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur envoi notification contact:", error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail(email: string, firstName: string) {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Bienvenue chez Power !",
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #000; color: #fff;">
          <h1 style="color: #f97316;">Bienvenue ${firstName} !</h1>
          <p style="color: #ccc;">Votre compte Power a été créé avec succès.</p>
          <p style="color: #ccc;">Découvrez nos produits frais, biologiques et locaux, livrés chez vous en 24h.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/produits" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Découvrir nos produits</a>
          <p style="color: #666; margin-top: 20px;">À très vite,<br/>L'équipe Power.</p>
        </div>
      `
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur envoi email bienvenue:", error)
    return { success: false, error }
  }
}

export async function sendOrderStatusUpdate(email: string, orderId: string, status: string) {
  const statusLabels: Record<string, string> = {
    validated: "validée",
    processing: "en préparation",
    shipped: "expédiée",
    delivered: "livrée",
    cancelled: "annulée",
  }

  const statusLabel = statusLabels[status] || status

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Votre commande #${orderId.slice(-6).toUpperCase()} est ${statusLabel}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #000; color: #fff;">
          <h1 style="color: #f97316;">Mise à jour de votre commande</h1>
          <p style="color: #ccc;">Votre commande <strong>#${orderId.slice(-6).toUpperCase()}</strong> est maintenant <strong>${statusLabel}</strong>.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/mon-compte" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Suivre ma commande</a>
          <p style="color: #666; margin-top: 20px;">L'équipe Power.</p>
        </div>
      `
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur envoi mise à jour commande:", error)
    return { success: false, error }
  }
}
