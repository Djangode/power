/**
 * Applique en base les images récupérées par fetch-product-images.mjs.
 *
 * Mode simulation par défaut : la base n'est modifiée qu'avec --write explicite, pour qu'un
 * lancement distrait ne réécrive pas le catalogue de production.
 *
 * Usage :
 *   node --env-file=.env scripts/apply-product-images.mjs            # simulation
 *   node --env-file=.env scripts/apply-product-images.mjs --write    # écriture réelle
 */

import { neon } from "@neondatabase/serverless"
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"

const MANIFEST = join(process.cwd(), "public", "products", "manifest.json")
const WRITE = process.argv.includes("--write")

function cleanDatabaseUrl(raw) {
  return (raw || "")
    .replace(/&channel_binding=[^&]*/g, "")
    .replace(/\?channel_binding=[^&]*&?/, "?")
    .replace(/\?$/, "")
}

async function main() {
  if (!existsSync(MANIFEST)) {
    throw new Error("public/products/manifest.json introuvable — lancer fetch-product-images.mjs d'abord")
  }

  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"))
  const entries = Object.entries(manifest)
  if (!entries.length) {
    console.log("Manifeste vide, rien à appliquer.")
    return
  }

  const url = cleanDatabaseUrl(process.env.DATABASE_URL)
  if (!url) throw new Error("DATABASE_URL manquant (lancer avec --env-file=.env)")
  const sql = neon(url)

  const current = await sql.query(`select id, name, coalesce(image, '') as image from "Product"`)
  const byId = new Map(current.map((p) => [p.id, p]))

  const changes = []
  for (const [productId, entry] of entries) {
    const product = byId.get(productId)
    if (!product) {
      console.log(`  ? ${entry.name} — produit absent de la base (supprimé depuis ?)`)
      continue
    }
    if (product.image === entry.path) continue
    changes.push({ productId, name: entry.name, from: product.image || "(vide)", to: entry.path })
  }

  if (!changes.length) {
    console.log("Toutes les images sont déjà à jour en base.")
    return
  }

  console.log(`${changes.length} produit(s) à mettre à jour :\n`)
  for (const c of changes) {
    console.log(`  ${c.name}`)
    console.log(`     ${c.from}  →  ${c.to}`)
  }

  if (!WRITE) {
    console.log(`\nSimulation — aucune écriture. Relancer avec --write pour appliquer.`)
    return
  }

  let applied = 0
  for (const c of changes) {
    await sql.query(`update "Product" set image = $1, "updatedAt" = now() where id = $2`, [c.to, c.productId])
    applied++
  }
  console.log(`\n${applied} produit(s) mis à jour en base.`)
}

main().catch((error) => {
  console.error("Échec :", error.message)
  process.exit(1)
})
