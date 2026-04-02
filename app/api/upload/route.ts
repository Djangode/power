import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { writeFile } from "fs/promises"
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
        const uploadPath = join(process.cwd(), "public", "uploads", filename)

        await writeFile(uploadPath, compressed)

        return NextResponse.json({ url: `/uploads/${filename}` })
    } catch (error) {
        console.error("Erreur upload:", error)
        return NextResponse.json({ error: "Erreur upload" }, { status: 500 })
    }
}
