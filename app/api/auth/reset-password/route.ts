import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { rateLimit, clientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
    try {
        const { token, uid, password } = await req.json().catch(() => ({}))

        if (typeof token !== "string" || typeof uid !== "string" || typeof password !== "string" || !token || !uid || !password) {
            return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
        }

        if (password.length < 8 || password.length > 72) {
            return NextResponse.json({ error: "Le mot de passe doit contenir entre 8 et 72 caractères" }, { status: 400 })
        }

        const rl = await rateLimit(`reset:${clientIp(req)}:${uid.slice(0, 64)}`, 10, 15 * 60_000)
        if (!rl.ok) return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 })

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
        const stored = typeof data.token === "string" && /^[a-f0-9]{64}$/i.test(data.token)
            ? Buffer.from(data.token, "hex")
            : null
        const incoming = Buffer.from(incomingHash, "hex")
        if (!stored || stored.length !== incoming.length || !crypto.timingSafeEqual(stored, incoming)) {
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
