"use client"

import { useState } from "react"
import Image from "next/image"
import { Plus, Minus, Leaf, Loader2 } from "lucide-react"
import { addToCart, decrementFromCart } from "@/app/actions/cart"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  price: number
  unit: string
  image: string
  category: string
  inStock: boolean
  organic: boolean
}

export default function ProductCardMobile({ product, onViewDetails }: { product: Product; onViewDetails?: () => void }) {
  const [quantity, setQuantity] = useState(0)
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      const result = await addToCart({ productId: product.id, quantity: 1 })
      if (result.success) {
        setQuantity(prev => prev + 1)
        toast.success(`${product.name} ajouté !`)
        window.dispatchEvent(new Event("cart-updated"))
      } else {
        toast.error(result.error || "Erreur")
      }
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      const result = await addToCart({ productId: product.id, quantity: 1 })
      if (result.success) {
        setQuantity(prev => prev + 1)
        window.dispatchEvent(new Event("cart-updated"))
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const handleDecrement = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      const result = await decrementFromCart(product.id)
      if (result.success) {
        setQuantity(result.newQuantity)
        window.dispatchEvent(new Event("cart-updated"))
      }
    } catch {
      toast.error("Erreur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex items-center gap-3 bg-zinc-900/60 border border-white/5 rounded-2xl p-3 active:bg-zinc-800/60 transition-colors cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`Voir le détail de ${product.name}`}
      onClick={onViewDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onViewDetails?.()
        }
      }}
    >
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800">
        <Image
          src={imgError ? "/placeholder.svg" : (product.image || "/placeholder.svg")}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-cover"
          onError={() => setImgError(true)}
        />
        {product.organic && (
          <div className="absolute top-0.5 left-0.5">
            <Leaf className="h-3 w-3 text-orange-500 drop-shadow-lg" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white truncate">{product.name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-orange-500 font-black text-sm">{product.price.toFixed(2)}€</span>
          <span className="text-zinc-600 text-[10px] uppercase">/ {product.unit}</span>
        </div>
      </div>

      {quantity === 0 ? (
        <button
          aria-label={`Ajouter ${product.name} au panier`}
          onClick={handleAdd}
          disabled={loading || !product.inStock}
          className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            aria-label={`Retirer ${product.name}`}
            onClick={handleDecrement}
            className="h-8 w-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-white font-bold text-sm w-5 text-center">{quantity}</span>
          <button
            aria-label={`Ajouter ${product.name}`}
            onClick={handleIncrement}
            disabled={loading}
            className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}
