"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Leaf, Truck, Shield, Loader2 } from "lucide-react"
import { addToCart } from "@/app/actions/cart"
import { toast } from "sonner"
import QuantitySelector from "@/components/product/quantity-selector"
import { minQuantity, formatQuantity, lineTotal } from "@/lib/units"

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
  /** Stock réel : borne la quantité commandable. */
  currentStock?: number
}

interface ProductModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(() => minQuantity(product.unit))
  const [isAdding, setIsAdding] = useState(false)

  // Le provider monte cette modale une seule fois et ne change que le produit en props :
  // sans cette remise à zéro, la quantité d'un article au poids (0,2 kg) restait affichée
  // sur l'article suivant vendu à la pièce, soit « 0,2 pièce ».
  useEffect(() => {
    setQuantity(minQuantity(product.unit))
  }, [product.id, product.unit])

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      const result = await addToCart({ productId: product.id, quantity })
      if (result.success) {
        toast.success(`${formatQuantity(quantity, product.unit)} de ${product.name} ajouté au panier`)
        onClose()
      } else {
        // Le message serveur porte l'information utile (stock restant, produit retiré) :
        // l'afficher évite un « Erreur » opaque devant lequel le client abandonne.
        toast.error(result.error || "Erreur lors de l'ajout au panier.")
      }
    } catch (error) {
      console.error(error)
      toast.error("Une erreur est survenue")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#f5f0e8] to-[#e8e0d4] text-zinc-900 border-zinc-300">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="relative">
            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              width={500}
              height={400}
              className="w-full h-80 object-cover rounded-lg"
            />

            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.organic && (
                <Badge className="badge-brand">
                  <Leaf className="h-3 w-3 mr-1" />
                  Bio
                </Badge>
              )}
              {!product.inStock && (
                <Badge className="badge-error">
                  Rupture de stock
                </Badge>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-zinc-500 mb-4">{product.description}</p>

              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-bold text-orange-500">{product.price.toFixed(2)}€</span>
                <span className="text-zinc-400">/{product.unit}</span>
              </div>
            </div>

            <Separator className="bg-zinc-200" />

            {/* Quantité */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Quantité</label>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                unit={product.unit}
                max={product.currentStock}
                disabled={!product.inStock}
              />
            </div>

            <Separator className="bg-zinc-200" />

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Truck className="h-4 w-4 text-orange-500" />
                <span>Livraison sous 24h</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Shield className="h-4 w-4 text-orange-500" />
                <span>Fraîcheur garantie</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Leaf className="h-4 w-4 text-orange-500" />
                <span>Produit local</span>
              </div>
            </div>

            <Separator className="bg-zinc-200" />

            {/* Add to Cart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-lg font-semibold text-zinc-900">
                <span>Total :</span>
                <span className="text-orange-500">
                  {lineTotal(product.price, quantity).toFixed(2)}€
                </span>
              </div>

              <Button
                className="w-full btn-primary py-3"
                onClick={handleAddToCart}
                disabled={!product.inStock || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-5 w-5 mr-2" />
                )}
                {isAdding ? "Ajout en cours..." : "Ajouter au panier"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}