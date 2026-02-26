"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Eye, Loader2, ShoppingBag, Download, RotateCcw } from "lucide-react"
import { getUserOrders } from "@/app/actions/account"
import { toast } from "sonner"
import Link from "next/link"

interface OrderItem {
  id: string
  quantity: number
  priceAtPurchase: number
  product?: { name: string; unit: string } | null
  composition?: { name: string } | null
}

interface Order {
  id: string
  orderNumber: string
  createdAt: string
  status: string
  total: number
  deliveryMethod: string | null
  invoiceNumber: string | null
  items: OrderItem[]
}

const getStatusBadge = (status: string) => {
  const configs: Record<string, { label: string; className: string }> = {
    delivered: { label: "Livrée", className: "bg-green-500/20 text-green-400 border-green-500/20" },
    shipped: { label: "En livraison", className: "bg-purple-500/20 text-purple-400 border-purple-500/20" },
    validated: { label: "Validée", className: "bg-orange-500/20 text-orange-400 border-orange-500/20" },
    processing: { label: "En préparation", className: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
    pending: { label: "En attente", className: "bg-zinc-800 text-orange-500/60 border-orange-500/10" },
    cancelled: { label: "Annulée", className: "bg-red-500/20 text-red-400 border-red-500/20" },
  }
  const config = configs[status] || { label: status, className: "bg-zinc-800 text-zinc-400" }
  return (
    <Badge className={`${config.className} border font-black uppercase italic text-[10px] tracking-widest px-3 py-1`}>
      {config.label}
    </Badge>
  )
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await getUserOrders()
      if (res.success && res.data) {
        const transformedOrders = res.data.map((o: any) => ({
          id: o.id,
          orderNumber: `CMD-${o.id.slice(-6).toUpperCase()}`,
          createdAt: o.createdAt,
          status: o.status,
          total: o.total,
          deliveryMethod: o.deliveryMethod || null,
          invoiceNumber: o.invoiceNumber || null,
          items: (o.items || []).map((i: any) => ({
            id: i.id,
            quantity: i.quantity,
            priceAtPurchase: i.priceAtPurchase,
            product: i.product || null,
            composition: i.composition || null,
          }))
        }))
        setOrders(transformedOrders)
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error("Impossible de récupérer vos commandes")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="glassmorphism bg-zinc-900/40 border-white/5 min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-zinc-500 uppercase italic font-black text-xs tracking-tighter">Récupération de votre historique Power...</p>
        </div>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card className="glassmorphism bg-zinc-900/40 border-white/5 py-20">
        <CardContent className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
            <ShoppingBag className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-2xl font-black uppercase italic text-white mb-4">Votre panier historique est vide.</h3>
          <p className="text-zinc-500 font-medium mb-12 max-w-sm mx-auto">
            Commencez à remplir votre vie de vitamines et retrouvez vos exploits culinaires ici.
          </p>
          <Button className="rounded-full bg-orange-500 hover:bg-orange-600 text-white h-16 px-12 font-black uppercase italic tracking-tighter text-lg shadow-2xl shadow-orange-500/20" asChild>
            <Link href="/#marketplace">Parcourir la Boutique</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <Card className="glassmorphism bg-zinc-900/40 border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5 px-8 flex flex-row justify-between items-center">
          <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Mes Commandes <span className="text-orange-500">Power.</span></CardTitle>
          <span className="text-zinc-600 font-bold uppercase text-[10px] tracking-widest">{orders.length} Commandes au total</span>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-12">
            {orders.map((order) => (
              <div key={order.id} className="relative group p-8 rounded-[32px] bg-black/40 border border-white/5 hover:border-orange-500/20 transition-all">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-8 mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center font-black italic text-orange-500 text-xs text-center leading-tight">
                      {new Date(order.createdAt).getDate()}<br />{new Date(order.createdAt).toLocaleString('fr-FR', { month: 'short' }).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic text-white">{order.orderNumber}</h3>
                      <p className="text-zinc-500 font-medium">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between lg:justify-end gap-10">
                    <div className="text-right">
                      <p className="text-zinc-600 uppercase font-black text-[10px] tracking-widest mb-1">Total Payé</p>
                      <p className="text-3xl font-black text-white italic leading-none">{order.total.toFixed(2)}€</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-6 mb-8">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60 mb-4">Articles du Colis Power</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.items.map((item) => {
                      const name = item.product?.name || item.composition?.name || 'Article inconnu'
                      const unit = item.product?.unit || ''
                      return (
                        <div key={item.id} className="flex items-center justify-between text-zinc-300 font-bold text-sm bg-black/40 p-3 rounded-xl border border-white/5">
                          <span>{name}</span>
                          <span className="text-orange-500 italic">x{item.quantity} {unit}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button asChild variant="outline" className="rounded-full border-white/10 text-white hover:bg-white/5 font-bold uppercase italic text-xs h-12 px-6 gap-2">
                    <Link href={`/commandes/${order.id}`}>
                      <Eye className="h-4 w-4 text-orange-500" /> Suivi Commande
                    </Link>
                  </Button>

                  {(order.status === "validated" || order.status === "delivered" || order.status === "shipped" || order.status === "processing") && (
                    <Button asChild variant="outline" className="rounded-full border-white/10 text-white hover:bg-white/5 font-bold uppercase italic text-xs h-12 px-6 gap-2">
                      <a href={`/api/invoices/${order.id}`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 text-orange-500" /> Facture
                      </a>
                    </Button>
                  )}

                  <Button asChild variant="outline" className="rounded-full border-white/10 text-white hover:bg-white/5 font-bold uppercase italic text-xs h-12 px-6 gap-2">
                    <Link href="/#marketplace">
                      <RotateCcw className="h-4 w-4 text-orange-500" /> Commander à nouveau
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
