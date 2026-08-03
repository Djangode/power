/**
 * Unités de vente du catalogue — source unique.
 *
 * Deux listes divergentes coexistaient dans l'admin (« piece » côté Produits,
 * « pièce » côté Stock), ce qui a créé deux unités distinctes en base pour la même
 * réalité : les regroupements et les filtres par unité s'en trouvaient faussés.
 *
 * La valeur stockée est sans accent ni espace, l'accentuation vit dans le libellé.
 */
export const PRODUCT_UNITS = [
    { value: "kg", label: "Kilogramme (kg)", short: "kg" },
    { value: "piece", label: "Pièce", short: "pièce" },
    { value: "botte", label: "Botte", short: "botte" },
    { value: "barquette", label: "Barquette", short: "barquette" },
    { value: "sachet", label: "Sachet", short: "sachet" },
    { value: "filet", label: "Filet", short: "filet" },
    { value: "lot", label: "Lot", short: "lot" },
] as const

export type ProductUnit = (typeof PRODUCT_UNITS)[number]["value"]

/**
 * Vente au poids.
 *
 * Le kilo se vend par tranches de 100 g : un foyer d'une personne n'achète pas un kilo de
 * tomates, et l'imposer faisait renoncer à la commande. Les autres unités restent
 * indivisibles — on ne vend pas un dixième de botte de radis.
 */
export const WEIGHT_STEP_KG = 0.1

export function isWeighed(unit: string): boolean {
    return normalizeUnit(unit) === "kg"
}

/** Incrément d'un bouton +/− pour cette unité. */
export function quantityStep(unit: string): number {
    return isWeighed(unit) ? WEIGHT_STEP_KG : 1
}

/** Quantité minimale commandable. */
export function minQuantity(unit: string): number {
    return quantityStep(unit)
}

/**
 * Aligne une quantité sur le pas de l'unité.
 * Les flottants ne tombent pas juste (0.1 + 0.2 = 0.30000000000000004) : on arrondit au
 * pas pour que 300 g reste 300 g, en base comme sur la facture.
 */
export function roundToStep(quantity: number, unit: string): number {
    const step = quantityStep(unit)
    const rounded = Math.round(quantity / step) * step
    return Math.round(rounded * 1000) / 1000
}

/**
 * Quantité lisible par un humain : « 300 g » plutôt que « 0.3 kg », « 1,5 kg » au-delà
 * du kilo, et le nom de l'unité au pluriel pour le reste.
 */
export function formatQuantity(quantity: number, unit: string): string {
    if (isWeighed(unit)) {
        if (quantity < 1) return `${Math.round(quantity * 1000)} g`
        const kg = Math.round(quantity * 1000) / 1000
        return `${String(kg).replace(".", ",")} kg`
    }

    const label = unitLabel(unit)
    const plural = quantity > 1 && !label.endsWith("s") ? `${label}s` : label
    return `${quantity} ${plural}`
}

/** Prix d'une ligne : le tarif du catalogue est toujours exprimé pour une unité entière. */
export function lineTotal(unitPrice: number, quantity: number): number {
    return Math.round(unitPrice * quantity * 100) / 100
}

/** Libellé court affiché au client (« 2 pièce » plutôt que « 2 piece »). */
export function unitLabel(value: string): string {
    return PRODUCT_UNITS.find((u) => u.value === value)?.short ?? value
}

/**
 * Ramène une saisie libre vers une unité connue.
 * Tolère les accents et la casse, pour rattraper l'historique et les imports.
 */
export function normalizeUnit(value: string | null | undefined): string {
    if (!value) return "kg"
    const cleaned = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim()
    return PRODUCT_UNITS.find((u) => u.value === cleaned)?.value ?? value
}
