import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

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

        // Valeur corrompue → « lien invalide », pas un 500 générique qui inquiète l'utilisateur.
        let data: { token?: string; expiry?: string }
        try {
            data = JSON.parse(setting.value)
        } catch {
            return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 })
        }

        // On compare le HASH du token reçu à celui stocké (le clair n'est jamais en base).
        const incomingHash = crypto.createHash("sha256").update(token).digest("hex")
        if (data.token !== incomingHash) {
            return NextResponse.json({ error: "Lien invalide" }, { status: 400 })
        }

        if (!data.expiry || new Date(data.expiry) < new Date()) {
            // Clean up expired token
            await prisma.siteSetting.delete({ where: { key: `reset_${uid}` } })
            return NextResponse.json({ error: "Ce lien a expiré. Veuillez refaire une demande." }, { status: 400 })
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 12)
        // passwordChangedAt : coupe les sessions (JWT) émises avant ce reset — un attaquant
        // qui aurait une session ouverte la perd à la prochaine revalidation.
        await prisma.user.update({
            where: { id: uid },
            data: { password: hashedPassword, passwordChangedAt: new Date() }
        })

        // Clean up token
        await prisma.siteSetting.delete({ where: { key: `reset_${uid}` } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error in reset password:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
