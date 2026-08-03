/**
 * Tarification des compositions (plateaux de fruits, légumes découpés, smoothies).
 *
 * Une composition n'est pas vendue au poids : chaque format a un tarif propre, fixé par le
 * commerçant. Le prix ne se déduit donc PAS des prix au kilo du catalogue — mettre trois
 * morceaux de mangue dans un plateau n'a rien à voir avec le prix d'un kilo de mangues.
 *
 *   prix unitaire = prix de la taille choisie + somme des suppléments retenus
 *
 * Les ingrédients de la formule standard sont compris dans le prix de la taille
 * (`includedByDefault`) ; les autres sont facturés `extraPrice`.
 */

export type SizeLike = {
    id: string
    name: string
    price: number
    isDefault?: boolean
    /** Ingrédients compris dans le prix, au choix du client. 0 = formule fixe. */
    includedChoices?: number
}

export type OptionLike = {
    id: string
    name: string
    extraPrice: number
    includedByDefault?: boolean
}

/** Sélection figée dans le panier puis dans la commande. */
export type CompositionSelection = {
    sizeId?: string | null
    /** Identifiants des options retenues, formule standard comprise. */
    optionIds?: string[] | null
}

/** Taille à retenir : celle choisie, sinon celle par défaut, sinon la première. */
export function resolveSize(sizes: SizeLike[], sizeId?: string | null): SizeLike | null {
    if (!sizes.length) return null
    if (sizeId) {
        const chosen = sizes.find((s) => s.id === sizeId)
        if (chosen) return chosen
    }
    return sizes.find((s) => s.isDefault) ?? sizes[0]
}

/**
 * Prix unitaire d'une composition configurée.
 *
 * `sizes` et `options` doivent venir de la base côté serveur : c'est ce qui empêche un
 * client de forger un prix. `fallbackPrice` ne sert que si aucune taille n'est définie.
 */
export function compositionPrice(
    selection: CompositionSelection,
    sizes: SizeLike[],
    options: OptionLike[],
    fallbackPrice: number,
): number {
    const size = resolveSize(sizes, selection.sizeId)
    const base = size ? size.price : fallbackPrice
    const quota = size?.includedChoices ?? 0

    const byId = new Map(options.map((o) => [o.id, o]))
    // L'ordre de sélection fait foi : « vos 2 fruits sont compris, le 3e est en supplément »
    // est la seule règle que le client peut anticiper en cochant.
    const chosen = (selection.optionIds ?? []).map((id) => byId.get(id)).filter(Boolean) as OptionLike[]

    if (quota > 0) {
        const extras = chosen.slice(quota).reduce((sum, option) => sum + option.extraPrice, 0)
        return Math.round((base + extras) * 100) / 100
    }

    // Formule fixe : les ingrédients de base sont compris, les autres facturés.
    const extras = chosen.reduce(
        (sum, option) => (option.includedByDefault ? sum : sum + option.extraPrice),
        0,
    )
    return Math.round((base + extras) * 100) / 100
}

/** Nombre d'ingrédients encore compris dans le prix pour ce format. */
export function remainingIncludedChoices(
    selection: CompositionSelection,
    sizes: SizeLike[],
): number | null {
    const size = resolveSize(sizes, selection.sizeId)
    const quota = size?.includedChoices ?? 0
    if (quota <= 0) return null
    return Math.max(0, quota - (selection.optionIds?.length ?? 0))
}

/**
 * Options cochées à l'ouverture.
 * Sur un format à quota, rien n'est pré-coché : c'est au client de choisir ses ingrédients,
 * lui en imposer reviendrait à décider à sa place. Sur une formule fixe, on présente la
 * recette standard du commerçant.
 */
export function defaultOptionIds(options: OptionLike[], size?: SizeLike | null): string[] {
    if ((size?.includedChoices ?? 0) > 0) return []
    return options.filter((o) => o.includedByDefault).map((o) => o.id)
}

/**
 * Nom de ce qu'on commande, pour le compteur de quantité.
 * « 1 plateau » sur un smoothie n'a aucun sens : l'unité suit le type de composition,
 * et retombe sur un terme neutre pour un type non prévu.
 */
export function compositionUnit(type?: string | null): string {
    const kind = (type ?? "").toLowerCase()
    if (kind.includes("jus") || kind.includes("smoothie")) return "verre"
    if (kind.includes("soupe")) return "portion"
    if (kind.includes("decoupe") || kind.includes("découpe") || kind.includes("plateau")) return "plateau"
    return "article"
}

/**
 * Titre du configurateur.
 * Le commerçant nomme souvent déjà sa composition « … à composer » : on n'ajoute le
 * suffixe que s'il manque, pour éviter « Smoothie à composer à composer ».
 */
export function compositionTitle(name: string): string {
    return /à composer\s*$/i.test(name) ? name : `${name} à composer`
}

/** Prix d'appel affiché en vitrine, sans configuration : le format le moins cher. */
export function startingPrice(sizes: SizeLike[], fallbackPrice: number): number {
    if (!sizes.length) return fallbackPrice
    return Math.min(...sizes.map((s) => s.price))
}

/** Récapitulatif lisible d'une sélection, pour le panier, l'email et la facture. */
export function describeSelection(
    selection: CompositionSelection,
    sizes: SizeLike[],
    options: OptionLike[],
): { sizeName: string | null; included: string[]; extras: { name: string; price: number }[] } {
    const size = resolveSize(sizes, selection.sizeId)
    const quota = size?.includedChoices ?? 0
    const byId = new Map(options.map((o) => [o.id, o]))
    const chosen = (selection.optionIds ?? []).map((id) => byId.get(id)).filter(Boolean) as OptionLike[]

    if (quota > 0) {
        return {
            sizeName: size?.name ?? null,
            included: chosen.slice(0, quota).map((o) => o.name),
            extras: chosen.slice(quota).map((o) => ({ name: o.name, price: o.extraPrice })),
        }
    }

    const included: string[] = []
    const extras: { name: string; price: number }[] = []
    for (const option of chosen) {
        if (option.includedByDefault) included.push(option.name)
        else extras.push({ name: option.name, price: option.extraPrice })
    }

    return { sizeName: size?.name ?? null, included, extras }
}
