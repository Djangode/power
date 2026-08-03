import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

/**
 * Formats et ingrédients d'une composition.
 *
 * L'écriture remplace l'ensemble : l'admin envoie l'état complet des tailles et options,
 * et la route aligne la base dessus. C'est ce qui permet de réordonner, renommer et
 * supprimer en une seule validation, sans suite d'appels partiels laissant un état bancal.
 */

const sizeSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Le nom du format est requis").transform((v) => v.trim()),
    price: z.number().nonnegative("Le prix ne peut pas être négatif"),
    description: z.string().trim().optional().nullable(),
    isDefault: z.boolean().optional(),
    includedChoices: z.number().int().min(0, "Le nombre d'ingrédients au choix ne peut pas être négatif").max(30).default(0),
})

const optionSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Le nom de l'ingrédient est requis").transform((v) => v.trim()),
    extraPrice: z.number().nonnegative("Le supplément ne peut pas être négatif").default(0),
    includedByDefault: z.boolean().optional(),
    isRemovable: z.boolean().optional(),
    isActive: z.boolean().optional(),
})

const payloadSchema = z.object({
    sizes: z.array(sizeSchema).max(12, "12 formats au maximum"),
    options: z.array(optionSchema).max(60, "60 ingrédients au maximum"),
})

async function requireAdmin() {
    const session = await auth()
    return session?.user?.role === "admin"
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const composition = await prisma.composition.findUnique({
        where: { id },
        include: {
            sizes: { orderBy: [{ order: "asc" }, { price: "asc" }] },
            options: { orderBy: [{ order: "asc" }, { name: "asc" }] },
        },
    })

    if (!composition) {
        return NextResponse.json({ error: "Composition introuvable" }, { status: 404 })
    }

    return NextResponse.json(composition)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params

    try {
        const parsed = payloadSchema.safeParse(await req.json())
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const composition = await prisma.composition.findUnique({ where: { id }, select: { id: true } })
        if (!composition) {
            return NextResponse.json({ error: "Composition introuvable" }, { status: 404 })
        }

        const { sizes, options } = parsed.data

        // Une seule taille par défaut : sans ce garde-fou, la sélection à l'ouverture
        // dépendrait de l'ordre de lecture en base.
        let defaultSeen = false
        const normalizedSizes = sizes.map((size, index) => {
            const isDefault = Boolean(size.isDefault) && !defaultSeen
            if (isDefault) defaultSeen = true
            return { ...size, isDefault, order: index }
        })
        if (!defaultSeen && normalizedSizes.length) {
            normalizedSizes[0].isDefault = true
        }

        // Les lignes retirées de l'écran admin disparaissent de la base. La cascade sur
        // Composition ne couvre pas ce cas : c'est une suppression ligne à ligne.
        const keptSizeIds = normalizedSizes.map((s) => s.id).filter(Boolean) as string[]
        const keptOptionIds = options.map((o) => o.id).filter(Boolean) as string[]

        await prisma.compositionSize.deleteMany({
            where: { compositionId: id, ...(keptSizeIds.length ? { id: { notIn: keptSizeIds } } : {}) },
        })
        await prisma.compositionOption.deleteMany({
            where: { compositionId: id, ...(keptOptionIds.length ? { id: { notIn: keptOptionIds } } : {}) },
        })

        for (const size of normalizedSizes) {
            const data = {
                name: size.name,
                price: size.price,
                description: size.description?.trim() || null,
                isDefault: size.isDefault,
                includedChoices: size.includedChoices,
                order: size.order,
            }
            if (size.id) {
                await prisma.compositionSize.update({ where: { id: size.id }, data })
            } else {
                await prisma.compositionSize.create({ data: { ...data, compositionId: id } })
            }
        }

        for (const [index, option] of options.entries()) {
            const data = {
                name: option.name,
                extraPrice: option.extraPrice,
                includedByDefault: Boolean(option.includedByDefault),
                isRemovable: option.isRemovable !== false,
                isActive: option.isActive !== false,
                order: index,
            }
            if (option.id) {
                await prisma.compositionOption.update({ where: { id: option.id }, data })
            } else {
                await prisma.compositionOption.create({ data: { ...data, compositionId: id } })
            }
        }

        const updated = await prisma.composition.findUnique({
            where: { id },
            include: {
                sizes: { orderBy: [{ order: "asc" }, { price: "asc" }] },
                options: { orderBy: [{ order: "asc" }, { name: "asc" }] },
            },
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error("Erreur mise à jour des choix de composition:", error)
        return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
    }
}
