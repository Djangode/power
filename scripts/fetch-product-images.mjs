/**
 * Télécharge une photo libre de droits pour chaque produit du catalogue.
 *
 * Source : Openverse (api.openverse.org), filtré sur les licences CC0 et « domaine public ».
 * Ces licences autorisent l'usage commercial sans obligation d'attribution — c'est ce qui
 * permet de les servir telles quelles sur la boutique.
 *
 * Les images sont normalisées en WebP 800x800 (« contain » sur fond blanc, pour que des photos
 * de formats différents ne rendent pas une grille de catalogue bancale) et écrites dans
 * public/products/. Le fichier de correspondance produit -> chemin est écrit dans
 * public/products/manifest.json, que `apply-product-images.mjs` applique ensuite en base.
 *
 * Usage :
 *   node --env-file=.env scripts/fetch-product-images.mjs            # produits sans image locale
 *   node --env-file=.env scripts/fetch-product-images.mjs --force    # re-télécharge tout
 *   node --env-file=.env scripts/fetch-product-images.mjs --only=kiwi,tomate
 */

import { neon } from "@neondatabase/serverless"
import sharp from "sharp"
import { writeFile, readFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { commercialQueries, scientificQuery, slugForProduct, normalizeName } from "./product-image-queries.mjs"

const OUT_DIR = join(process.cwd(), "public", "products")
const MANIFEST = join(OUT_DIR, "manifest.json")
const USER_AGENT = "PowerPrimeur/1.0 (boutique primeur; contact@powerprimeur.com)"
const SIZE = 800
/** Openverse limite les clients anonymes ; on espace les appels pour rester sous le seuil. */
const DELAY_MS = 1500

const args = process.argv.slice(2)
const FORCE = args.includes("--force")
const ONLY = args.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",").filter(Boolean)

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
  return sql.query(
    `select p.id, p.name, c.name as category, coalesce(p.image, '') as image
     from "Product" p join "Category" c on c.id = p."categoryId"
     order by c.name, p.name`,
  )
}

/**
 * Cherche sur Pexels.
 *
 * Source à privilégier : c'est une banque de photographies commerciales, là où Openverse et
 * Wikimedia sont majoritairement documentaires (bulletins agricoles numérisés, planches
 * d'herbier, photos d'espèce sur pied) et donnent des visuels inutilisables en catalogue.
 * Licence Pexels : usage commercial libre, sans attribution obligatoire.
 * Clé gratuite : https://www.pexels.com/api/ → PEXELS_API_KEY dans .env
 */
async function searchPexels(query) {
  const key = process.env.PEXELS_API_KEY
  if (!key) return []

  const params = new URLSearchParams({ query, per_page: "10", orientation: "square", locale: "en-US" })
  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: key, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`)
  const json = await res.json()

  return (json.photos ?? []).map((p) => ({
    url: p.src?.large ?? p.src?.original,
    title: p.alt || query,
    creator: p.photographer ?? "Pexels",
    license: "Pexels",
    source: "pexels",
  })).filter((c) => typeof c.url === "string")
}

/**
 * Cherche sur Unsplash.
 * Même logique que Pexels : photographies commerciales.
 * Clé gratuite : https://unsplash.com/developers → UNSPLASH_ACCESS_KEY dans .env
 */
async function searchUnsplash(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return []

  const params = new URLSearchParams({ query, per_page: "10", orientation: "squarish", content_filter: "high" })
  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${key}`, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`)
  const json = await res.json()

  return (json.results ?? []).map((p) => ({
    url: p.urls?.regular,
    title: p.alt_description || p.description || query,
    creator: p.user?.name ?? "Unsplash",
    license: "Unsplash",
    source: "unsplash",
  })).filter((c) => typeof c.url === "string")
}

/**
 * Cherche sur Openverse.
 * Licences retenues : CC0 et domaine public (aucune contrainte), plus CC-BY (attribution
 * simple, listée sur la page Crédits photos). CC-BY-SA est exclu : le partage à l'identique
 * contaminerait les visuels dérivés du catalogue.
 */
async function searchOpenverse(query) {
  const params = new URLSearchParams({
    q: query,
    license: "cc0,pdm,by",
    extension: "jpg",
    size: "medium",
    page_size: "12",
    mature: "false",
  })
  const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Openverse HTTP ${res.status}`)
  const json = await res.json()
  return (json.results ?? [])
    .map((r) => ({
      url: r.url,
      title: r.title,
      creator: r.creator,
      license: r.license,
      source: `openverse/${r.source}`,
    }))
    .filter((r) => typeof r.url === "string" && r.url.startsWith("http"))
}

/**
 * Cherche sur Wikimedia Commons.
 * Bien mieux catégorisé qu'Openverse sur les fruits et légumes : les titres de fichiers
 * portent le nom de l'espèce, ce qui écarte d'emblée le bruit documentaire.
 */
async function searchWikimedia(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "1000",
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Wikimedia HTTP ${res.status}`)
  const json = await res.json()
  const pages = json?.query?.pages ?? {}

  return Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0]
      if (!info?.thumburl) return null
      const meta = info.extmetadata ?? {}
      const license = (meta.LicenseShortName?.value ?? "").toLowerCase()
      // Le partage à l'identique est écarté ; le reste (CC0, domaine public, CC-BY) est retenu.
      if (license.includes("sa")) return null
      return {
        url: info.thumburl,
        title: String(page.title ?? "").replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
        creator: String(meta.Artist?.value ?? "").replace(/<[^>]*>/g, "").trim() || "Wikimedia Commons",
        license: meta.LicenseShortName?.value ?? "domaine public",
        source: "wikimedia",
      }
    })
    .filter(Boolean)
}

/** Titres qui trahissent une photo inutilisable en catalogue (macro, tranche, plat cuisiné). */
const TITLE_PENALTIES = [
  // Le produit n'est plus reconnaissable
  "slice", "sliced", "cut", "half", "halved", "macro", "closeup", "close-up", "close up",
  "seed", "cross section", "grated", "chopped", "peeled", "diced",
  // Produit transformé ou cuisiné
  "salad", "soup", "juice", "smoothie", "cake", "pie", "jam", "cooked", "baked",
  "roasted", "dish", "meal", "recipe", "plate", "bowl of",
  // Le sujet n'est pas le produit mais la plante ou la scène
  "flower", "blossom", "leaf", "plant", "field", "tree", "branch", "garden", "farm",
  "market", "person", "woman", "man", "hand", "holding", "kitchen", "table", "breakfast",
  "coffee", "restaurant", "shopping", "basket of",
]
const TITLE_BONUSES = ["whole", "fresh", "ripe", "isolated", "white background", "organic"]

/**
 * Titres de fonds documentaires numérisés, écartés avant même le téléchargement.
 * Ces collections (USDA, Biodiversity Heritage Library) dominent les résultats en licence
 * libre sur les noms de fruits et légumes.
 */
const TITLE_REJECTS = [
  "bulletin", "circular", "yearbook", "annual report", "proceedings", "journal",
  "magazine", "catalog", "catalogue", "seed list", "archive", "historic", "document",
  "farmers' bulletin", "department of agriculture", "experiment station", "monograph",
  "handbook", "manual", "review of", "analysis", "survey", "census", "letter", "page",
]

function isDocumentTitle(title) {
  const t = (title ?? "").toLowerCase()
  return TITLE_REJECTS.some((word) => t.includes(word))
}

/**
 * Classe les candidats sans les télécharger : le titre suffit à écarter les gros plans de
 * tranche et les plats cuisinés, qui rendent un produit méconnaissable en grille.
 */
function scoreCandidate(candidate, query) {
  const title = (candidate.title ?? "").toLowerCase()
  let score = 0
  for (const word of query.toLowerCase().split(" ")) {
    if (word.length > 2 && title.includes(word)) score += 3
  }
  for (const bonus of TITLE_BONUSES) if (title.includes(bonus)) score += 2
  for (const penalty of TITLE_PENALTIES) if (title.includes(penalty)) score -= 4
  // Les banques commerciales sont faites de photos de produit : c'est exactement ce qu'un
  // catalogue attend, alors que les fonds libres montrent la plante ou le document d'archive.
  if (candidate.source === "pexels" || candidate.source === "unsplash") score += 6
  // Sur Wikimedia le titre décrit le sujet ; sur Openverse c'est une légende libre, moins fiable.
  else if (candidate.source === "wikimedia") score += 2
  // À pertinence égale, une licence sans obligation d'attribution simplifie la vie.
  const license = (candidate.license ?? "").toLowerCase()
  if (license === "cc0" || license === "pdm" || license.includes("public domain")) score += 1
  return score
}

/**
 * Écarte ce qui n'est pas une photographie de produit.
 *
 * Les banques d'images libres sont saturées de fonds documentaires numérisés (bulletins
 * agricoles USDA, catalogues de semences, revues scientifiques) qui remontent en tête sur des
 * mots-clés de fruits et légumes. Deux mesures suffisent à les écarter, seuils calibrés sur un
 * lot de 51 images étiquetées à la main :
 *  - l'entropie, qui sépare sans exception les scans de texte des photos réelles ;
 *  - la combinaison « très clair et désaturé », signature du papier.
 */
async function assertLooksLikeAPhoto(input) {
  const stats = await sharp(input).stats()
  const [r, g, b] = stats.channels
  const means = [r.mean, g.mean, b.mean]
  const luminance = means.reduce((a, v) => a + v, 0) / 3
  const saturation = Math.max(...means) - Math.min(...means)
  const entropy = stats.entropy ?? 0

  if (entropy < 4.1) {
    throw new Error(`document numérisé ou aplat uni (entropie ${entropy.toFixed(2)})`)
  }
  if (luminance > 220 && saturation < 30) {
    throw new Error(`fond papier (luminance ${luminance.toFixed(0)}, saturation ${saturation.toFixed(0)})`)
  }
}

/**
 * Télécharge un candidat et le convertit en WebP carré.
 * Rejette les images trop petites : en dessous de 400px, l'agrandissement est visible en grille.
 */
async function downloadAndConvert(candidate, destPath) {
  const res = await fetch(candidate.url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`téléchargement HTTP ${res.status}`)

  const input = Buffer.from(await res.arrayBuffer())
  const meta = await sharp(input).metadata()
  if ((meta.width ?? 0) < 400 || (meta.height ?? 0) < 400) {
    throw new Error(`image trop petite (${meta.width}x${meta.height})`)
  }

  await assertLooksLikeAPhoto(input)

  const output = await sharp(input)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .webp({ quality: 82 })
    .toBuffer()

  await writeFile(destPath, output)
  return output.length
}

async function loadManifest() {
  if (!existsSync(MANIFEST)) return {}
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8"))
  } catch {
    return {}
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const manifest = await loadManifest()
  const products = await fetchProducts()

  const targets = products.filter((p) => {
    if (ONLY?.length) {
      const n = normalizeName(p.name)
      if (!ONLY.some((f) => n.includes(normalizeName(f)))) return false
    }
    if (FORCE) return true
    // Déjà servi depuis notre dossier local et le fichier existe -> rien à faire.
    const slug = slugForProduct(p.name)
    return !(p.image.startsWith("/products/") && existsSync(join(OUT_DIR, `${slug}.webp`)))
  })

  console.log(`${products.length} produits en base, ${targets.length} à traiter\n`)

  const ok = []
  const failed = []

  for (const [i, product] of targets.entries()) {
    const slug = slugForProduct(product.name)
    const queries = commercialQueries(product.name)
    const latin = scientificQuery(product.name)
    const destPath = join(OUT_DIR, `${slug}.webp`)
    const label = `[${i + 1}/${targets.length}] ${product.name.trim()}`

    let saved = null
    let usedQuery = queries[0]
    const reasons = []

    for (const query of queries) {
      try {
        // Chaque banque reçoit la formulation qu'elle comprend : anglais courant pour les
        // banques commerciales, nom d'espèce pour Wikimedia.
        const [pexels, unsplash, wikimedia, openverse] = await Promise.all([
          searchPexels(query).catch(() => []),
          searchUnsplash(query).catch(() => []),
          searchWikimedia(latin).catch(() => []),
          searchOpenverse(query).catch(() => []),
        ])
        const commercial = [...pexels, ...unsplash]
        const candidates = (commercial.length ? commercial : [...wikimedia, ...openverse])
          .filter((c) => !isDocumentTitle(c.title))
        if (!candidates.length) {
          reasons.push(`« ${query} » : aucun résultat`)
          await sleep(DELAY_MS)
          continue
        }

        const ranked = candidates
          .map((c) => ({ candidate: c, score: scoreCandidate(c, query) }))
          .sort((a, b) => b.score - a.score)

        for (const { candidate } of ranked) {
          try {
            const bytes = await downloadAndConvert(candidate, destPath)
            saved = { candidate, bytes }
            usedQuery = query
            break
          } catch {
            // Candidat suivant : lien mort, format illisible ou résolution insuffisante.
          }
        }
        if (saved) break
        reasons.push(`« ${query} » : aucun candidat exploitable`)
      } catch (error) {
        reasons.push(`« ${query} » : ${error.message}`)
      }
      await sleep(DELAY_MS)
    }

    if (saved) {
      manifest[product.id] = {
        name: product.name.trim(),
        path: `/products/${slug}.webp`,
        query: usedQuery,
        credit: {
          title: saved.candidate.title,
          creator: saved.candidate.creator,
          license: saved.candidate.license,
          source: saved.candidate.source,
          url: saved.candidate.url,
        },
      }
      ok.push(product.name.trim())
      console.log(`  ✓ ${label} → ${slug}.webp (${Math.round(saved.bytes / 1024)} Ko, ${saved.candidate.license})`)
    } else {
      failed.push({ name: product.name.trim(), query: queries.join(" / "), reason: reasons.join(" ; ") })
      console.log(`  ✗ ${label} — ${reasons.join(" ; ")}`)
    }

    if (i < targets.length - 1) await sleep(DELAY_MS)
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2))

  console.log(`\n${ok.length} image(s) récupérée(s), ${failed.length} échec(s)`)
  if (failed.length) {
    console.log("\nÉchecs (ajouter une requête dans scripts/product-image-queries.mjs) :")
    for (const f of failed) console.log(`  - ${f.name} (« ${f.query} ») : ${f.reason}`)
  }
  console.log(`\nManifeste : public/products/manifest.json`)
  console.log(`Étape suivante : node --env-file=.env scripts/apply-product-images.mjs`)
}

main().catch((error) => {
  console.error("Échec :", error.message)
  process.exit(1)
})
