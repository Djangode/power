"use client"

import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { quantityStep, minQuantity, roundToStep, formatQuantity, isWeighed, unitLabel } from "@/lib/units"

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  /** Unité de vente : détermine le pas (100 g au kilo, 1 sinon) et l'affichage. */
  unit: string
  /** Stock disponible : borne haute de la saisie. Absent = pas de limite connue. */
  max?: number
  disabled?: boolean
  className?: string
}

/**
 * Sélection de quantité pour un produit de primeur.
 *
 * Les produits au poids avancent par tranches de 100 g : un foyer d'une personne n'achète
 * pas un kilo de tomates, et l'imposer faisait renoncer à la commande. Les autres unités
 * restent entières — on ne vend pas un dixième de botte.
 */
export default function QuantitySelector({
  value,
  onChange,
  unit,
  max,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const step = quantityStep(unit)
  const floor = minQuantity(unit)
  const ceiling = max && max > 0 ? max : undefined
  const weighed = isWeighed(unit)

  const clamp = (n: number) => {
    if (!Number.isFinite(n)) return floor
    const aligned = roundToStep(Math.max(floor, n), unit)
    return ceiling ? Math.min(aligned, roundToStep(ceiling, unit)) : aligned
  }

  // Garde-fou d'affichage : une valeur héritée d'une autre unité (0,2 sur un article
  // vendu à la pièce) est ramenée au pas courant plutôt que montrée telle quelle.
  const safeValue = clamp(value)

  const atMax = ceiling != null && safeValue >= ceiling
  const atMin = safeValue <= floor

  // Au poids, on saisit en grammes : taper « 300 » est plus naturel que « 0,3 ».
  const displayValue = weighed ? Math.round(safeValue * 1000) : safeValue
  const handleInput = (raw: string) => {
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    onChange(clamp(weighed ? n / 1000 : n))
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          // Couleurs explicites : le variant "outline" hérite du thème sombre global et
          // rendait ces boutons noirs sur le fond clair des modales, illisibles au repos.
          className="h-11 w-11 rounded-xl shrink-0 !bg-white !border-zinc-300 !text-zinc-900
                     hover:!bg-orange-50 hover:!border-orange-400 hover:!text-orange-600
                     disabled:!bg-zinc-100 disabled:!text-zinc-400 disabled:!border-zinc-200"
          onClick={() => onChange(clamp(safeValue - step))}
          disabled={disabled || atMin}
          aria-label={weighed ? "Retirer 100 grammes" : "Diminuer la quantité"}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="flex items-baseline gap-2 flex-1 justify-center">
          <input
            type="number"
            inputMode="numeric"
            min={weighed ? floor * 1000 : floor}
            max={ceiling ? (weighed ? ceiling * 1000 : ceiling) : undefined}
            step={weighed ? 100 : 1}
            value={displayValue}
            disabled={disabled}
            onChange={(e) => handleInput(e.target.value)}
            aria-label={weighed ? "Quantité en grammes" : `Quantité en ${unitLabel(unit)}`}
            className="w-20 bg-transparent text-center text-2xl font-bold text-zinc-900 outline-none
                       [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm text-zinc-500">{weighed ? "g" : unitLabel(unit)}</span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl shrink-0 !bg-white !border-zinc-300 !text-zinc-900
                     hover:!bg-orange-50 hover:!border-orange-400 hover:!text-orange-600
                     disabled:!bg-zinc-100 disabled:!text-zinc-400 disabled:!border-zinc-200"
          onClick={() => onChange(clamp(safeValue + step))}
          disabled={disabled || atMax}
          aria-label={weighed ? "Ajouter 100 grammes" : "Augmenter la quantité"}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-center text-zinc-500">
        {atMax
          ? `Stock maximum disponible (${formatQuantity(ceiling!, unit)})`
          : weighed
            ? `Soit ${formatQuantity(safeValue, unit)} — vendu au poids, par tranches de 100 g`
            : formatQuantity(safeValue, unit)}
      </p>
    </div>
  )
}
