const PRODUCTION_URL = "https://powerprimeur.com"

/** URL canonique contrôlée par le serveur. Ne jamais construire une redirection de
 * paiement depuis l'en-tête Origin, qui est fourni par l'appelant. */
export function publicAppUrl(): string {
  const fallback = process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000"
  const candidate = process.env.NEXT_PUBLIC_APP_URL || fallback
  try {
    const url = new URL(candidate)
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local)) return fallback
    return url.origin
  } catch {
    return fallback
  }
}
