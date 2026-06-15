"use client"

import React, { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SectionCards } from "@/components/admin/section-cards"
import { Modal } from "@/components/admin/modal"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { Button } from "@/components/admin/ui/button"
import { Badge } from "@/components/admin/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Separator } from "@/components/admin/ui/separator"
import {
  Clock, Package, CheckCircle, Eye, Calendar, UserCheck,
  Calculator, RefreshCw, Truck, Store, MapPin, Send
} from "lucide-react"
import { IconTrendingUp } from "@tabler/icons-react"

interface OrderItem {
  id: string
  productId: string | null
  compositionId: string | null
  quantity: number
  priceAtPurchase: number
  product?: { name: string; unit: string } | null
  composition?: { name: string } | null
}

interface Order {
  id: string
  order_number: string
  created_at: string
  status: string
  total: number
  deliveryMethod: string | null
  deliveryDate: string | null
  deliverySlot: string | null
  deliveryAddress: string | null
  deliveryCity: string | null
  deliveryPostalCode: string | null
  deliveryFee: number
  pickupCode: string | null
  carrier: string | null
  trackingNumber: string | null
  invoiceNumber: string | null
  items: OrderItem[]
  order_items: OrderItem[]
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
  } | null
  user?: {
    firstName: string | null
    lastName: string | null
    email: string
    phone: string | null
  } | null
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [updating, setUpdating] = useState<string | null>(null)

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isShipModalOpen, setIsShipModalOpen] = useState(false)
  const [carrier, setCarrier] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/orders")
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error('Erreur:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const validatedOrders = orders.filter(o => o.status === 'validated' || o.status === 'processing')
  const shippedOrders = orders.filter(o => o.status === 'shipped')
  const deliveredOrders = orders.filter(o => o.status === 'delivered')

  const statsData = [
    {
      title: "En Attente",
      value: pendingOrders.length,
      description: "Commandes à traiter",
      trend: { value: `${pendingOrders.reduce((s, o) => s + o.total, 0).toFixed(0)}€`, isPositive: true, icon: IconTrendingUp },
      footer: { label: `${pendingOrders.length} commande(s)`, subtitle: "En attente de paiement" }
    },
    {
      title: "Validées / En prépa",
      value: validatedOrders.length,
      description: "Confirmées par Stripe",
      trend: { value: `${validatedOrders.reduce((s, o) => s + o.total, 0).toFixed(0)}€`, isPositive: true, icon: IconTrendingUp },
      footer: { label: `${validatedOrders.length} commande(s)`, subtitle: "À préparer et expédier" }
    },
    {
      title: "Livrées",
      value: deliveredOrders.length,
      description: "Commandes terminées",
      trend: { value: `${deliveredOrders.reduce((s, o) => s + o.total, 0).toFixed(0)}€`, isPositive: true, icon: IconTrendingUp },
      footer: { label: `${deliveredOrders.length} commande(s)`, subtitle: "Ce mois-ci" }
    }
  ]

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(orderId)
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      await loadOrders()
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleShip = async () => {
    if (!selectedOrder) return
    try {
      setUpdating(selectedOrder.id)
      await fetch(`/api/admin/orders/${selectedOrder.id}/delivery`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier, trackingNumber })
      })
      setIsShipModalOpen(false)
      setCarrier("")
      setTrackingNumber("")
      await loadOrders()
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setUpdating(null)
    }
  }

  const getCustomerName = (order: Order) => {
    const p = order.profiles
    const u = order.user
    if (p?.first_name || p?.last_name) return `${p.first_name || ""} ${p.last_name || ""}`.trim()
    if (u?.firstName || u?.lastName) return `${u.firstName || ""} ${u.lastName || ""}`.trim()
    return p?.email || u?.email || "Client"
  }

  const getCustomerEmail = (order: Order) => {
    return order.profiles?.email || order.user?.email || ""
  }

  const getItems = (order: Order) => {
    return order.order_items || order.items || []
  }

  const getItemName = (item: OrderItem) => {
    return item.product?.name || item.composition?.name || "Article"
  }

  const getItemQty = (item: OrderItem) => {
    return (item as any).quantity_ordered || item.quantity
  }

  const getItemPrice = (item: OrderItem) => {
    return (item as any).unit_price || item.priceAtPurchase
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending: { label: "En attente", variant: "outline" },
      validated: { label: "Validée", variant: "default" },
      processing: { label: "Préparation", variant: "secondary" },
      shipped: { label: "Expédiée", variant: "secondary" },
      delivered: { label: "Livrée", variant: "default" },
      cancelled: { label: "Annulée", variant: "destructive" },
    }
    const cfg = map[status] || { label: status, variant: "outline" as const }
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>
  }

  const getDeliveryBadge = (order: Order) => {
    if (order.deliveryMethod === "retrait") {
      return <Badge variant="outline" className="gap-1"><Store className="h-3 w-3" /> Retrait</Badge>
    }
    return <Badge variant="outline" className="gap-1"><Truck className="h-3 w-3" /> Livraison</Badge>
  }

  const renderOrderCard = (order: Order, showActions = true) => {
    const items = getItems(order)
    return (
      <div key={order.id} className="border rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium">{order.order_number}</h4>
            <p className="text-sm text-muted-foreground">{getCustomerName(order)}</p>
            <p className="text-xs text-muted-foreground">{getCustomerEmail(order)}</p>
          </div>
          <div className="text-right space-y-1">
            <Badge variant="outline" className="font-bold">{order.total.toFixed(2)}€</Badge>
            <div>{getDeliveryBadge(order)}</div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="text-sm space-y-1">
          {order.deliveryMethod === "retrait" ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>Retrait magasin {order.pickupCode && `— Code: ${order.pickupCode}`}</span>
            </div>
          ) : (
            <>
              {order.deliveryAddress && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}</span>
                </div>
              )}
              {(order.deliveryDate || order.deliverySlot) && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {order.deliveryDate
                      ? new Date(order.deliveryDate).toLocaleDateString('fr-FR')
                      : ""}
                    {order.deliveryDate && order.deliverySlot ? " — " : ""}
                    {order.deliverySlot || ""}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {items.length} article(s) — {new Date(order.created_at).toLocaleDateString('fr-FR')}
        </div>

        {showActions && (
          <div className="flex gap-1 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(order); setIsDetailsModalOpen(true) }}>
              <Eye className="h-4 w-4 mr-1" /> Détails
            </Button>

            {order.status === "validated" && (
              <Button size="sm" onClick={() => updateStatus(order.id, "processing")} disabled={updating === order.id}>
                <Package className="h-4 w-4 mr-1" /> Préparer
              </Button>
            )}

            {order.status === "processing" && (
              <Button size="sm" onClick={() => { setSelectedOrder(order); setCarrier(""); setTrackingNumber(""); setIsShipModalOpen(true) }} disabled={updating === order.id}>
                <Send className="h-4 w-4 mr-1" /> Expédier
              </Button>
            )}

            {order.status === "shipped" && (
              <Button size="sm" onClick={() => updateStatus(order.id, "delivered")} disabled={updating === order.id}>
                <CheckCircle className="h-4 w-4 mr-1" /> Livré
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "19rem" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Gestion des Commandes</h1>
                <p className="text-muted-foreground">Suivez et gérez toutes les commandes</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={loadOrders} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SectionCards data={statsData} />

            {loading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Chargement des commandes...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Pending */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" /> En Attente ({pendingOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pendingOrders.map(o => renderOrderCard(o, false))}
                      {pendingOrders.length === 0 && <p className="text-center text-muted-foreground py-4">Aucune commande en attente</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Validated / Processing */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" /> À traiter ({validatedOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {validatedOrders.map(o => renderOrderCard(o))}
                      {validatedOrders.length === 0 && <p className="text-center text-muted-foreground py-4">Aucune commande à traiter</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Shipped / Delivered */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" /> Expédiées / Livrées ({shippedOrders.length + deliveredOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {shippedOrders.map(o => renderOrderCard(o))}
                      {deliveredOrders.slice(0, 5).map(o => renderOrderCard(o, false))}
                      {shippedOrders.length + deliveredOrders.length === 0 && <p className="text-center text-muted-foreground py-4">Aucune commande expédiée</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* Details Modal */}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Commande ${selectedOrder?.order_number}`} className="max-w-2xl">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <p className="font-medium">{getCustomerName(selectedOrder)}</p>
                <p className="text-sm text-muted-foreground">{getCustomerEmail(selectedOrder)}</p>
              </div>
              <div>
                <Label>Statut</Label>
                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                <div className="mt-1">{getDeliveryBadge(selectedOrder)}</div>
              </div>
            </div>

            {/* Delivery details */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              {selectedOrder.deliveryMethod === "retrait" ? (
                <>
                  <p className="font-medium flex items-center gap-2"><Store className="h-4 w-4" /> Retrait en magasin</p>
                  {selectedOrder.pickupCode && <p className="text-sm">Code: <strong>{selectedOrder.pickupCode}</strong></p>}
                </>
              ) : (
                <>
                  <p className="font-medium flex items-center gap-2"><Truck className="h-4 w-4" /> Livraison</p>
                  {selectedOrder.deliveryAddress && (
                    <p className="text-sm">{selectedOrder.deliveryAddress}, {selectedOrder.deliveryPostalCode} {selectedOrder.deliveryCity}</p>
                  )}
                  {selectedOrder.deliveryDate && (
                    <p className="text-sm">Date de livraison: {new Date(selectedOrder.deliveryDate).toLocaleDateString('fr-FR')}</p>
                  )}
                  {selectedOrder.deliverySlot && <p className="text-sm">Créneau: {selectedOrder.deliverySlot}</p>}
                  {selectedOrder.carrier && <p className="text-sm">Transporteur: {selectedOrder.carrier}</p>}
                  {selectedOrder.trackingNumber && <p className="text-sm">Suivi: {selectedOrder.trackingNumber}</p>}
                </>
              )}
              {selectedOrder.deliveryFee > 0 && <p className="text-sm">Frais: {selectedOrder.deliveryFee.toFixed(2)}€</p>}
            </div>

            <Separator />

            <div>
              <Label>Articles</Label>
              <div className="mt-2 space-y-2">
                {getItems(selectedOrder).map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span>{getItemName(item)} — x{getItemQty(item)} {item.product?.unit || ''}</span>
                    <span className="font-medium">{(getItemQty(item) * getItemPrice(item)).toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{selectedOrder.total.toFixed(2)}€</span>
            </div>

            {selectedOrder.invoiceNumber && (
              <p className="text-sm text-muted-foreground">Facture: {selectedOrder.invoiceNumber}</p>
            )}

            {/* Status actions */}
            <div className="flex gap-2 pt-2">
              {selectedOrder.status === "validated" && (
                <Button onClick={() => { updateStatus(selectedOrder.id, "processing"); setIsDetailsModalOpen(false) }}>
                  <Package className="h-4 w-4 mr-2" /> Mettre en préparation
                </Button>
              )}
              {selectedOrder.status === "processing" && (
                <Button onClick={() => { setIsDetailsModalOpen(false); setIsShipModalOpen(true) }}>
                  <Send className="h-4 w-4 mr-2" /> Expédier
                </Button>
              )}
              {selectedOrder.status === "shipped" && (
                <Button onClick={() => { updateStatus(selectedOrder.id, "delivered"); setIsDetailsModalOpen(false) }}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Marquer comme livré
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Ship Modal */}
      <Modal isOpen={isShipModalOpen} onClose={() => setIsShipModalOpen(false)} title={`Expédier ${selectedOrder?.order_number}`} className="max-w-md">
        <div className="space-y-4">
          <div>
            <Label>Transporteur</Label>
            <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Colissimo, Chronopost..." />
          </div>
          <div>
            <Label>Numéro de suivi</Label>
            <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="XX000000000FR" />
          </div>
          <Button onClick={handleShip} className="w-full" disabled={updating === selectedOrder?.id}>
            {updating === selectedOrder?.id ? "Envoi..." : "Confirmer l'expédition"}
          </Button>
        </div>
      </Modal>
    </SidebarProvider>
  )
}
