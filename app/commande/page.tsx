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
import { Input } from "@/components/ui/input"
import { getCartItems } from "@/app/actions/cart"
import { getUserProfile } from "@/app/actions/account"
import { getDeliveryConfig } from "@/app/actions/content"
import { cartItemUnitPrice, deliveryFee as computeDeliveryFee } from "@/lib/pricing"
import { describeSelection } from "@/lib/composition-pricing"
import { Truck, Store, ArrowLeft, Loader2, MapPin, Clock, User, Tag, X, Banknote, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface DeliveryInfo {
  date: string
  time: string
  dateISO?: string
  slotId?: string
}

interface PromoResult {
  code: string
  type: string
  value: number
  discount: number
  label: string
}

type DeliveryMethod = "livraison" | "retrait"

export default function CommandePage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("livraison")
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryInfo | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card_on_delivery">("cash")
  const [deliveryConfig, setDeliveryConfig] = useState<{ fee: number; threshold: number }>({ fee: 4.9, threshold: 30 })

  // Promo code
  const [promoInput, setPromoInput] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null)

  // Address fields
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [cartRes, profileRes, cfgRes] = await Promise.all([
          getCartItems(),
          getUserProfile(),
          getDeliveryConfig()
        ])
        if (cartRes.success && cartRes.data) {
          setItems(cartRes.data)
        }
        if (profileRes.success && profileRes.data) {
          const u = profileRes.data
          setAddress(u.address || "")
          setCity(u.city || "")
          setPostalCode(u.postalCode || "")
          setPhone(u.phone || "")
        }
        if (cfgRes) {
          setDeliveryConfig(cfgRes)
        }
      } catch (error) {
        console.error("Erreur chargement:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getItemData = (item: any) => {
    if (item.product) {
      return {
        id: item.id,
        name: item.product.name,
        price: item.product.promoPrice ?? item.product.price,
        oldPrice: item.product.promoPrice != null ? item.product.price : null,
        quantity: item.quantity,
        unit: item.product.unit,
        image: item.product.image || "/placeholder.svg",
        total: (item.product.promoPrice ?? item.product.price) * item.quantity,
        customData: null,
      }
    } else if (item.composition) {
      // Même calcul que le serveur : prix du format retenu plus les suppléments.
      const customPrice = cartItemUnitPrice(item)
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
  const deliveryFee = computeDeliveryFee(subtotal, deliveryMethod, deliveryConfig)
  const discount = appliedPromo?.discount || 0
  const total = Math.max(0, subtotal - discount) + deliveryFee

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput, subtotal })
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setAppliedPromo(data)
        toast.success(`Code promo ${data.code} appliqué ! ${data.label}`)
      } else {
        toast.error(data.error || "Code promo invalide")
      }
    } catch {
      toast.error("Erreur de validation du code")
    } finally {
      setPromoLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!selectedDelivery) {
      toast.error(
        deliveryMethod === "livraison"
          ? "Veuillez choisir une date et un créneau de livraison"
          : "Veuillez choisir une date et une heure de retrait",
      )
      return
    }
    // Le téléphone est le seul moyen de joindre le client en cas d'imprévu (rupture,
    // absence à la livraison, commande prête plus tôt) : exigé dans les deux modes.
    if (!phone.trim()) {
      toast.error("Veuillez renseigner un numéro de téléphone")
      return
    }
    if (deliveryMethod === "livraison") {
      if (!address.trim()) {
        toast.error("Veuillez renseigner votre adresse de livraison")
        return
      }
      if (!postalCode.trim() || !city.trim()) {
        toast.error("Veuillez renseigner le code postal et la ville de livraison")
        return
      }
    }
    try {
      setIsCheckingOut(true)
      const res = await fetch("/api/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryMethod,
          deliveryDate: selectedDelivery?.dateISO || selectedDelivery?.date,
          deliveryTime: selectedDelivery?.time,
          deliverySlotId: selectedDelivery?.slotId || null,
          deliveryAddress: address,
          deliveryCity: city,
          deliveryPostalCode: postalCode,
          phone,
          promoCode: appliedPromo?.code || null,
          paymentMethod,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Commande confirmée !")
        window.dispatchEvent(new Event("cart-updated"))
        router.push(`/checkout/success?order_id=${data.orderId}`)
      } else {
        toast.error(data.error || "Erreur lors de la commande")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error("Impossible de passer la commande")
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

          <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Retour à la boutique
          </Link>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
            Finaliser ma <span className="text-orange-500">commande</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                      {subtotal >= deliveryConfig.threshold ? "Gratuit" : `${deliveryConfig.fee.toFixed(2)}€`}{" "}
                      {subtotal < deliveryConfig.threshold && `(gratuit dès ${deliveryConfig.threshold}€)`}
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

              {/* Adresse de livraison */}
              {deliveryMethod === "livraison" && (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" /> Adresse de livraison
                  </h2>
                  <Card className="glassmorphism bg-zinc-900/40 border-white/5 rounded-2xl">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 font-medium mb-1 block">Adresse *</label>
                        <Input
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Rue de la Paix"
                          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-400 font-medium mb-1 block">Code postal</label>
                          <Input
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="94140"
                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 font-medium mb-1 block">Ville</label>
                          <Input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Alfortville"
                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 font-medium mb-1 block">Téléphone</label>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0690 XX XX XX"
                          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Date et créneau : exigés dans les deux modes.
                  En retrait, sans horaire choisi le commerçant ne sait pas quand préparer
                  la commande ni quand attendre le client. */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">
                  {deliveryMethod === "livraison" ? "Date et créneau de livraison" : "Date et heure de retrait"}
                </h2>
                <DeliveryCalendar
                  onSelectDelivery={setSelectedDelivery}
                  selectedDelivery={selectedDelivery}
                />
              </div>

              {deliveryMethod === "retrait" && (
                <Card className="glassmorphism bg-zinc-900/40 border-white/5 rounded-2xl">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-orange-500" />
                      Point de retrait
                    </h3>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="font-semibold text-white">Power — Primeur</p>
                      <p className="text-sm text-zinc-400 mt-1">114 Rue Paul Vaillant Couturier</p>
                      <p className="text-sm text-zinc-400">94140 Alfortville</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                      <p className="text-sm text-orange-400 font-medium">Un code de retrait vous sera attribué après confirmation.</p>
                      <p className="text-xs text-zinc-400 mt-1">Présentez-le en magasin pour récupérer votre commande.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Code promo */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Code promo
                </h2>
                <Card className="glassmorphism bg-zinc-900/40 border-white/5 rounded-2xl">
                  <CardContent className="p-5">
                    {appliedPromo ? (
                      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-green-400">{appliedPromo.code}</p>
                          <p className="text-xs text-green-400/70">{appliedPromo.label} appliqué</p>
                        </div>
                        <button
                          onClick={() => { setAppliedPromo(null); setPromoInput("") }}
                          className="text-zinc-400 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="Entrez votre code"
                          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl uppercase"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyPromo() } }}
                          disabled={promoLoading}
                        />
                        <Button
                          onClick={handleApplyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 shrink-0"
                        >
                          {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Mode de paiement */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <Banknote className="h-4 w-4" /> Mode de paiement
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-5 rounded-2xl border transition-all text-left ${
                      paymentMethod === "cash"
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <Banknote className={`h-6 w-6 mb-2 ${paymentMethod === "cash" ? "text-orange-500" : "text-zinc-400"}`} />
                    <p className="font-bold text-white">Espèces</p>
                    <p className="text-xs text-zinc-400 mt-1">Payez en espèces à la réception</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card_on_delivery")}
                    className={`p-5 rounded-2xl border transition-all text-left ${
                      paymentMethod === "card_on_delivery"
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <CreditCard className={`h-6 w-6 mb-2 ${paymentMethod === "card_on_delivery" ? "text-orange-500" : "text-zinc-400"}`} />
                    <p className="font-bold text-white">Carte bleue</p>
                    <p className="text-xs text-zinc-400 mt-1">Payez par carte à la réception</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Colonne droite : récap */}
            <div className="lg:col-span-1">
              <Card className="sticky top-28 glassmorphism bg-zinc-900/40 border-white/10 rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-bold text-white">Récapitulatif</h3>

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
                    {appliedPromo && (
                      <div className="flex justify-between text-green-400">
                        <span>Promo ({appliedPromo.code})</span>
                        <span>-{appliedPromo.discount.toFixed(2)}€</span>
                      </div>
                    )}
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
                    disabled={
                      isCheckingOut ||
                      !selectedDelivery ||
                      !phone.trim() ||
                      (deliveryMethod === "livraison" && (!address.trim() || !postalCode.trim() || !city.trim()))
                    }
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] text-base disabled:opacity-50"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      `Confirmer — ${paymentMethod === "cash" ? "Espèces" : "CB"} à la ${deliveryMethod === "retrait" ? "réception" : "livraison"}`
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
