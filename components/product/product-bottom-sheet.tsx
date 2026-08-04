"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
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
  promoPrice?: number | null
  unit: string
  image: string
  description: string
  category: string
  inStock: boolean
  organic: boolean
  /** Stock réel : borne la quantité commandable. */
  currentStock?: number
}

interface ProductBottomSheetProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

export default function ProductBottomSheet({ product, isOpen, onClose }: ProductBottomSheetProps) {
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
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-gradient-to-b from-[#f5f0e8] to-[#e8e0d4] text-zinc-900 border-zinc-300 max-h-[85vh]">
        <div className="overflow-y-auto flex-1">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-xl font-bold text-zinc-900 text-left">
              {product.name}
            </DrawerTitle>
          </DrawerHeader>

          {/* Image */}
          <div className="relative mx-4 mt-3">
            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              width={500}
              height={375}
              className="w-full aspect-[4/3] object-cover rounded-xl"
            />
            <div className="absolute top-3 left-3 flex flex-col gap-2">
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

          {/* Infos */}
          <div className="px-4 pt-4 space-y-4">
            <p className="text-sm text-zinc-500">{product.description}</p>

            <div className="flex items-center gap-3">
              {product.promoPrice != null && <span className="text-lg font-semibold text-zinc-400 line-through">{product.price.toFixed(2)}€</span>}
              <span className="text-2xl font-bold text-orange-500">{(product.promoPrice ?? product.price).toFixed(2)}€</span>
              <span className="text-zinc-400 text-sm">/{product.unit}</span>
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
            <div className="space-y-2.5">
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
          </div>
        </div>

        {/* Footer sticky */}
        <DrawerFooter className="border-t border-zinc-300 bg-[#e8e0d4]">
          <div className="flex items-center justify-between text-lg font-semibold text-zinc-900 mb-2">
            <span>Total :</span>
            <span className="text-orange-500">
              {lineTotal(product.promoPrice ?? product.price, quantity).toFixed(2)}€
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
