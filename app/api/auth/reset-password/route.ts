import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
    try {
        const { token, uid, password } = await req.json()

        if (!token || !uid || !password) {
            return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères" }, { status: 400 })
        }

        // Verify token
        const setting = await prisma.siteSetting.findUnique({
            where: { key: `reset_${uid}` }
        })

        if (!setting) {
            return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 })
        }

        const data = JSON.parse(setting.value)

        if (data.token !== token) {
            return NextResponse.json({ error: "Lien invalide" }, { status: 400 })
        }

        if (new Date(data.expiry) < new Date()) {
            // Clean up expired token
            await prisma.siteSetting.delete({ where: { key: `reset_${uid}` } })
            return NextResponse.json({ error: "Ce lien a expiré. Veuillez refaire une demande." }, { status: 400 })
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 12)
        await prisma.user.update({
            where: { id: uid },
            data: { password: hashedPassword }
        })

        // Clean up token
        await prisma.siteSetting.delete({ where: { key: `reset_${uid}` } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error in reset password:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
