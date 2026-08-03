"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, AlertTriangle, Plus, Minus } from "lucide-react"
import { quantityStep, roundToStep, formatQuantity, isWeighed, unitLabel } from "@/lib/units"

interface CartItemProps {
  item: {
    id: string
    name: string
    price: number
    quantity: number
    unit: string
    image: string
    total: number
    stock?: number | null
    customData?: any
    /** Détail lisible d'une composition configurée (format, formule, suppléments). */
    selection?: {
      sizeName: string | null
      included: string[]
      extras: { name: string; price: number }[]
    } | null
  }
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const isOutOfStock = item.stock !== null && item.stock !== undefined && item.stock < item.quantity
  const isLowStock = item.stock !== null && item.stock !== undefined && item.stock < 5 && item.stock >= item.quantity
  const atStockCeiling = item.stock !== null && item.stock !== undefined && item.quantity >= item.stock
  const step = quantityStep(item.unit)
  const weighed = isWeighed(item.unit)

  return (
    <Card className={`glassmorphism border-white/10 bg-black/40 ${isOutOfStock ? "border-red-500/30 bg-red-900/20" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <Image
              src={item.image || "/placeholder.svg"}
              alt={item.name}
              fill
              sizes="80px"
              className={`object-cover rounded-lg ${isOutOfStock ? "opacity-50" : ""}`}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-75 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg ${isOutOfStock ? "text-red-600" : ""}`}>
              {item.name}
            </h3>
            <p className="text-zinc-400 text-sm">
              {item.price.toFixed(2)}€ / {unitLabel(item.unit)}
            </p>
            {/* Récapitulatif d'une composition : format, formule retenue et suppléments.
                Sans ce détail, deux plateaux configurés différemment sont indiscernables
                dans le panier alors qu'ils n'ont ni le même contenu ni le même prix. */}
            {item.selection && (
              <div className="mt-1 space-y-1">
                {item.selection.sizeName && (
                  <p className="text-xs text-zinc-300 font-medium">
                    Format : {item.selection.sizeName}
                  </p>
                )}
                {item.selection.included.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.selection.included.map((name, i) => (
                      <span key={`inc-${i}`} className="text-[10px] bg-white/5 text-zinc-400 border border-white/10 px-1.5 py-0.5 rounded-full">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
                {item.selection.extras.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.selection.extras.map((extra, i) => (
                      <span key={`ext-${i}`} className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                        {extra.name} +{extra.price.toFixed(2)}€
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isOutOfStock && (
              <p className="text-red-600 text-sm font-medium mt-1">
                Stock insuffisant ({formatQuantity(item.stock || 0, item.unit)} disponible)
              </p>
            )}
            {isLowStock && (
              <p className="text-orange-600 text-sm mt-1">
                Stock faible ({formatQuantity(item.stock || 0, item.unit)} restant)
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Boutons ronds - qty +.
                Les libellés accessibles nomment le produit : un lecteur d'écran qui annonce
                « bouton » sur chaque ligne d'un panier de dix articles est inutilisable. */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(item.id, roundToStep(item.quantity - step, item.unit))}
                disabled={isOutOfStock || item.quantity <= step}
                aria-label={weighed ? `Retirer 100 grammes de ${item.name}` : `Retirer un ${item.unit} de ${item.name}`}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              {/* Au poids, on montre « 300 g » plutôt que « 0.3 » : la quantité brute
                  ne veut rien dire pour un client qui achète des tomates. */}
              <span className="min-w-[64px] text-center font-bold text-lg" aria-live="polite">
                {formatQuantity(item.quantity, item.unit)}
                <span className="sr-only"> de {item.name}</span>
              </span>
              <button
                onClick={() => onUpdateQuantity(item.id, roundToStep(item.quantity + step, item.unit))}
                // Borné au stock réel : laisser incrémenter au-delà ne produit qu'un refus
                // serveur quelques secondes plus tard, sans expliquer pourquoi.
                disabled={isOutOfStock || atStockCeiling}
                aria-label={weighed ? `Ajouter 100 grammes de ${item.name}` : `Ajouter un ${item.unit} de ${item.name}`}
                className="h-9 w-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="text-right min-w-[70px]">
              <p className={`font-bold text-lg ${isOutOfStock ? "text-red-600 line-through" : ""}`}>
                {item.total.toFixed(2)}€
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(item.id)}
              aria-label={`Retirer ${item.name} du panier`}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
