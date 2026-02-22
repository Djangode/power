import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { writeFile } from "fs/promises"
import { join } from "path"
import sharp from "sharp"

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
