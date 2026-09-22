import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { sendTeamInvitation } from "@/lib/email"
import crypto from "crypto"
import bcrypt from "bcryptjs"

/**
 * POST — Envoyer une invitation email à un employé existant
 * Génère un mot de passe temporaire et envoie un deeplink vers /admin
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const { employeeId } = await req.json()

        if (!employeeId) {
            return NextResponse.json({ error: "employeeId requis" }, { status: 400 })
        }

        const employee = await prisma.user.findUnique({
            where: { id: employeeId }
        })

        if (!employee) {
            return NextResponse.json({ error: "Employé introuvable" }, { status: 404 })
        }

        if (employee.role === "admin") {
            return NextResponse.json({ error: "Le mot de passe propriétaire ne peut pas être réinitialisé depuis l'équipe" }, { status: 403 })
        }

        // Générer un mot de passe temporaire
        const tempPassword = crypto.randomBytes(4).toString("hex") + "A1!" // Ex: "a3f2b1c8A1!"

        // Hasher et mettre à jour le mot de passe en base
        const hashedPassword = await bcrypt.hash(tempPassword, 12)
        await prisma.user.update({
            where: { id: employeeId },
            data: { password: hashedPassword }
        })

        // Envoyer l'email d'invitation
        const result = await sendTeamInvitation(
            employee.email,
            employee.firstName || "Collègue",
            employee.role,
            tempPassword
        )

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Invitation envoyée à ${employee.email}`,
            })
        } else {
            return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 })
        }
    } catch (error) {
        console.error("API Invite error:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
