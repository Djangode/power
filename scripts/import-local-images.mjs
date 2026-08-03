/**
 * Importe les photos fournies par le commerçant et remplace les images du catalogue.
 *
 * Chaque association a été vérifiée à l'œil sur planche contact : le nom de fichier seul
 * ne suffit pas à garantir le bon sujet (« kiwi » et « kiwi vert » ne montrent pas la même
 * chose, « navette botte » désigne un navet).
 *
 * Usage :
 *   node --env-file=.env scripts/import-local-images.mjs            # simulation
 *   node --env-file=.env scripts/import-local-images.mjs --write    # applique
 */

import sharp from "sharp"
import { neon } from "@neondatabase/serverless"
import { readdirSync, existsSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs"
import { createHash } from "node:crypto"
import { join } from "node:path"

const SOURCE_DIR = process.env.PHOTOS_DIR || "/Users/django/Desktop/power image"
const OUT_DIR = join(process.cwd(), "public", "products")
const SIZE = 900
const WRITE = process.argv.includes("--write")

/**
 * Produit (nom exact en base) -> fichier photo.
 * Plusieurs produits peuvent partager une photo quand la déclinaison n'a pas de visuel
 * propre (mangue avion et bateau, par exemple).
 */
const MAPPING = {
    "Ail blanc": "ail blanc.jpg",
    "Ail blanc sachet": "ail-frais-le-sachet.jpg",
    "Ail rose": "ail-rose .webp",
    "Ananas Sweet": "ananas avion.jpg",
    "Aubergines": "aubergine .jpg",
    "Avocat Hass": "avocat.jpg",
    "Bananes": "banane.jpg",
    "Betterave cru": "betterave rouge crue .jpg",
    "Butternut": "butternut.jpg",
    "Carotte sable": "carotte sable .jpg",
    "Carottes Nouvelles": "carotte botte .jpg",
    "Carottes vrac": "carotte .jpg",
    "Citron vert": "citron vert.jpg",
    "Citrons Jaune": "citron.jpg",
    "Courgettes": "courgette.jpg",
    "Echalotte sachet": "echalotte sac .jpg",
    "Fraises Gariguette": "barquette de fraise .jpg",
    "Gingembre": "gingembre.jpg",
    "Gombo": "gombo.jpg",
    "Kiwi jaune": "kiwi.jpg",
    "Kiwi vert": "kiwi vert.jpg",
    "Mangue Avion": "mangue avion.jpg",
    "Mangue bateau": "mangue bateau.jpg",
    "Asperges": "asperge.jpg",
    "Menthe Fraîche": "menthe botte .jpg",
    "Mini concombre": "concombre .jpg",
    "Navet": "navette botte .jpg",
    "Oignons jaunes vrac": "oignon jaune .jpg",
    "Oignons rouges vrac": "oignon rouge .jpg",
    "Oranges Navel": "orange .jpg",
    "Oranges à jus": "orange .jpg",
    "Pastéque": "pasteque .jpg",
    "Patate douce": "patate douce .jpg",
    "Piment vert": "piment vert .jpg",
    "Poires Conférence": "poir conference.jpg",
    "Poivron long": "poivron vert .jpg",
    "Poivrons Tricolores": "poivron rouge .jpg",
    "Pomme gala": "pomme royal gala.jpg",
    "Pomme golden": "pomme golden .jpg",
    "Pommes Gala": "pomme royal gala.jpg",
    "Pommes de terre agria vrac": "pomme de terre .jpg",
    "Pomolos": "pomelos.jpg",
    "Potimarron": "potimaron.jpeg",
    "Potiron": "potiron.jpg",
    "Raisins barquette": "raisin blanc.jpg",
    "Raisins vrac sans pépins": "raisin blanc.jpg",
    "Salade Batavia": "salade batavia .jpg",
    "Tomate Coeur de boeuf": "tomate ancienne .jpg",
    "Tomate grappe": "tomate grappe .jpg",
    "Tomate ronde": "tomate ronde .jpg",
}

/**
 * Empreinte courte du contenu, ajoutée au nom de fichier.
 *
 * Sans elle, remplacer une photo laisse l'URL inchangée : navigateurs et CDN continuent de
 * servir l'ancienne image, parfois pendant des jours. Le contenu détermine le nom, donc
 * une nouvelle photo produit forcément une nouvelle URL.
 */
function contentHash(buffer) {
    return createHash("sha1").update(buffer).digest("hex").slice(0, 8)
}

function slugify(name) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
}

function cleanDatabaseUrl(raw) {
    return (raw || "")
        .replace(/&channel_binding=[^&]*/g, "")
        .replace(/\?channel_binding=[^&]*&?/, "?")
        .replace(/\?$/, "")
}

async function main() {
    if (!existsSync(SOURCE_DIR)) throw new Error(`Dossier introuvable : ${SOURCE_DIR}`)
    mkdirSync(OUT_DIR, { recursive: true })

    const url = cleanDatabaseUrl(process.env.DATABASE_URL)
    if (!url) throw new Error("DATABASE_URL manquant (lancer avec --env-file=.env)")
    const sql = neon(url)

    const products = await sql.query(`select id, name, coalesce(image, '') as image from "Product" order by name`)
    const available = new Set(readdirSync(SOURCE_DIR))

    const planned = []
    const missing = []

    for (const product of products) {
        const key = product.name.trim()
        const file = MAPPING[key]
        if (!file) {
            missing.push(key)
            continue
        }
        if (!available.has(file)) {
            console.log(`  ✗ ${key} : fichier « ${file} » absent du dossier source`)
            continue
        }
        planned.push({ product, file, slug: slugify(key) })
    }

    console.log(`${planned.length} produit(s) à illustrer, ${missing.length} sans photo fournie\n`)

    if (!WRITE) {
        for (const p of planned) console.log(`  ${p.product.name.trim()}  ←  ${p.file}`)
        if (missing.length) console.log(`\nSans photo : ${missing.join(", ")}`)
        console.log(`\nSimulation — aucune écriture. Relancer avec --write pour appliquer.`)
        return
    }

    // Les anciennes images (banques en ligne) sont retirées : elles ne correspondaient pas
    // toujours au produit, et les garder laisserait des fichiers morts dans le dépôt.
    let removed = 0
    for (const f of readdirSync(OUT_DIR)) {
        if (f.endsWith(".webp") || f === "manifest.json") {
            unlinkSync(join(OUT_DIR, f))
            removed++
        }
    }
    console.log(`${removed} ancienne(s) image(s) supprimée(s)\n`)

    const manifest = {}
    for (const { product, file, slug } of planned) {
        const buffer = await sharp(join(SOURCE_DIR, file))
            .resize(SIZE, SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .webp({ quality: 85 })
            .toBuffer()

        const filename = `${slug}.${contentHash(buffer)}.webp`
        writeFileSync(join(OUT_DIR, filename), buffer)
        await sql.query(`update "Product" set image = $1, "updatedAt" = now() where id = $2`, [
            `/products/${filename}`,
            product.id,
        ])
        manifest[product.id] = { name: product.name.trim(), path: `/products/${filename}`, source: file }
        console.log(`  ✓ ${product.name.trim()} → ${filename} (${Math.round(buffer.length / 1024)} Ko)`)
    }

    // Les produits sans photo repassent à vide : le placeholder « Photo à venir » est plus
    // honnête qu'une image de banque qui montre autre chose.
    for (const name of missing) {
        await sql.query(`update "Product" set image = null, "updatedAt" = now() where trim(name) = $1`, [name])
    }

    writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2))
    console.log(`\n${planned.length} image(s) appliquée(s).`)
    if (missing.length) console.log(`Sans photo (placeholder) : ${missing.join(", ")}`)
}

main().catch((error) => {
    console.error("Échec :", error.message)
    process.exit(1)
})
