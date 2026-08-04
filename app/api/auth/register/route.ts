import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { sendWelcomeEmail } from "@/lib/email"

const registerSchema = z.object({
    // L'email est normalisé dès la validation : sans cela « Jean@x.fr » et « jean@x.fr »
    // créent deux comptes distincts, et le second login échoue silencieusement.
    email: z.string().email("Email invalide").transform((v) => v.trim().toLowerCase()),
    // .max(72) : bcrypt ignore silencieusement au-delà de 72 octets — on borne pour éviter
    // l'ambiguïté (un mot de passe tronqué qui "marche" avec seulement ses 72 premiers octets).
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères").max(72, "Mot de passe trop long (72 caractères max)"),
    // .trim() AVANT .min(1) : sinon un prénom composé uniquement d'espaces passe la validation
    // puis est vidé, et une chaîne vide finit en base malgré la règle "requis".
    firstName: z.string().trim().min(1, "Le prénom est requis"),
    lastName: z.string().trim().min(1, "Le nom est requis"),
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

        let user
        try {
            user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    role: "user",
                }
            })
        } catch (createError) {
            // Course entre le findUnique ci-dessus et ce create (double-clic, deux onglets) :
            // la contrainte @unique sur l'email lève P2002. On renvoie un 409 clair plutôt
            // qu'un 500 générique.
            if (
                typeof createError === "object" &&
                createError !== null &&
                (createError as { code?: string }).code === "P2002"
            ) {
                return NextResponse.json(
                    { error: "Un compte avec cet email existe déjà" },
                    { status: 409 }
                )
            }
            throw createError
        }

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
