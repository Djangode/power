/**
 * Assemble toutes les images de public/products/ en une planche contact unique,
 * pour valider d'un coup d'œil que chaque produit a bien une photo qui le représente.
 *
 * Une image hors sujet dans un catalogue de primeur coûte une vente : cette vérification
 * visuelle est le seul garde-fou fiable, aucun score sur les métadonnées ne la remplace.
 *
 * Usage : node scripts/contact-sheet.mjs [--cols=6] [--cell=220]
 */

import sharp from "sharp"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"

const DIR = join(process.cwd(), "public", "products")
const OUT = join(process.cwd(), "public", "products", "_contact-sheet.jpg")
const MANIFEST = join(DIR, "manifest.json")

const args = process.argv.slice(2)
const COLS = Number(args.find((a) => a.startsWith("--cols="))?.slice(7) ?? 6)
const CELL = Number(args.find((a) => a.startsWith("--cell="))?.slice(7) ?? 220)
const LABEL_H = 26

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".webp")).sort()
  if (!files.length) {
    console.log("Aucune image dans public/products/")
    return
  }

  const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : {}
  const nameBySlug = new Map()
  for (const entry of Object.values(manifest)) {
    nameBySlug.set(entry.path.replace("/products/", "").replace(".webp", ""), entry.name)
  }

  const rows = Math.ceil(files.length / COLS)
  const cellH = CELL + LABEL_H
  const width = COLS * CELL
  const height = rows * cellH

  const composites = []
  for (const [i, file] of files.entries()) {
    const slug = file.replace(".webp", "")
    const label = nameBySlug.get(slug) ?? slug
    const col = i % COLS
    const row = Math.floor(i / COLS)

    const thumb = await sharp(join(DIR, file))
      .resize(CELL - 8, CELL - 8, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer()

    composites.push({ input: thumb, left: col * CELL + 4, top: row * cellH + 4 })

    const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const caption = Buffer.from(
      `<svg width="${CELL}" height="${LABEL_H}">
         <rect width="100%" height="100%" fill="#111"/>
         <text x="${CELL / 2}" y="17" font-family="sans-serif" font-size="12" fill="#fff"
               text-anchor="middle">${safe.slice(0, 26)}</text>
       </svg>`,
    )
    composites.push({ input: caption, left: col * CELL, top: row * cellH + CELL })
  }

  const sheet = await sharp({
    create: { width, height, channels: 3, background: { r: 240, g: 240, b: 240 } },
  })
    .composite(composites)
    .jpeg({ quality: 82 })
    .toBuffer()

  await writeFile(OUT, sheet)
  console.log(`Planche contact : ${files.length} images → public/products/_contact-sheet.jpg (${width}x${height})`)
}

main().catch((error) => {
  console.error("Échec :", error.message)
  process.exit(1)
})
