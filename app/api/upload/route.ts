import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { put } from "@vercel/blob"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import sharp from "sharp"

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

/**
 * Stockage de l'image compressée.
 *
 * En production (Vercel), le système de fichiers est en lecture seule : écrire dans
 * public/uploads échoue, et le fichier disparaîtrait de toute façon au déploiement suivant.
 * On passe donc par Vercel Blob, servi depuis un CDN. En développement local, on garde
 * l'écriture disque pour ne pas exiger de jeton Blob.
 */
async function storeImage(buffer: Buffer, filename: string): Promise<string> {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`products/${filename}`, buffer, {
            access: "public",
            contentType: "image/webp",
        })
        return blob.url
    }

    if (process.env.NODE_ENV === "production") {
        throw new Error(
            "Stockage d'images non configuré : créez un store Vercel Blob depuis le tableau de " +
            "bord Vercel puis redéployez (BLOB_READ_WRITE_TOKEN sera injecté automatiquement).",
        )
    }

    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)
    return `/uploads/${filename}`
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json({ error: "Aucun fichier" }, { status: 400 })
        }

        // Validation du type MIME
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Type de fichier non autorisé (${file.type}). Formats acceptés : JPEG, PNG, WebP, GIF, AVIF` },
                { status: 400 }
            )
        }

        // Validation de la taille
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 10 Mo` },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Compression avec sharp → WebP, max 800px, qualité 80
        const compressed = await sharp(buffer)
            .resize(800, 800, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer()

        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
        const url = await storeImage(compressed, filename)

        return NextResponse.json({ url })
    } catch (error) {
        console.error("Erreur upload:", error)
        // Le message porte l'action corrective (ex. store Blob absent) : sans lui, l'admin
        // ne voit qu'un « Erreur upload » opaque et ne peut rien débloquer seul.
        const message = error instanceof Error ? error.message : "Erreur upload"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
