/**
 * Récupère plusieurs candidats par produit et les assemble en planches numérotées,
 * pour choisir la bonne image à l'œil plutôt qu'au score.
 *
 * La recherche par mots-clés ne distingue pas le sujet : « aubergine » ramène des figues,
 * « betterave » des navets, « raisins » une corbeille de fruits. Aucun score sur les
 * métadonnées ne rattrape ça — seul un regard sur l'image tranche.
 *
 * Usage :
 *   node --env-file=.env scripts/image-candidates.mjs --only=aubergines,betterave
 *   node --env-file=.env scripts/image-candidates.mjs --pick=aubergines:3,betterave:1
 *
 * Les candidats sont écrits dans public/products/_candidates/<slug>-<n>.webp et les
 * planches dans public/products/_candidates/sheet-<n>.jpg.
 */

import sharp from "sharp"
import { neon } from "@neondatabase/serverless"
import { writeFile, mkdir, readFile, copyFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { commercialQueries, slugForProduct, normalizeName } from "./product-image-queries.mjs"

const OUT_DIR = join(process.cwd(), "public", "products")
const CAND_DIR = join(OUT_DIR, "_candidates")
const MANIFEST = join(OUT_DIR, "manifest.json")
const USER_AGENT = "PowerPrimeur/1.0 (boutique primeur; contact@powerprimeur.com)"
const PER_PRODUCT = 6
const SIZE = 800

const args = process.argv.slice(2)
const ONLY = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean)
const PICK = args.find((a) => a.startsWith("--pick="))?.slice(7).split(",").filter(Boolean)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cleanDatabaseUrl(raw) {
  return (raw || "")
    .replace(/&channel_binding=[^&]*/g, "")
    .replace(/\?channel_binding=[^&]*&?/, "?")
    .replace(/\?$/, "")
}

async function fetchProducts() {
  const url = cleanDatabaseUrl(process.env.DATABASE_URL)
  if (!url) throw new Error("DATABASE_URL manquant (lancer avec --env-file=.env)")
  const sql = neon(url)
  return sql.query(`select id, name from "Product" order by name`)
}

async function searchPexels(query, perPage) {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error("PEXELS_API_KEY manquant")

  const params = new URLSearchParams({ query, per_page: String(perPage), orientation: "square" })
  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: key, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`)
  const json = await res.json()
  return (json.photos ?? [])
    .map((p) => ({ url: p.src?.large ?? p.src?.original, title: p.alt || query, creator: p.photographer }))
    .filter((c) => typeof c.url === "string")
}

async function toWebp(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(45_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const input = Buffer.from(await res.arrayBuffer())
  return sharp(input)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .webp({ quality: 82 })
    .toBuffer()
}

/** Valide un choix et le promeut en image définitive du produit. */
async function applyPicks(products) {
  const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : {}

  for (const entry of PICK) {
    const [slug, indexRaw] = entry.split(":")
    const index = Number(indexRaw)
    const source = join(CAND_DIR, `${slug}-${index}.webp`)

    if (!existsSync(source)) {
      console.log(`  ✗ ${slug} : candidat ${index} introuvable`)
      continue
    }

    const product = products.find((p) => slugForProduct(p.name) === slug)
    if (!product) {
      console.log(`  ✗ ${slug} : produit absent de la base`)
      continue
    }

    await copyFile(source, join(OUT_DIR, `${slug}.webp`))
    manifest[product.id] = {
      name: product.name.trim(),
      path: `/products/${slug}.webp`,
      query: "sélection manuelle",
      credit: { source: "pexels", license: "Pexels" },
    }
    console.log(`  ✓ ${product.name.trim()} → candidat ${index}`)
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2))
  console.log(`\nManifeste mis à jour. Appliquer en base : node --env-file=.env scripts/apply-product-images.mjs --write`)
}

/** Planche numérotée : une ligne par produit, ses candidats côte à côte. */
async function buildSheet(rows, sheetIndex) {
  const CELL = 190
  const LABEL_W = 190
  const LABEL_H = 22
  const width = LABEL_W + PER_PRODUCT * CELL
  const height = rows.length * (CELL + LABEL_H)

  const composites = []
  for (const [r, row] of rows.entries()) {
    const top = r * (CELL + LABEL_H)

    const name = row.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").slice(0, 22)
    composites.push({
      input: Buffer.from(
        `<svg width="${LABEL_W}" height="${CELL + LABEL_H}">
           <rect width="100%" height="100%" fill="#111"/>
           <text x="8" y="${CELL / 2}" font-family="sans-serif" font-size="13" fill="#fff">${name}</text>
           <text x="8" y="${CELL / 2 + 18}" font-family="sans-serif" font-size="11" fill="#f97316">${row.slug}</text>
         </svg>`,
      ),
      left: 0,
      top,
    })

    for (const [c, buf] of row.buffers.entries()) {
      composites.push({ input: await sharp(buf).resize(CELL - 6, CELL - 6).toBuffer(), left: LABEL_W + c * CELL + 3, top: top + 3 })
      composites.push({
        input: Buffer.from(
          `<svg width="${CELL}" height="${LABEL_H}">
             <rect width="100%" height="100%" fill="#222"/>
             <text x="${CELL / 2}" y="15" font-family="sans-serif" font-size="12" fill="#fff" text-anchor="middle">${c + 1}</text>
           </svg>`,
        ),
        left: LABEL_W + c * CELL,
        top: top + CELL,
      })
    }
  }

  const sheet = await sharp({ create: { width, height, channels: 3, background: { r: 240, g: 240, b: 240 } } })
    .composite(composites)
    .jpeg({ quality: 80 })
    .toBuffer()

  const path = join(CAND_DIR, `sheet-${sheetIndex}.jpg`)
  await writeFile(path, sheet)
  console.log(`Planche ${sheetIndex} : ${rows.length} produits → ${path}`)
}

async function main() {
  await mkdir(CAND_DIR, { recursive: true })
  const products = await fetchProducts()

  if (PICK?.length) {
    await applyPicks(products)
    return
  }

  const targets = products.filter((p) => {
    if (!ONLY?.length) return true
    const n = normalizeName(p.name)
    return ONLY.some((f) => n.includes(normalizeName(f)))
  })

  console.log(`${targets.length} produit(s), ${PER_PRODUCT} candidats chacun\n`)

  let rows = []
  let sheetIndex = 1

  for (const [i, product] of targets.entries()) {
    const slug = slugForProduct(product.name)
    const query = commercialQueries(product.name)[0]

    try {
      const candidates = await searchPexels(query, PER_PRODUCT + 4)
      const buffers = []
      for (const candidate of candidates) {
        if (buffers.length >= PER_PRODUCT) break
        try {
          const buf = await toWebp(candidate.url)
          await writeFile(join(CAND_DIR, `${slug}-${buffers.length + 1}.webp`), buf)
          buffers.push(buf)
        } catch {
          // Candidat suivant.
        }
      }
      if (buffers.length) {
        rows.push({ name: product.name.trim(), slug, buffers })
        console.log(`  ✓ ${product.name.trim()} — ${buffers.length} candidats (« ${query} »)`)
      } else {
        console.log(`  ✗ ${product.name.trim()} — aucun candidat`)
      }
    } catch (error) {
      console.log(`  ✗ ${product.name.trim()} — ${error.message}`)
    }

    // Une planche tous les 7 produits : au-delà, les vignettes deviennent trop petites
    // pour trancher d'un coup d'œil.
    if (rows.length === 7 || i === targets.length - 1) {
      if (rows.length) await buildSheet(rows, sheetIndex++)
      rows = []
    }

    await sleep(400)
  }
}

main().catch((error) => {
  console.error("Échec :", error.message)
  process.exit(1)
})
