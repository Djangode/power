import { prisma } from "@/lib/db"

/**
 * Numérotation des factures.
 *
 * L'article 242 nonies A du CGI impose une numérotation « chronologique, continue, sans
 * rupture » : un identifiant tiré d'un horodatage ou d'un aléa ne convient pas, car il ne
 * garantit ni l'ordre ni l'absence de trou. On s'appuie donc sur une séquence Postgres,
 * seule à donner un numéro unique et croissant même quand deux commandes sont validées
 * au même instant.
 */
const SEQUENCE_NAME = "invoice_number_seq"

/** Crée la séquence au premier appel — évite un fichier de migration pour un seul objet. */
async function ensureSequence() {
    await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${SEQUENCE_NAME} START 1`)
}

/**
 * Réserve et renvoie le prochain numéro de facture, au format FAC-000001.
 *
 * En cas d'échec de la séquence, on ne renvoie PAS un numéro de repli aléatoire : mieux vaut
 * remonter l'erreur que d'introduire silencieusement un trou dans une numérotation comptable.
 */
export async function nextInvoiceNumber(): Promise<string> {
    await ensureSequence()

    const rows = await prisma.$queryRawUnsafe<{ nextval: bigint | number }[]>(
        `SELECT nextval('${SEQUENCE_NAME}') AS nextval`,
    )

    const value = rows?.[0]?.nextval
    if (value == null) {
        throw new Error("Impossible d'attribuer un numéro de facture")
    }

    return `FAC-${String(value).padStart(6, "0")}`
}
