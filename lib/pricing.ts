// Source de vérité unique pour le prix des compositions personnalisées.
// Utilisé à la fois côté client (affichage panier) et côté serveur (facturation),
// pour garantir que le montant affiché = le montant facturé.

import { compositionPrice } from "@/lib/composition-pricing"

export const SIZE_MULTIPLIERS: Record<string, number> = {
  small: 0.7,
  standard: 1,
  large: 1.5,
}

export function sizeMultiplier(size?: string | null): number {
  return SIZE_MULTIPLIERS[(size ?? "standard") as string] ?? 1
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Prix d'affichage d'un produit : { current, old }.
 * En promo, `current` est le prix promo et `old` l'ancien prix (à barrer). Sans promo,
 * `old` vaut null. Point unique pour un affichage cohérent partout (cartes, fiche, panier).
 */
export function displayPrice(p: { price: number; promoPrice?: number | null }): {
  current: number
  old: number | null
} {
  return p.promoPrice != null ? { current: p.promoPrice, old: p.price } : { current: p.price, old: null }
}

/**
 * Prix unitaire (HORS quantité) d'une composition personnalisée.
 * Calculé à partir de la taille et des ingrédients choisis, jamais d'un total figé.
 * @param ingredientPrices map optionnelle id -> prix actuel en base.
 *        Fournie côté serveur pour ne PAS faire confiance au prix envoyé par le client (anti-fraude).
 */
export function compositionUnitPrice(
  basePrice: number,
  customData: any,
  ingredientPrices?: Map<string, number>,
): number {
  const ingredients = Array.isArray(customData?.ingredients) ? customData.ingredients : []
  // Côté serveur, ingredientPrices est fourni : on ne fait JAMAIS confiance au prix
  // envoyé par le client (anti-fraude) — ingrédient introuvable en base => 0.
  // Côté client (map absente), on utilise le prix figé dans le customData pour l'affichage.
  const serverSide = ingredientPrices != null
  const ingredientsTotal = ingredients.reduce((sum: number, ing: any) => {
    const trusted = ing?.id != null ? ingredientPrices?.get(String(ing.id)) : undefined
    const price = serverSide
      ? typeof trusted === "number"
        ? trusted
        : 0
      : typeof ing?.price === "number"
        ? ing.price
        : 0
    return sum + price
  }, 0)
  return round2((basePrice + ingredientsTotal) * sizeMultiplier(customData?.size))
}

/**
 * Prix unitaire d'un item de panier, qu'il s'agisse d'un produit simple ou d'une composition.
 *
 * Une composition dotée de formats est tarifée par `compositionPrice` : prix du format
 * retenu plus les suppléments cochés. L'ancien mode — prix de base plus le tarif au kilo
 * des ingrédients pris dans le catalogue — ne subsiste que pour les compositions créées
 * avant l'introduction des formats, le temps qu'elles soient configurées en admin.
 */
export function cartItemUnitPrice(
  item: {
    // `promoPrice` (optionnel) : quand il est défini, c'est LUI le prix de vente effectif.
    // Appliqué ici, au point unique de calcul, il vaut donc pour l'affichage panier ET la
    // facturation serveur — impossible d'afficher une promo sans la facturer, ou l'inverse.
    product?: { price: number; promoPrice?: number | null } | null
    composition?: {
      basePrice: number
      sizes?: { id: string; name: string; price: number; isDefault?: boolean }[]
      options?: { id: string; name: string; extraPrice: number; includedByDefault?: boolean }[]
    } | null
    customData?: any
  },
  ingredientPrices?: Map<string, number>,
): number {
  if (item.product) return item.product.promoPrice ?? item.product.price
  if (!item.composition) return 0

  const { basePrice, sizes = [], options = [] } = item.composition

  if (sizes.length || options.length) {
    return compositionPrice(
      { sizeId: item.customData?.sizeId ?? null, optionIds: item.customData?.optionIds ?? [] },
      sizes,
      options,
      basePrice,
    )
  }

  return item.customData
    ? compositionUnitPrice(basePrice, item.customData, ingredientPrices)
    : basePrice
}

/**
 * Frais de livraison à partir du sous-total, du mode de réception et de la config (frais + seuil de gratuité).
 * Fonction PURE : aucun accès base/serveur, utilisable côté client.
 * - Retrait → 0
 * - Livraison → 0 si sous-total >= seuil, sinon les frais configurés.
 */
export function deliveryFee(
  subtotal: number,
  method: string,
  cfg: { fee: number; threshold: number },
): number {
  if (method === "retrait") return 0
  return subtotal >= cfg.threshold ? 0 : cfg.fee
}

/** IDs des produits-ingrédients référencés dans les customData (pour revérifier leurs prix en base). */
export function collectIngredientIds(items: { customData?: any }[]): string[] {
  const ids = new Set<string>()
  for (const it of items) {
    const ings = Array.isArray(it.customData?.ingredients) ? it.customData.ingredients : []
    for (const ing of ings) if (ing?.id != null) ids.add(String(ing.id))
  }
  return Array.from(ids)
}
