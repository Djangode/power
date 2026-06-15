"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import CartItem from "./cart-item"
import DeliveryCalendar from "@/components/delivery/delivery-calendar"
import { ShoppingBag, Truck, Calendar, Loader2 } from "lucide-react"
import { getCartItems, updateCartItemQuantity, removeCartItem, clearCart } from "@/app/actions/cart"
import { getDeliveryConfig } from "@/app/actions/content"
import { compositionUnitPrice, deliveryFee as computeDeliveryFee } from "@/lib/pricing"

interface DeliveryInfo {
  date: string
  time: string
  dateISO?: string
  slotId?: string
}

export default function CartPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryInfo | null>(null)
  const [deliveryConfig, setDeliveryConfig] = useState<{ fee: number; threshold: number }>({ fee: 4.9, threshold: 30 })

  useEffect(() => {
    loadCart()
    getDeliveryConfig().then((cfg) => { if (cfg) setDeliveryConfig(cfg) }).catch(() => {})
  }, [])

  const loadCart = async () => {
    try {
      setLoading(true)
      const res = await getCartItems()
      if (res.success && res.data) {
        setItems(res.data)
      }
    } catch (error) {
      console.error('Erreur chargement panier:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    try {
      const res = await updateCartItemQuantity(cartItemId, newQuantity)
      if (res.success) {
        setItems(items.map(i => i.id === cartItemId ? { ...i, quantity: newQuantity } : i))
      }
    } catch (error) {
      console.error('Erreur MAJ quantité:', error)
    }
  }

  const handleRemoveItem = async (cartItemId: string) => {
    try {
      const res = await removeCartItem(cartItemId)
      if (res.success) {
        setItems(items.filter(i => i.id !== cartItemId))
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const handleClearCart = async () => {
    try {
      const res = await clearCart()
      if (res.success) {
        setItems([])
      }
    } catch (error) {
      console.error('Erreur clear panier:', error)
    }
  }

  // Transformation des données brutes Prisma au format standardisé pour CartItem
  const getItemData = (item: any) => {
    if (item.product) {
      return {
        id: item.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        unit: item.product.unit,
        image: item.product.image || '/placeholder.svg',
        total: item.product.price * item.quantity,
        stock: item.product.currentStock ?? (item.product.inStock ? 99 : 0)
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
        unit: 'pièce',
        image: item.composition.imageUrl || '/placeholder.svg',
        total: customPrice * item.quantity,
        stock: 50,
        customData: item.customData || null
      }
    }
    return null
  }

  const processedItems = items.map(getItemData).filter((item): item is NonNullable<ReturnType<typeof getItemData>> => item !== null)
  const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0)
  const deliveryFee = computeDeliveryFee(subtotal, "livraison", deliveryConfig)
  const total = subtotal + deliveryFee

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="h-8 bg-zinc-800 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glassmorphism border-white/10">
                <CardContent className="p-4">
                  <div className="animate-pulse flex gap-4">
                    <div className="w-20 h-20 bg-zinc-800 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                      <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="lg:col-span-1">
            <Card className="glassmorphism border-white/10">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                  <div className="h-8 bg-zinc-800 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (processedItems.length === 0) {
    return (
      <div className="text-center py-16 bg-black text-white rounded-3xl border border-white/10 glassmorphism shadow-2xl">
        <ShoppingBag className="h-16 w-16 mx-auto text-zinc-500 mb-4" />
        <h2 className="text-2xl font-bold mb-4">Votre panier est vide</h2>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">Nos fruits frais, légumes coupés, jus et soupes artisanales n'attendent plus que vous pour faire le plein de vitamines.</p>
        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 px-8 text-lg rounded-full">
          <Link href="/#marketplace">Remplir mon panier</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto selection:bg-orange-500/30">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2 tracking-tight text-white">Panier.</h1>
        <p className="text-zinc-400 font-medium">
          {processedItems.length} article{processedItems.length > 1 ? "s" : ""} sélectionné{processedItems.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {processedItems.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
            />
          ))}

          {/* Clear Cart Button */}
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={handleClearCart}
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 border-red-500/20 bg-transparent rounded-full"
            >
              Vider le panier
            </Button>
          </div>

          {/* Delivery Options */}
          <Card className="glassmorphism border-white/10 bg-black/60 shadow-2xl mt-8">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-3 text-white">
                <Truck className="h-5 w-5 text-orange-500" />
                Détails de Livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 text-zinc-300">
                <div className="flex items-center justify-between p-4 border border-white/10 rounded-xl bg-white/5">
                  <div>
                    <p className="font-bold text-white">Livraison standard</p>
                    <p className="text-sm text-zinc-400 mt-1">Chez vous sous 24-48h (Chaîne du froid respectée)</p>
                  </div>
                  <span className="font-black text-xl text-orange-500 bg-orange-500/10 px-4 py-2 rounded-lg">{deliveryFee === 0 ? "Offert" : `${deliveryFee.toFixed(2)}€`}</span>
                </div>

                {deliveryFee > 0 && (
                  <div className="text-sm font-medium text-orange-400 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 flex items-center gap-2">
                    Il ne vous manque que <span className="font-bold">{(deliveryConfig.threshold - subtotal).toFixed(2)}€</span> pour profiter de la livraison gratuite !
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white rounded-xl py-6 transition-all"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <Calendar className="h-5 w-5 mr-3 text-orange-500" />
                  Programmer un créneau spécifique
                </Button>

                {showCalendar && (
                  <div className="p-4 border border-white/10 rounded-xl bg-black/40">
                    <DeliveryCalendar
                      onSelectDelivery={(delivery: DeliveryInfo) => setSelectedDelivery(delivery)}
                      selectedDelivery={selectedDelivery}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-28 glassmorphism border-white/10 bg-black/60 shadow-2xl">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-white">Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6 text-zinc-300">
              <div className="flex justify-between font-medium">
                <span>Sous-total des produits</span>
                <span className="text-white">{subtotal.toFixed(2)}€</span>
              </div>

              <div className="flex justify-between font-medium">
                <span>Frais de port fixes</span>
                <span className="text-white">{deliveryFee === 0 ? "Gratuit" : `${deliveryFee.toFixed(2)}€`}</span>
              </div>

              <Separator className="bg-white/10" />

              <div className="flex justify-between items-center text-xl font-black text-white py-2">
                <span>Total TTC</span>
                <span className="text-3xl text-orange-500">{total.toFixed(2)}€</span>
              </div>

              {selectedDelivery && (
                <div className="p-4 border border-orange-500/30 bg-orange-500/10 rounded-xl">
                  <p className="text-sm font-semibold text-orange-400">
                    🚚 Livraison programmée le {selectedDelivery.date} à {selectedDelivery.time}
                  </p>
                </div>
              )}

              <Button
                asChild
                className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] py-6 text-lg rounded-xl mt-4"
              >
                <Link href="/commande">Passer commande</Link>
              </Button>

              <Button variant="outline" className="w-full bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl py-6" asChild>
                <Link href="/#marketplace">Continuer mes achats</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}