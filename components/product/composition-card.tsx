"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import CompositionSheet from "@/components/product/composition-sheet"
import { startingPrice } from "@/lib/composition-pricing"
import type { ConfigurableComposition } from "@/components/product/composition-configurator"

interface Props {
    composition: ConfigurableComposition
    /** Pastille de contexte affichée sur l'image (« Fraîcheur garantie », « Pressé à froid »…). */
    badge?: React.ReactNode
    fallbackLabel?: string
}

/**
 * Carte vitrine d'une composition.
 *
 * Ouvre le configurateur au lieu d'ajouter directement au panier : une composition se
 * choisit par format et par ingrédients, l'ajouter en un clic reviendrait à imposer une
 * formule et un prix que le client n'a pas vus.
 */
export default function CompositionCard({ composition, badge, fallbackLabel = "À COMPOSER" }: Props) {
    const [open, setOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    const from = startingPrice(composition.sizes, composition.basePrice)
    // « à partir de » ne se justifie qu'avec plusieurs formats ou des suppléments
    // susceptibles de faire monter le prix.
    const priceVaries = composition.sizes.length > 1 || composition.options.length > 0

    const openSheet = () => {
        setIsMobile(window.matchMedia("(max-width: 767px)").matches)
        setOpen(true)
    }

    return (
        <>
            <div className="group glassmorphism bg-zinc-900/40 rounded-[48px] overflow-hidden border border-white/5 hover:border-orange-500/50 transition-all flex flex-col">
                <button
                    type="button"
                    onClick={openSheet}
                    className="relative h-72 overflow-hidden text-left"
                    aria-label={`Composer ${composition.name}`}
                >
                    {composition.imageUrl ? (
                        <Image
                            src={composition.imageUrl}
                            alt={composition.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-110 transition-transform duration-1000"
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl font-black text-zinc-700 italic">
                            {fallbackLabel}
                        </div>
                    )}
                    {badge}
                </button>

                <div className="p-8 flex flex-col flex-1">
                    <h3 className="text-2xl font-black uppercase italic mb-3 text-white group-hover:text-orange-500 transition-colors">
                        {composition.name}
                    </h3>
                    <p className="text-zinc-500 mb-6 line-clamp-2">
                        {composition.description || "Un produit ultra-frais, prêt pour vos recettes."}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3">
                        <div>
                            {priceVaries && (
                                <span className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                    à partir de
                                </span>
                            )}
                            <span className="text-3xl font-black text-white">{from.toFixed(2)}€</span>
                        </div>
                        <Button
                            onClick={openSheet}
                            className="h-12 px-6 text-sm rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold"
                        >
                            <Settings2 className="h-4 w-4 mr-2" />
                            Composer
                        </Button>
                    </div>
                </div>
            </div>

            {open && (
                <CompositionSheet
                    composition={composition}
                    isOpen={open}
                    onClose={() => setOpen(false)}
                    isMobile={isMobile}
                />
            )}
        </>
    )
}
