"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import ImageWithFallback from "@/components/product/image-with-fallback"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ShoppingBag, Plus, Minus, Trash2, Loader2, X } from "lucide-react"
import { getCartItems, updateCartItemQuantity, removeCartItem } from "@/app/actions/cart"
import { getDeliveryConfig } from "@/app/actions/content"
import { compositionUnitPrice, deliveryFee as computeDeliveryFee } from "@/lib/pricing"

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deliveryConfig, setDeliveryConfig] = useState<{ fee: number; threshold: number }>({ fee: 4.9, threshold: 30 })

  useEffect(() => {
    getDeliveryConfig().then((cfg) => { if (cfg) setDeliveryConfig(cfg) }).catch(() => {})
  }, [])

  const loadCart = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getCartItems()
      if (res.success && res.data) {
        setItems(res.data)
      }
    } catch (error) {
      console.error("Erreur chargement panier:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadCart()
  }, [open, loadCart])

  // Écouter les ajouts au panier pour refresh
  useEffect(() => {
    const handler = () => { if (open) loadCart() }
    window.addEventListener("cart-updated", handler)
    return () => window.removeEventListener("cart-updated", handler)
  }, [open, loadCart])

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    setUpdatingId(cartItemId)
    try {
      if (newQuantity <= 0) {
        const res = await removeCartItem(cartItemId)
        if (res.success) {
          setItems(items.filter(i => i.id !== cartItemId))
          window.dispatchEvent(new Event("cart-updated"))
        }
      } else {
        const res = await updateCartItemQuantity(cartItemId, newQuantity)
        if (res.success) {
          setItems(items.map(i => i.id === cartItemId ? { ...i, quantity: newQuantity } : i))
        }
      }
    } catch (error) {
      console.error("Erreur MAJ quantité:", error)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRemoveItem = async (cartItemId: string) => {
    setUpdatingId(cartItemId)
    try {
      const res = await removeCartItem(cartItemId)
      if (res.success) {
        setItems(items.filter(i => i.id !== cartItemId))
        window.dispatchEvent(new Event("cart-updated"))
      }
    } catch (error) {
      console.error("Erreur suppression:", error)
    } finally {
      setUpdatingId(null)
    }
  }

  const getItemData = (item: any) => {
    if (item.product) {
      return {
        id: item.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        unit: item.product.unit,
        image: item.product.image || "/placeholder.svg",
        total: item.product.price * item.quantity,
        customData: null,
      }
    } else if (item.composition) {
      const customPrice = item.customData
        ? compositionUnitPrice(item.composition.basePrice, item.customData)
        : item.composition.basePrice
      return {
        id: item.id,
        name: item.composition.name,
        price: customPrice,
        quantity: item.quantity,
        unit: "pièce",
        image: item.composition.imageUrl || "/placeholder.svg",
        total: customPrice * item.quantity,
        customData: item.customData || null,
      }
    }
    return null
  }

  const processedItems = items.map(getItemData).filter(Boolean) as NonNullable<ReturnType<typeof getItemData>>[]
  const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0)
  const deliveryFee = computeDeliveryFee(subtotal, "livraison", deliveryConfig)
  const total = subtotal + deliveryFee
  const totalQuantity = processedItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-gradient-to-b from-[#f5f0e8] via-[#e8e0d4] to-[#d4cbbe] border-zinc-300 p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 pb-3 border-b border-zinc-300">
          <SheetTitle className="text-zinc-900 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-orange-500" />
            Mon Panier
            {totalQuantity > 0 && (
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                {totalQuantity}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : processedItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 mx-auto text-zinc-400 mb-3" />
              <p className="text-zinc-700 font-medium mb-1">Votre panier est vide</p>
              <p className="text-zinc-500 text-sm mb-4">Ajoutez des produits depuis notre marketplace</p>
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6"
                asChild
              >
                <Link href="/#marketplace">Voir les produits</Link>
              </Button>
            </div>
          ) : (
            processedItems.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-white/60 border border-zinc-200 shadow-sm">
                {/* Image */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-200">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-900 truncate">{item.name}</h4>
                  <p className="text-xs text-zinc-500">{item.price.toFixed(2)}€ / {item.unit}</p>

                  {/* Ingrédients composition */}
                  {item.customData?.size && (
                    <div className="mt-1">
                      <span className="text-[10px] text-zinc-500">
                        {item.customData.sizeLabel || item.customData.size}
                      </span>
                      {item.customData.ingredients?.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {item.customData.ingredients.map((ing: any, i: number) => (
                            <span key={i} className="text-[9px] bg-orange-500/15 text-orange-600 px-1 py-0.5 rounded">
                              {ing.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quantité + prix */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        aria-label={`Réduire la quantité de ${item.name}`}
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={updatingId === item.id}
                        className="h-7 w-7 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-zinc-700 transition-colors disabled:opacity-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-zinc-900">{item.quantity}</span>
                      <button
                        aria-label={`Augmenter la quantité de ${item.name}`}
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={updatingId === item.id}
                        className="h-7 w-7 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white transition-colors disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900">{item.total.toFixed(2)}€</span>
                      <button
                        aria-label={`Supprimer ${item.name} du panier`}
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={updatingId === item.id}
                        className="h-7 w-7 rounded-full hover:bg-red-100 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer — Résumé + Passer commande */}
        {processedItems.length > 0 && (
          <div className="border-t border-zinc-300 p-4 space-y-3 bg-[#e8e0d4]">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Sous-total</span>
              <span className="text-zinc-900 font-medium">{subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Livraison</span>
              <span className={deliveryFee === 0 ? "text-green-600 font-medium" : "text-zinc-900 font-medium"}>
                {deliveryFee === 0 ? "Gratuit" : `${deliveryFee.toFixed(2)}€`}
              </span>
            </div>
            {deliveryFee > 0 && (
              <p className="text-[10px] text-orange-600 bg-orange-500/10 px-2 py-1 rounded-lg text-center">
                Plus que {(deliveryConfig.threshold - subtotal).toFixed(2)}€ pour la livraison gratuite
              </p>
            )}
            <Separator className="bg-zinc-300" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-900 font-bold">Total TTC</span>
              <span className="text-xl font-black text-orange-500">{total.toFixed(2)}€</span>
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] text-base"
              asChild
              onClick={() => onOpenChange(false)}
            >
              <Link href="/commande">
                Passer commande
              </Link>
            </Button>

            <button
              onClick={() => onOpenChange(false)}
              className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700 transition-colors py-1"
            >
              Continuer mes achats
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
