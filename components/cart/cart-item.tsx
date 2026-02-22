"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, AlertTriangle, Plus, Minus } from "lucide-react"

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
  }
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const isOutOfStock = item.stock !== null && item.stock !== undefined && item.stock < item.quantity
  const isLowStock = item.stock !== null && item.stock !== undefined && item.stock < 5 && item.stock >= item.quantity

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
              {item.price.toFixed(2)}€ / {item.unit}
            </p>
            {item.customData?.size && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">
                  Taille: {item.customData.sizeLabel || item.customData.size}
                </p>
                {item.customData.ingredients?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.customData.ingredients.map((ing: any, i: number) => (
                      <span key={i} className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                        {ing.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isOutOfStock && (
              <p className="text-red-600 text-sm font-medium mt-1">
                Stock insuffisant ({item.stock || 0} disponible{(item.stock || 0) > 1 ? "s" : ""})
              </p>
            )}
            {isLowStock && (
              <p className="text-orange-600 text-sm mt-1">
                Stock faible ({item.stock || 0} restant{(item.stock || 0) > 1 ? "s" : ""})
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Boutons ronds - qty + */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                disabled={isOutOfStock}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                disabled={isOutOfStock}
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
