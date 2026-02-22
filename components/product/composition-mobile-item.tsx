"use client"

import ImageWithFallback from "./image-with-fallback"
import { ChefHat } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Composition {
  id: string
  name: string
  basePrice: number
  imageUrl: string | null
  description: string | null
}

export default function CompositionMobileItem({ composition, onCompose }: { composition: Composition; onCompose?: () => void }) {
  return (
    <div
      className="flex items-center gap-3 bg-zinc-900/60 border border-white/5 rounded-2xl p-3 active:bg-zinc-800/60 transition-colors"
      onClick={onCompose}
    >
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800">
        <ImageWithFallback
          src={composition.imageUrl || "/placeholder.svg"}
          alt={composition.name}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white truncate">{composition.name}</h3>
        <span className="text-orange-500 font-black text-sm">{composition.basePrice.toFixed(2)}€</span>
      </div>
      <Button
        onClick={(e) => {
          e.stopPropagation()
          onCompose?.()
        }}
        size="icon"
        className="flex-shrink-0 h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95"
      >
        <ChefHat className="w-4 h-4" />
      </Button>
    </div>
  )
}
