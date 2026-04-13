import { Resend } from "resend"

const FROM_EMAIL = "Power Primeur <noreply@powerprimeur.com>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function emailWrapper(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
      <div style="max-width: 600px; margin: 0 auto; background: #111; border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -0.5px;">POWER</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px;">Primeur — Frais & Local</p>
        </div>
        <!-- Content -->
        <div style="padding: 32px 24px;">
          ${content}
        </div>
        <!-- Footer -->
        <div style="padding: 20px 24px; border-top: 1px solid #222; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #555;">Power — Primeur | 114 Rue Paul Vaillant Couturier, 94140 Alfortville</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #444;">
            <a href="${APP_URL}" style="color: #f97316; text-decoration: none;">powerprimeur.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function sendOrderConfirmation(email: string, orderId: string, total: number, deliveryMethod?: string, pickupCode?: string | null) {
  try {
    const orderNumber = `CMD-${orderId.slice(-6).toUpperCase()}`
    const isPickup = deliveryMethod === "retrait"

    const pickupSection = isPickup && pickupCode ? `
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
        <p style="margin: 0 0 4px; font-size: 11px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px;">Code de retrait</p>
        <p style="margin: 0; font-size: 32px; font-weight: 900; color: #fff; letter-spacing: 8px;">${pickupCode}</p>
        <p style="margin: 8px 0 0; font-size: 12px; color: rgba(255,255,255,0.7);">Présentez ce code en magasin</p>
      </div>
    ` : ""

    const content = `
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 900; color: #fff;">Commande confirmée !</h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #999; line-height: 1.5;">
        Merci pour votre commande <strong style="color: #f97316;">${orderNumber}</strong>.
        Votre paiement de <strong style="color: #fff;">${total.toFixed(2)}€</strong> a été validé.
      </p>

      ${pickupSection}

      <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Prochaine étape</p>
        <p style="margin: 0; font-size: 14px; color: #ccc; line-height: 1.5;">
          ${isPickup
            ? "Nos équipes préparent votre commande. Elle sera disponible sous 2h en magasin."
            : "Nos équipes préparent vos produits frais. Vous recevrez un email dès l'expédition."
          }
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${APP_URL}/commandes/${orderId}" style="display: inline-block; background: #f97316; color: #fff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Suivre ma commande
        </a>
      </div>
    `

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Commande ${orderNumber} confirmée`,
      html: emailWrapper(content),
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
      to: "contact@powerprimeur.com",
      subject: `Nouveau message de contact: ${subject || "Sans objet"}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Nouveau message de contact</h2>
          <p><strong>De :</strong> ${name} (${email})</p>
          <p><strong>Sujet :</strong> ${subject || "Non spécifié"}</p>
          <hr/>
          <p>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br/>")}</p>
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
    const content = `
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 900; color: #fff;">Bienvenue ${firstName} !</h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #999; line-height: 1.5;">
        Votre compte Power a été créé avec succès. Découvrez nos produits frais, biologiques et locaux.
      </p>

      <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #ccc; line-height: 1.5;">
          Produits sélectionnés chaque matin, livrés chez vous en 24h ou disponibles en retrait magasin.
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${APP_URL}/produits" style="display: inline-block; background: #f97316; color: #fff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Découvrir nos produits
        </a>
      </div>
    `

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Bienvenue chez Power !",
      html: emailWrapper(content),
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur envoi email bienvenue:", error)
    return { success: false, error }
  }
}

export async function sendOrderStatusUpdate(email: string, orderId: string, status: string, trackingNumber?: string) {
  const statusConfig: Record<string, { label: string; message: string; emoji: string }> = {
    validated: {
      label: "validée",
      message: "Votre commande a été validée et sera bientôt préparée par nos équipes.",
      emoji: "✓",
    },
    processing: {
      label: "en préparation",
      message: "Nos équipes préparent vos produits frais avec soin.",
      emoji: "📦",
    },
    shipped: {
      label: "expédiée",
      message: "Votre commande est en route ! Elle arrivera sous 24-48h.",
      emoji: "🚚",
    },
    delivered: {
      label: "livrée",
      message: "Votre commande a été livrée. Bon appétit !",
      emoji: "✓",
    },
    cancelled: {
      label: "annulée",
      message: "Votre commande a été annulée. Si vous avez des questions, contactez-nous.",
      emoji: "✗",
    },
  }

  const config = statusConfig[status] || { label: status, message: "", emoji: "•" }
  const orderNumber = `CMD-${orderId.slice(-6).toUpperCase()}`

  try {
    const trackingSection = trackingNumber ? `
      <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Numéro de suivi</p>
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #f97316;">${trackingNumber}</p>
      </div>
    ` : ""

    const content = `
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 900; color: #fff;">Mise à jour de commande</h2>
      <p style="margin: 0 0 16px; font-size: 15px; color: #999;">
        Votre commande <strong style="color: #f97316;">${orderNumber}</strong> est maintenant <strong style="color: #fff;">${config.label}</strong>.
      </p>

      <div style="background: linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%); border: 1px solid rgba(249,115,22,0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #ccc; line-height: 1.5;">${config.message}</p>
      </div>

      ${trackingSection}

      <div style="text-align: center; margin-top: 24px;">
        <a href="${APP_URL}/commandes/${orderId}" style="display: inline-block; background: #f97316; color: #fff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Suivre ma commande
        </a>
      </div>
    `

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Commande ${orderNumber} — ${config.label}`,
      html: emailWrapper(content),
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur envoi mise à jour commande:", error)
    return { success: false, error }
  }
}

export async function sendPickupReadyEmail(email: string, orderId: string, pickupCode: string) {
  try {
    const orderNumber = `CMD-${orderId.slice(-6).toUpperCase()}`

    const content = `
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 900; color: #fff;">Commande prête !</h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #999; line-height: 1.5;">
        Votre commande <strong style="color: #f97316;">${orderNumber}</strong> est prête à être retirée en magasin.
      </p>

      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
        <p style="margin: 0 0 4px; font-size: 11px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px;">Code de retrait</p>
        <p style="margin: 0; font-size: 36px; font-weight: 900; color: #fff; letter-spacing: 8px;">${pickupCode}</p>
      </div>

      <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 4px; font-size: 13px; font-weight: bold; color: #fff;">Power — Primeur</p>
        <p style="margin: 0; font-size: 13px; color: #999;">114 Rue Paul Vaillant Couturier, 94140 Alfortville</p>
        <p style="margin: 8px 0 0; font-size: 12px; color: #666;">Présentez votre code de retrait en caisse</p>
      </div>
    `

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Commande ${orderNumber} prête à retirer !`,
      html: emailWrapper(content),
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur envoi email retrait:", error)
    return { success: false, error }
  }
}

/**
 * Invitation employé à rejoindre la plateforme
 */
export async function sendTeamInvitation(email: string, firstName: string, role: string, tempPassword: string) {
  try {
    const roleLabels: Record<string, string> = {
      admin: "Administrateur",
      cashier: "Caissier",
      preparation: "Préparateur",
      delivery: "Livreur",
    }

    const content = `
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 900; color: #fff;">Bienvenue dans l'équipe !</h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #999; line-height: 1.5;">
        Bonjour <strong style="color: #fff;">${firstName}</strong>, vous avez été ajouté(e) à l'équipe Power en tant que
        <strong style="color: #f97316;">${roleLabels[role] || role}</strong>.
      </p>

      <div style="background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 12px; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Vos identifiants de connexion</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #ccc;">
          <strong style="color: #fff;">Email :</strong> ${email}
        </p>
        <p style="margin: 0; font-size: 14px; color: #ccc;">
          <strong style="color: #fff;">Mot de passe temporaire :</strong>
          <span style="background: #f97316; color: #fff; padding: 2px 10px; border-radius: 6px; font-weight: bold; letter-spacing: 1px;">${tempPassword}</span>
        </p>
      </div>

      <div style="background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #f97316; font-weight: bold;">⚠️ Changez votre mot de passe après votre première connexion.</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${APP_URL}/connexion" style="display: inline-block; background: #f97316; color: #fff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Se connecter
        </a>
      </div>
    `

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Vous êtes invité(e) à rejoindre Power !",
      html: emailWrapper(content),
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur envoi invitation employé:", error)
    return { success: false, error }
  }
}

/**
 * Résumé de facture après commande
 */
export async function sendInvoiceEmail(
  email: string,
  orderId: string,
  invoiceNumber: string,
  items: { name: string; quantity: number; price: number }[],
  subtotal: number,
  deliveryFee: number,
  discount: number,
  total: number,
  paymentMethod: string
) {
  try {
    const orderNumber = `CMD-${orderId.slice(-6).toUpperCase()}`

    const itemsRows = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px 0; color: #ccc; font-size: 13px; border-bottom: 1px solid #222;">${item.name}</td>
        <td style="padding: 8px 0; color: #999; font-size: 13px; text-align: center; border-bottom: 1px solid #222;">x${item.quantity}</td>
        <td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right; border-bottom: 1px solid #222;">${(item.price * item.quantity).toFixed(2)}€</td>
      </tr>
    `
      )
      .join("")

    const content = `
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 900; color: #fff;">Facture ${invoiceNumber}</h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #999;">
        Commande <strong style="color: #f97316;">${orderNumber}</strong> — Paiement : <strong style="color: #fff;">${paymentMethod}</strong>
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Produit</th>
            <th style="text-align: center; padding: 8px 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Qté</th>
            <th style="text-align: right; padding: 8px 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 13px; color: #999;">Sous-total</span>
          <span style="font-size: 13px; color: #fff;">${subtotal.toFixed(2)}€</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 13px; color: #999;">Livraison</span>
          <span style="font-size: 13px; color: ${deliveryFee === 0 ? "#22c55e" : "#fff"};">${deliveryFee === 0 ? "Gratuit" : deliveryFee.toFixed(2) + "€"}</span>
        </div>
        ${discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 13px; color: #22c55e;">Réduction</span>
          <span style="font-size: 13px; color: #22c55e;">-${discount.toFixed(2)}€</span>
        </div>
        ` : ""}
        <div style="border-top: 1px solid #333; padding-top: 12px; margin-top: 8px; display: flex; justify-content: space-between;">
          <span style="font-size: 16px; font-weight: 900; color: #fff;">Total TTC</span>
          <span style="font-size: 20px; font-weight: 900; color: #f97316;">${total.toFixed(2)}€</span>
        </div>
      </div>

      <p style="margin: 20px 0 0; font-size: 11px; color: #555; text-align: center;">
        POWER — SIRET 944 504 794 00016 — TVA non applicable, art. 293 B du CGI
      </p>
    `

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Facture ${invoiceNumber} — Power Primeur`,
      html: emailWrapper(content),
    })
    return { success: true }
  } catch (error) {
    console.error("Erreur envoi facture:", error)
    return { success: false, error }
  }
}

/**
 * Email marketing / newsletter depuis l'admin
 */
export async function sendMarketingEmail(emails: string[], subject: string, htmlContent: string) {
  try {
    const content = `
      <div style="font-size: 15px; color: #ccc; line-height: 1.6;">
        ${htmlContent}
      </div>
      <div style="text-align: center; margin-top: 32px;">
        <a href="${APP_URL}" style="display: inline-block; background: #f97316; color: #fff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Voir la boutique
        </a>
      </div>
      <p style="margin: 24px 0 0; font-size: 11px; color: #444; text-align: center;">
        Vous recevez cet email car vous êtes inscrit(e) chez Power Primeur.
        <a href="${APP_URL}/mon-compte" style="color: #f97316; text-decoration: none;">Se désinscrire</a>
      </p>
    `

    // Resend supporte l'envoi en batch (max 100 par appel)
    const batchSize = 50
    let sent = 0
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      await Promise.all(
        batch.map((to) =>
          getResend().emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html: emailWrapper(content),
          })
        )
      )
      sent += batch.length
    }

    return { success: true, sent }
  } catch (error) {
    console.error("Erreur envoi email marketing:", error)
    return { success: false, error }
  }
}
