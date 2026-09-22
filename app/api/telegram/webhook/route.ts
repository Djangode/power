import { NextResponse } from "next/server"

/**
 * L'ancien bot Telegram est volontairement désactivé. Les commandes sont consultables
 * depuis l'espace d'administration du site et envoyées à l'adresse de notification.
 */
export async function POST() {
    return NextResponse.json({ error: "Intégration désactivée" }, { status: 410 })
}
