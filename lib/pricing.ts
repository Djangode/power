// Source de vérité unique pour le prix des compositions personnalisées.
// Utilisé à la fois côté client (affichage panier) et côté serveur (facturation),
// pour garantir que le montant affiché = le montant facturé.

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

/** Prix unitaire d'un item de panier, qu'il s'agisse d'un produit simple ou d'une composition. */
export function cartItemUnitPrice(
  item: {
    product?: { price: number } | null
    composition?: { basePrice: number } | null
    customData?: any
  },
  ingredientPrices?: Map<string, number>,
): number {
  if (item.product) return item.product.price
  if (item.composition) {
    return item.customData
      ? compositionUnitPrice(item.composition.basePrice, item.customData, ingredientPrices)
      : item.composition.basePrice
  }
  return 0
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
