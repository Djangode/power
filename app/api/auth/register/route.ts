import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { sendWelcomeEmail } from "@/lib/email"

const registerSchema = z.object({
    // L'email est normalisé dès la validation : sans cela « Jean@x.fr » et « jean@x.fr »
    // créent deux comptes distincts, et le second login échoue silencieusement.
    email: z.string().email("Email invalide").transform((v) => v.trim().toLowerCase()),
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
    firstName: z.string().min(1, "Le prénom est requis").transform((v) => v.trim()),
    lastName: z.string().min(1, "Le nom est requis").transform((v) => v.trim()),
})

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const parsed = registerSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            )
        }

        const { email, password, firstName, lastName } = parsed.data

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "Un compte avec cet email existe déjà" },
                { status: 409 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: "user",
            }
        })

        // Email de bienvenue — non bloquant : le compte est déjà créé, une panne Resend
        // ne doit pas transformer une inscription réussie en erreur côté client.
        try {
            await sendWelcomeEmail(user.email, user.firstName || "")
        } catch (emailError) {
            console.error("⚠️ Email de bienvenue échoué:", emailError)
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            }
        }, { status: 201 })
    } catch (error) {
        console.error("Register error:", error)
        return NextResponse.json(
            { error: "Erreur lors de l'inscription" },
            { status: 500 }
        )
    }
}
