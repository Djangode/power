/**
 * Traduction du langage naturel en commande du bot.
 *
 * PRINCIPE DE SÉCURITÉ : le moteur de langage (GPT ou autre) ne touche JAMAIS la base
 * directement. Son seul rôle est de traduire une phrase libre (« montre-moi les commandes
 * d'aujourd'hui ») en une commande interne (« /commandes »). Toute la logique métier, les
 * confirmations et les écritures restent dans notre code (voir handler.ts et actions.ts).
 * Ainsi une réponse inattendue du modèle ne peut, au pire, que produire une commande invalide
 * — jamais modifier un stock ou un prix sans passer par la confirmation.
 *
 * ÉTAT : non branché. Tant qu'aucune clé n'est configurée, cette fonction renvoie null et le
 * bot fonctionne aux commandes tapées à la main (/commandes, /stock, /prix…). Quand la clé
 * OpenAI sera fournie, il n'y aura qu'à remplir le corps ci-dessous — c'est le SEUL point à
 * compléter pour activer le langage naturel.
 */

/** Liste des commandes que le modèle a le droit de produire (le « menu » qu'on lui donnera). */
export const KNOWN_COMMANDS = [
    "/commandes",
    "/preparer",
    "/remis",
    "/stock",
    "/rupture",
    "/prix",
    "/ca",
    "/aide",
] as const

/**
 * Renvoie une commande interne (commençant par « / ») ou null si le langage naturel n'est pas
 * encore activé / la phrase n'a pas pu être traduite.
 */
export async function interpretMessage(_text: string): Promise<string | null> {
    // Pas de clé → langage naturel désactivé, on retombe sur les commandes manuelles.
    if (!process.env.OPENAI_API_KEY) return null

    // ── À COMPLÉTER quand la clé sera là ──────────────────────────────────────
    // Appeler l'API OpenAI en « function calling » avec KNOWN_COMMANDS comme outils,
    // récupérer la commande choisie + ses arguments, et renvoyer la chaîne « /... ».
    // Rien d'autre ne change : handler.ts exécute la commande comme si elle avait été tapée.
    //   import OpenAI from "openai"
    //   const client = new OpenAI()  // lit OPENAI_API_KEY
    //   ...
    return null
}
