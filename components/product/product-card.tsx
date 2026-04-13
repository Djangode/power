"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Plus, Minus, Leaf, Loader2, ShoppingCart } from "lucide-react"
import { addToCart } from "@/app/actions/cart"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  price: number
  unit: string
  image: string
  description: string
  category: string
  inStock: boolean
  organic: boolean
}

interface ProductCardProps {
  product: Product
  onViewDetails?: () => void
}

export default function ProductCard({ product, onViewDetails }: ProductCardProps) {
  const [quantity, setQuantity] = useState(0)
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleAdd = async () => {
    setLoading(true)
    try {
      const result = await addToCart({ productId: product.id, quantity: 1 })
      if (result.success) {
        setQuantity(prev => prev + 1)
        toast.success(`${product.name} ajouté au panier !`)
      } else {
        toast.error("Erreur")
      }
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const handleIncrement = async () => {
    setLoading(true)
    try {
      const result = await addToCart({ productId: product.id, quantity: 1 })
      if (result.success) {
        setQuantity(prev => prev + 1)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const handleDecrement = () => {
    setQuantity(prev => Math.max(0, prev - 1))
    // Note: la vraie décrémentation se fait côté panier
  }

  return (
    <Card className="group bg-zinc-950 border-zinc-800 rounded-[40px] overflow-hidden hover:border-orange-500/50 transition-all duration-500 h-full flex flex-col">
      <CardContent className="p-0 relative">
        <div className="relative aspect-square overflow-hidden bg-zinc-800">
          <Image
            src={imgError ? "/placeholder.svg" : (product.image || "/placeholder.svg")}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            onError={() => setImgError(true)}
          />

          <div className="absolute top-6 left-6 flex flex-col gap-2">
            {product.organic && (
              <Badge className="bg-orange-500 text-white border-0 font-black uppercase italic text-[10px] tracking-widest px-3 py-1 shadow-lg shadow-orange-500/20">
                <Leaf className="h-3 w-3 mr-1" />
                Bio
              </Badge>
            )}
            {!product.inStock && (
              <Badge className="bg-zinc-800 text-zinc-500 border border-white/10 font-black uppercase italic text-[10px] tracking-widest px-3 py-1">
                Rupture
              </Badge>
            )}
          </div>

          <Button
            size="icon"
            aria-label={`Voir les détails de ${product.name}`}
            className="absolute top-6 right-6 h-12 w-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-500 hover:border-orange-500"
            onClick={onViewDetails}
          >
            <Eye className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-2xl font-black text-white italic leading-none">{product.price.toFixed(2)}€ <span className="text-[10px] uppercase tracking-widest text-zinc-500">/ {product.unit}</span></span>
            </div>
          </div>
        </div>

        <div className="p-8 pb-4">
          <h3 className="text-2xl font-black uppercase italic text-white mb-2 line-clamp-1 group-hover:text-orange-500 transition-colors">{product.name}</h3>
          <p className="text-zinc-500 font-medium line-clamp-2 min-h-[48px] text-sm leading-relaxed">{product.description}</p>
        </div>
      </CardContent>

      <CardFooter className="p-8 pt-0 mt-auto">
        {quantity === 0 ? (
          <Button
            onClick={handleAdd}
            disabled={loading || !product.inStock}
            className="w-full h-14 rounded-[24px] bg-orange-500 hover:bg-orange-600 text-white font-black uppercase italic text-sm tracking-widest shadow-lg shadow-orange-500/20 transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
            {loading ? "" : "Ajouter au panier"}
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-4 w-full">
            <button
              aria-label={`Retirer ${product.name}`}
              onClick={handleDecrement}
              className="h-12 w-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors"
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="text-2xl font-black text-white w-8 text-center">{quantity}</span>
            <button
              aria-label={`Ajouter ${product.name}`}
              onClick={handleIncrement}
              disabled={loading}
              className="h-12 w-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
