"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import DeliveryCalendar from "@/components/delivery/delivery-calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getCartItems } from "@/app/actions/cart"
import { Truck, Store, ArrowLeft, Loader2, MapPin, Clock } from "lucide-react"
import { toast } from "sonner"

interface DeliveryInfo {
  date: string
  time: string
}

type DeliveryMethod = "livraison" | "retrait"

export default function CommandePage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("livraison")
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryInfo | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  useEffect(() => {
    async function loadCart() {
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
    }
    loadCart()
  }, [])

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
      const customPrice = item.customData?.totalPrice
        ? item.customData.totalPrice / item.quantity
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
  const deliveryFee = deliveryMethod === "retrait" ? 0 : (subtotal > 30 ? 0 : 4.9)
  const total = subtotal + deliveryFee

  const handleCheckout = async () => {
    if (deliveryMethod === "livraison" && !selectedDelivery) {
      toast.error("Veuillez choisir une date et un créneau de livraison")
      return
    }
    try {
      setIsCheckingOut(true)
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryMethod,
          deliveryDate: selectedDelivery?.date,
          deliveryTime: selectedDelivery?.time,
        })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Erreur lors de l'initialisation du paiement")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error("Impossible de procéder au paiement")
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="pt-32 pb-16 px-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </div>
    )
  }

  if (processedItems.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="pt-32 pb-16 px-4 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-black mb-4">Votre panier est vide</h1>
          <p className="text-zinc-400 mb-8">Ajoutez des produits avant de passer commande.</p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-6">
            <Link href="/#marketplace">Voir les produits</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="pt-32 pb-16 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Back */}
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Retour à la boutique
          </Link>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
            Finaliser ma <span className="text-orange-500">commande</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Colonne gauche : mode de livraison + calendrier */}
            <div className="lg:col-span-2 space-y-6">

              {/* Choix livraison / retrait */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Mode de réception</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDeliveryMethod("livraison")}
                    className={`p-5 rounded-2xl border transition-all text-left ${
                      deliveryMethod === "livraison"
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <Truck className={`h-6 w-6 mb-2 ${deliveryMethod === "livraison" ? "text-orange-500" : "text-zinc-400"}`} />
                    <p className="font-bold text-white">Livraison</p>
                    <p className="text-xs text-zinc-400 mt-1">Chez vous sous 24-48h</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {subtotal > 30 ? "Gratuit" : "4.90€"} {subtotal <= 30 && `(gratuit dès 30€)`}
                    </p>
                  </button>
                  <button
                    onClick={() => { setDeliveryMethod("retrait"); setSelectedDelivery(null) }}
                    className={`p-5 rounded-2xl border transition-all text-left ${
                      deliveryMethod === "retrait"
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <Store className={`h-6 w-6 mb-2 ${deliveryMethod === "retrait" ? "text-orange-500" : "text-zinc-400"}`} />
                    <p className="font-bold text-white">Retrait en magasin</p>
                    <p className="text-xs text-zinc-400 mt-1">Venez chercher votre commande</p>
                    <p className="text-xs text-green-400 mt-1">Gratuit</p>
                  </button>
                </div>
              </div>

              {/* Calendrier livraison OU info retrait */}
              {deliveryMethod === "livraison" ? (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Date et créneau de livraison</h2>
                  <DeliveryCalendar
                    onSelectDelivery={setSelectedDelivery}
                    selectedDelivery={selectedDelivery}
                  />
                </div>
              ) : (
                <Card className="glassmorphism bg-zinc-900/40 border-white/5 rounded-2xl">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-orange-500" />
                      Point de retrait
                    </h3>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="font-semibold text-white">Power — Primeur</p>
                      <p className="text-sm text-zinc-400 mt-1">Adresse du magasin</p>
                      <p className="text-sm text-zinc-400">97100 Guadeloupe</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span>Disponible sous 2h après confirmation</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Colonne droite : récap */}
            <div className="lg:col-span-1">
              <Card className="sticky top-28 glassmorphism bg-zinc-900/40 border-white/10 rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-bold text-white">Récapitulatif</h3>

                  {/* Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {processedItems.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                          <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.name}</p>
                          <p className="text-xs text-zinc-400">{item.quantity} x {item.price.toFixed(2)}€</p>
                          {item.customData?.ingredients?.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {item.customData.ingredients.map((ing: any, i: number) => (
                                <span key={i} className="text-[8px] bg-orange-500/10 text-orange-400 px-1 rounded">
                                  {ing.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-white flex-shrink-0">{item.total.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-zinc-400">
                      <span>Sous-total</span>
                      <span className="text-white">{subtotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>{deliveryMethod === "retrait" ? "Retrait" : "Livraison"}</span>
                      <span className={deliveryFee === 0 ? "text-green-400" : "text-white"}>
                        {deliveryFee === 0 ? "Gratuit" : `${deliveryFee.toFixed(2)}€`}
                      </span>
                    </div>
                    {selectedDelivery && (
                      <div className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1.5 rounded-lg">
                        {selectedDelivery.date} — {selectedDelivery.time}
                      </div>
                    )}
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">Total TTC</span>
                    <span className="text-2xl font-black text-orange-500">{total.toFixed(2)}€</span>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={isCheckingOut || (deliveryMethod === "livraison" && !selectedDelivery)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] text-base disabled:opacity-50"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      "Procéder au paiement"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
