import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse une date de livraison envoyée par le client.
 * Accepte "JJ/MM/AAAA" (toLocaleDateString fr-FR), "AAAA-MM-JJ" et ISO complet.
 * Retourne une Date positionnée à midi local (évite les décalages de jour liés au fuseau),
 * ou null si la valeur est invalide — pour ne JAMAIS écrire une "Invalid Date" en base.
 */
export function parseDeliveryDate(input: unknown): Date | null {
  if (!input || typeof input !== "string") return null
  const s = input.trim()
  if (!s) return null

  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (fr) {
    const date = new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]), 12, 0, 0)
    return isNaN(date.getTime()) ? null : date
  }

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0)
    return isNaN(date.getTime()) ? null : date
  }

  const date = new Date(s)
  return isNaN(date.getTime()) ? null : date
}

/** Formate une Date en "AAAA-MM-JJ" selon le fuseau LOCAL (évite le décalage d'un jour de toISOString). */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
