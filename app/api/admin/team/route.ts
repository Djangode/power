import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { sendTeamInvitation } from "@/lib/email"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const employees = await prisma.user.findMany({
            where: {
                role: { in: ["admin", "cashier", "preparation", "delivery"] }
            },
            orderBy: { createdAt: 'desc' }
        })

        const formattedEmployees = employees.map((emp) => ({
            id: emp.id,
            firstName: emp.firstName || "Inconnu",
            lastName: emp.lastName || "Inconnu",
            email: emp.email,
            phone: emp.phone || "Non renseigné",
            role: emp.role,
            salary: emp.salary || 0,
            salaryType: emp.salaryType || "hourly",
            hoursPerWeek: emp.hoursPerWeek || 35,
            startDate: emp.createdAt.toISOString().split('T')[0],
            isActive: emp.isActive,
            permissions: {
                caisse: emp.role === 'cashier' || emp.role === 'admin',
                preparation: emp.role === 'preparation' || emp.role === 'admin',
                orders: emp.role === 'admin' || emp.role === 'cashier' || emp.role === 'preparation',
                products: emp.role === 'cashier' || emp.role === 'admin',
                customers: emp.role === 'cashier' || emp.role === 'admin'
            }
        }))

        return NextResponse.json(formattedEmployees)
    } catch (error) {
        console.error("API Admin Team:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}

const createEmployeeSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    phone: z.string().optional(),
    role: z.enum(["admin", "cashier", "preparation", "delivery"]),
    salary: z.number().optional(),
    salaryType: z.enum(["hourly", "monthly"]).optional(),
    hoursPerWeek: z.number().optional(),
})

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = createEmployeeSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const { password, ...rest } = parsed.data

        const existing = await prisma.user.findUnique({ where: { email: rest.email } })
        if (existing) {
            return NextResponse.json({ error: "Un utilisateur avec cet email existe déjà" }, { status: 409 })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const employee = await prisma.user.create({
            data: {
                ...rest,
                password: hashedPassword,
            }
        })

        // Envoyer l'email d'invitation avec les identifiants
        try {
            await sendTeamInvitation(
                employee.email,
                employee.firstName || rest.firstName,
                employee.role,
                password // Le mot de passe en clair avant le hash
            )
        } catch (emailError) {
            console.error("Erreur envoi email invitation:", emailError)
            // On ne bloque pas la création si l'email échoue
        }

        return NextResponse.json({
            success: true,
            data: {
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                role: employee.role,
            }
        }, { status: 201 })
    } catch (error) {
        console.error("API Admin Team POST:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
