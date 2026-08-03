"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Check, Loader2, Info } from "lucide-react"
import { addToCart } from "@/app/actions/cart"
import { toast } from "sonner"
import QuantitySelector from "@/components/product/quantity-selector"
import {
    compositionPrice,
    defaultOptionIds,
    resolveSize,
    remainingIncludedChoices,
    compositionUnit,
    type SizeLike,
    type OptionLike,
} from "@/lib/composition-pricing"

export type ConfigurableComposition = {
    id: string
    name: string
    /** Type métier (« jus », « soupe », « fruits-decoupes »…), qui nomme l'unité vendue. */
    type?: string | null
    description: string | null
    basePrice: number
    imageUrl: string | null
    sizes: (SizeLike & { description?: string | null })[]
    options: (OptionLike & { isRemovable?: boolean })[]
}

interface Props {
    composition: ConfigurableComposition
    onDone?: () => void
}

/**
 * Configurateur d'une composition : format, formule standard et suppléments.
 *
 * Le prix affiché suit exactement la règle facturée côté serveur — prix du format retenu
 * plus les suppléments cochés. Rien n'est calculé à partir des prix au kilo du catalogue :
 * trois morceaux de mangue dans un plateau ne coûtent pas un kilo de mangues.
 */
export default function CompositionConfigurator({ composition, onDone }: Props) {
    const { sizes, options } = composition

    const [sizeId, setSizeId] = useState<string | null>(null)
    const [selectedOptions, setSelectedOptions] = useState<string[]>([])
    const [quantity, setQuantity] = useState(1)
    const [isAdding, setIsAdding] = useState(false)

    // Sur un format à quota, rien n'est pré-coché : le client choisit ses ingrédients.
    // Sur une formule fixe, on présente la recette standard du commerçant.
    useEffect(() => {
        const size = resolveSize(sizes, null)
        setSizeId(size?.id ?? null)
        setSelectedOptions(defaultOptionIds(options, size))
        setQuantity(1)
    }, [composition.id, sizes, options])

    const currentSize = resolveSize(sizes, sizeId)
    const quota = currentSize?.includedChoices ?? 0
    const remaining = remainingIncludedChoices({ sizeId, optionIds: selectedOptions }, sizes)

    const includedOptions = useMemo(() => options.filter((o) => o.includedByDefault), [options])
    const extraOptions = useMemo(() => options.filter((o) => !o.includedByDefault), [options])

    const unitPrice = compositionPrice(
        { sizeId, optionIds: selectedOptions },
        sizes,
        options,
        composition.basePrice,
    )
    const total = unitPrice * quantity

    const toggleOption = (id: string) => {
        setSelectedOptions((prev) =>
            prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
        )
    }

    // Changer de format peut changer le quota : on repart d'une sélection cohérente
    // plutôt que de laisser un choix hérité facturer un supplément inattendu.
    const changeSize = (nextId: string) => {
        const next = sizes.find((s) => s.id === nextId)
        setSizeId(nextId)
        const nextQuota = next?.includedChoices ?? 0
        if (nextQuota <= 0 && quota > 0) setSelectedOptions(defaultOptionIds(options, next))
        if (nextQuota > 0 && quota <= 0) setSelectedOptions([])
    }

    /** Rang d'un ingrédient dans la sélection : au-delà du quota, il devient payant. */
    const rankOf = (id: string) => selectedOptions.indexOf(id)

    const handleAddToCart = async () => {
        setIsAdding(true)
        try {
            const result = await addToCart({
                compositionId: composition.id,
                quantity,
                // Seuls les identifiants sont transmis : le serveur retrouve les prix en base
                // et recalcule, pour qu'un montant forgé côté client ne serve à rien.
                customData: { sizeId, optionIds: selectedOptions },
            })

            if (result.success) {
                toast.success(`${quantity} × ${composition.name} ajouté au panier`)
                window.dispatchEvent(new Event("cart-updated"))
                onDone?.()
            } else {
                toast.error(result.error || "Erreur lors de l'ajout au panier.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Une erreur est survenue")
        } finally {
            setIsAdding(false)
        }
    }

    const noChoicesConfigured = sizes.length === 0 && options.length === 0

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visuel et description */}
            <div className="space-y-4">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-200">
                    <Image
                        src={composition.imageUrl || "/placeholder-product.jpg"}
                        alt={composition.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 300px"
                        className="object-cover"
                    />
                </div>
                {composition.description && (
                    <p className="text-zinc-600 text-sm">{composition.description}</p>
                )}
            </div>

            {/* Configuration */}
            <div className="space-y-5">
                {noChoicesConfigured && (
                    <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                            Aucun format ni ingrédient n&apos;est encore configuré pour cette
                            composition. Le tarif affiché est le prix de base.
                        </span>
                    </div>
                )}

                {/* Un format unique n'est pas un choix : on l'affiche comme une information
                    de prix plutôt qu'en sélecteur à un seul bouton. */}
                {sizes.length === 1 && (
                    <div className="flex items-baseline justify-between rounded-xl bg-white/60 border border-zinc-200 px-4 py-3">
                        <span className="text-sm font-semibold text-zinc-800">
                            {sizes[0].name}
                            {sizes[0].description && (
                                <span className="block text-xs font-normal text-zinc-500">{sizes[0].description}</span>
                            )}
                        </span>
                        <span className="text-lg font-bold text-orange-600">{sizes[0].price.toFixed(2)}€</span>
                    </div>
                )}

                {sizes.length > 1 && (
                    <div>
                        <label className="block text-sm font-semibold text-zinc-800 mb-2">Format</label>
                        <div className="grid grid-cols-3 gap-2">
                            {sizes.map((size) => (
                                <button
                                    key={size.id}
                                    type="button"
                                    onClick={() => changeSize(size.id)}
                                    aria-pressed={sizeId === size.id}
                                    className={`p-3 rounded-xl text-sm font-bold transition-all text-left ${
                                        sizeId === size.id
                                            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                                            : "bg-white/70 hover:bg-white text-zinc-900 border border-zinc-200"
                                    }`}
                                >
                                    <div>{size.name}</div>
                                    <div className={sizeId === size.id ? "text-white/90" : "text-orange-600"}>
                                        {size.price.toFixed(2)}€
                                    </div>
                                    {size.description && (
                                        <div className={`text-[11px] font-normal mt-0.5 ${sizeId === size.id ? "text-white/75" : "text-zinc-500"}`}>
                                            {size.description}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Format « N ingrédients au choix » : une seule liste, où les N premiers
                    sélectionnés sont compris et les suivants facturés. */}
                {quota > 0 && options.length > 0 && (
                    <div>
                        <div className="flex items-baseline justify-between mb-1">
                            <label className="block text-sm font-semibold text-zinc-800">
                                Choisissez {quota} ingrédient{quota > 1 ? "s" : ""}
                            </label>
                            <span className={`text-xs font-semibold ${remaining === 0 ? "text-zinc-500" : "text-orange-600"}`}>
                                {selectedOptions.length}/{quota} choisi{selectedOptions.length > 1 ? "s" : ""}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-2">
                            {remaining && remaining > 0
                                ? `Encore ${remaining} au choix, compris dans le prix.`
                                : "Quota atteint — chaque ingrédient de plus est facturé en supplément."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {options.map((option) => {
                                const rank = rankOf(option.id)
                                const active = rank >= 0
                                const isPaid = active && rank >= quota
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => toggleOption(option.id)}
                                        aria-pressed={active}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                            isPaid
                                                ? "bg-orange-500 border-orange-500 text-white"
                                                : active
                                                  ? "bg-green-500/15 border-green-500/40 text-green-800"
                                                  : "bg-white/60 border-zinc-200 text-zinc-700 hover:bg-white"
                                        }`}
                                    >
                                        {active && <Check className="inline h-3 w-3 mr-1" />}
                                        {option.name}
                                        {isPaid && (
                                            <span className="text-white/85 ml-1">+{option.extraPrice.toFixed(2)}€</span>
                                        )}
                                        {!active && remaining === 0 && (
                                            <span className="text-orange-600 ml-1">+{option.extraPrice.toFixed(2)}€</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {quota === 0 && includedOptions.length > 0 && (
                    <div>
                        <label className="block text-sm font-semibold text-zinc-800 mb-1">
                            Composition de base
                        </label>
                        <p className="text-xs text-zinc-500 mb-2">
                            Comprise dans le prix. Décochez ce que vous ne voulez pas.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {includedOptions.map((option) => {
                                const active = selectedOptions.includes(option.id)
                                const locked = option.isRemovable === false
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        disabled={locked}
                                        onClick={() => toggleOption(option.id)}
                                        aria-pressed={active}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                            active
                                                ? "bg-green-500/15 border-green-500/40 text-green-800"
                                                : "bg-white/60 border-zinc-200 text-zinc-400 line-through"
                                        } ${locked ? "opacity-70 cursor-not-allowed" : ""}`}
                                    >
                                        {active && <Check className="inline h-3 w-3 mr-1" />}
                                        {option.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {quota === 0 && extraOptions.length > 0 && (
                    <div>
                        <label className="block text-sm font-semibold text-zinc-800 mb-1">
                            Suppléments
                        </label>
                        <p className="text-xs text-zinc-500 mb-2">Ajoutés au prix du format.</p>
                        <div className="flex flex-wrap gap-2">
                            {extraOptions.map((option) => {
                                const active = selectedOptions.includes(option.id)
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => toggleOption(option.id)}
                                        aria-pressed={active}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                            active
                                                ? "bg-orange-500 border-orange-500 text-white"
                                                : "bg-white/60 border-zinc-200 text-zinc-700 hover:bg-white"
                                        }`}
                                    >
                                        {active && <Check className="inline h-3 w-3 mr-1" />}
                                        {option.name}
                                        <span className={active ? "text-white/85 ml-1" : "text-orange-600 ml-1"}>
                                            +{option.extraPrice.toFixed(2)}€
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-zinc-800 mb-2">Quantité</label>
                    <QuantitySelector value={quantity} onChange={setQuantity} unit={compositionUnit(composition.type)} />
                </div>

                <Separator className="bg-zinc-300" />

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-zinc-600">
                        <span>Prix unitaire</span>
                        <span>{unitPrice.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold text-zinc-900">
                        <span>Total</span>
                        <span className="text-orange-600">{total.toFixed(2)}€</span>
                    </div>

                    <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3"
                        onClick={handleAddToCart}
                        disabled={isAdding}
                    >
                        {isAdding ? (
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                            <ShoppingCart className="h-5 w-5 mr-2" />
                        )}
                        {isAdding ? "Ajout en cours…" : "Ajouter au panier"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
