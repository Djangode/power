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
  Clock,
  Package,
  CheckCircle,
  Eye,
  Calendar,
  UserCheck,
  Calculator,
  RefreshCw
} from "lucide-react"
import { IconTrendingUp } from "@tabler/icons-react"

// Types
interface OrderItem {
  id: string
  product_id: string | null
  composition_id: string | null
  quantity_ordered: number
  quantity_prepared: number | null
  unit_price: number
  total_price: number
  actual_price: number | null
  products?: {
    name: string
    unit: string
  } | null
  compositions?: {
    name: string
  } | null
}

interface Order {
  id: string
  order_number: string
  created_at: string
  status: 'pending' | 'preparation' | 'validated' | 'delivering' | 'delivered' | 'cancelled'
  total: number
  delivery_date: string | null
  delivery_time_start: string | null
  delivery_time_end: string | null
  assigned_to: string | null
  order_items: OrderItem[]
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
  } | null
  delivery_addresses?: {
    street_address: string
    city: string
    postal_code: string
  } | null
  employees?: {
    user_id: string
    profiles?: {
      first_name: string | null
      last_name: string | null
    } | null
  } | null
}

const employees = ["Admin", "Sophie", "Marc", "Julie", "Thomas"]

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [editingItems, setEditingItems] = useState<OrderItem[]>([])
  const [newDeliveryDate, setNewDeliveryDate] = useState("")
  const [newDeliveryTime, setNewDeliveryTime] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("today")
  const [updating, setUpdating] = useState<string | null>(null)

  // States pour les différents modals
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false)

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
  }, [selectedPeriod])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Filtrer les commandes par statut
  const pendingOrders = orders.filter(o => o.status === 'pending')
  const preparationOrders = orders.filter(o => o.status === 'preparation')
  const validatedOrders = orders.filter(o => o.status === 'validated')

  // Données pour SectionCards
  const statsData = [
    {
      title: "En Attente",
      value: pendingOrders.length,
      description: "Commandes à traiter",
      trend: {
        value: "+12%",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: `${pendingOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}€ total`,
        subtitle: "À valider aujourd'hui"
      }
    },
    {
      title: "En Préparation",
      value: preparationOrders.length,
      description: "Commandes assignées",
      trend: {
        value: "+8%",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: `${preparationOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}€ total`,
        subtitle: "En cours de préparation"
      }
    },
    {
      title: "Validées",
      value: validatedOrders.length,
      description: "Prêtes à livrer",
      trend: {
        value: "+15%",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: `${validatedOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}€ total`,
        subtitle: "Prêtes pour livraison"
      }
    }
  ]

  // Fonctions de gestion des commandes
  const updateOrderStatus = async (orderId: string, newStatus: Order['status'], assignedTo?: string) => {
    try {
      setUpdating(orderId)
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      }) // Call
      setOrders(orders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus, assigned_to: assignedTo || order.assigned_to }
          : order
      ))
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleValidateOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'preparation', 'Admin')
  }

  const handleAssignOrder = (orderId: string, assignedTo: string) => {
    updateOrderStatus(orderId, 'preparation', assignedTo)
  }

  const handleValidatePreparation = async (orderId: string) => {
    try {
      setUpdating(orderId)
      const newTotal = editingItems.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_price), 0)
      await fetch(`/api/admin/orders/${orderId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: editingItems, total: newTotal })
      }) // Call
      setOrders(orders.map(order =>
        order.id === orderId
          ? { ...order, status: 'validated', total: newTotal }
          : order
      ))
      setIsItemsModalOpen(false)
      setEditingItems([])
      setSelectedOrder(null)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdateDelivery = async () => {
    if (!selectedOrder) return

    try {
      setUpdating(selectedOrder.id)
      await fetch(`/api/admin/orders/${selectedOrder.id}/delivery`, { method: "PUT" }) // Stub
      setOrders(orders.map(order =>
        order.id === selectedOrder.id
          ? {
            ...order,
            delivery_date: newDeliveryDate || order.delivery_date,
            delivery_time_start: newDeliveryTime.split(' - ')[0] || order.delivery_time_start,
            delivery_time_end: newDeliveryTime.split(' - ')[1] || order.delivery_time_end
          }
          : order
      ))

      setNewDeliveryDate("")
      setNewDeliveryTime("")
      setIsDeliveryModalOpen(false)
      setSelectedOrder(null)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setUpdating(null)
    }
  }

  // Fonctions d'ouverture des modals
  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailsModalOpen(true)
  }

  const openDeliveryModal = (order: Order) => {
    setSelectedOrder(order)
    setNewDeliveryDate(order.delivery_date || '')
    setNewDeliveryTime(order.delivery_time_start && order.delivery_time_end
      ? `${order.delivery_time_start} - ${order.delivery_time_end}`
      : '')
    setIsDeliveryModalOpen(true)
  }

  const openItemsModal = (order: Order) => {
    setSelectedOrder(order)
    setEditingItems([...order.order_items])
    setIsItemsModalOpen(true)
  }

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    setEditingItems(editingItems.map(item =>
      item.id === itemId
        ? { ...item, quantity_ordered: Math.max(0, newQuantity) }
        : item
    ))
  }

  // Helpers pour l'affichage
  const getCustomerName = (order: Order) => {
    if (order.profiles?.first_name && order.profiles?.last_name) {
      return `${order.profiles.first_name} ${order.profiles.last_name}`
    }
    return order.profiles?.email || 'Client inconnu'
  }

  const getDeliveryInfo = (order: Order) => {
    const city = order.delivery_addresses?.city || 'Ville non définie'
    const date = order.delivery_date || 'Date non définie'
    const time = order.delivery_time_start && order.delivery_time_end
      ? `${order.delivery_time_start} - ${order.delivery_time_end}`
      : 'Heure non définie'

    return { city, date, time }
  }

  const getProductName = (item: OrderItem) => {
    return item.products?.name || item.compositions?.name || 'Produit inconnu'
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "19rem",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Gestion des Commandes</h1>
                <p className="text-muted-foreground">Suivez et gérez toutes les commandes</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={loadOrders}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>

                <Label>Période:</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats Cards */}
            <SectionCards data={statsData} />

            {loading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des commandes...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Commandes en attente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      En Attente ({pendingOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pendingOrders.map((order) => {
                        const customerName = getCustomerName(order)
                        const deliveryInfo = getDeliveryInfo(order)
                        return (
                          <div key={order.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{customerName}</h4>
                                <p className="text-sm text-muted-foreground">{order.profiles?.email}</p>
                              </div>
                              <Badge variant="outline">{order.total.toFixed(2)}€</Badge>
                            </div>

                            <div className="text-sm">
                              <p><strong>Ville:</strong> {deliveryInfo.city}</p>
                              <p><strong>Date:</strong> {deliveryInfo.date}</p>
                              <p><strong>Heure:</strong> {deliveryInfo.time}</p>
                            </div>

                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDetailsModal(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeliveryModal(order)}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleValidateOrder(order.id)}
                                disabled={updating === order.id}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                      {pendingOrders.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Aucune commande en attente
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Commandes en préparation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      En Préparation ({preparationOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {preparationOrders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{order.order_number}</h4>
                              <Badge variant="outline">{order.order_items.length} articles</Badge>
                            </div>
                            <Badge variant="outline">{order.total.toFixed(2)}€</Badge>
                          </div>

                          <div>
                            <Label className="text-sm">Assigné à:</Label>
                            <Select
                              value={order.assigned_to || ""}
                              onValueChange={(value) => handleAssignOrder(order.id, value)}
                              disabled={updating === order.id}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Assigner" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map(emp => (
                                  <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openItemsModal(order)}
                              className="flex-1"
                              disabled={updating === order.id}
                            >
                              <Calculator className="h-4 w-4 mr-1" />
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleValidatePreparation(order.id)}
                              disabled={!order.assigned_to || updating === order.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {preparationOrders.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Aucune commande en préparation
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Commandes validées */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Validées ({validatedOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {validatedOrders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{order.order_number}</h4>
                              <p className="text-sm text-muted-foreground">{getCustomerName(order)}</p>
                            </div>
                            <Badge variant="secondary">{order.total.toFixed(2)}€</Badge>
                          </div>

                          <Badge variant="secondary">Prête pour livraison</Badge>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailsModal(order)}
                            className="w-full"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détails
                          </Button>
                        </div>
                      ))}
                      {validatedOrders.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Aucune commande validée
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* Modal Détails Commande */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Détails Commande ${selectedOrder?.order_number}`}
        className="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <p className="font-medium">{getCustomerName(selectedOrder)}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.profiles?.email}</p>
              </div>
              <div>
                <Label>Livraison</Label>
                <p>{getDeliveryInfo(selectedOrder).city}</p>
                <p>{getDeliveryInfo(selectedOrder).date} • {getDeliveryInfo(selectedOrder).time}</p>
              </div>
            </div>

            {selectedOrder.assigned_to && (
              <div>
                <Label>Assigné à</Label>
                <p className="font-medium">{selectedOrder.assigned_to}</p>
              </div>
            )}

            <Separator />

            <div>
              <Label>Articles commandés</Label>
              <div className="mt-2 space-y-2">
                {selectedOrder.order_items.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{getProductName(item)} - {item.quantity_ordered} {item.products?.unit || 'pc'}</span>
                    <span>{item.total_price.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{selectedOrder.total.toFixed(2)}€</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Édition Livraison */}
      <Modal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title={`Modifier la livraison - ${selectedOrder?.order_number}`}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="newDate">Nouvelle date</Label>
            <Input
              id="newDate"
              type="date"
              value={newDeliveryDate}
              onChange={(e) => setNewDeliveryDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newTime">Nouveau créneau</Label>
            <Select value={newDeliveryTime} onValueChange={setNewDeliveryTime}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un créneau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="08:00 - 10:00">08:00 - 10:00</SelectItem>
                <SelectItem value="10:00 - 12:00">10:00 - 12:00</SelectItem>
                <SelectItem value="14:00 - 16:00">14:00 - 16:00</SelectItem>
                <SelectItem value="16:00 - 18:00">16:00 - 18:00</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleUpdateDelivery}
            className="w-full"
            disabled={updating === selectedOrder?.id}
          >
            {updating === selectedOrder?.id ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
        </div>
      </Modal>

      {/* Modal Validation Produits */}
      <Modal
        isOpen={isItemsModalOpen}
        onClose={() => setIsItemsModalOpen(false)}
        title={`Validation Produits - ${selectedOrder?.order_number}`}
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <p className="font-medium">{selectedOrder && getCustomerName(selectedOrder)}</p>
            </div>
            <div>
              <Label>Montant original</Label>
              <p className="font-medium">{selectedOrder?.total.toFixed(2)}€</p>
            </div>
          </div>

          <Separator />

          <div>
            <Label>Articles à valider</Label>
            <div className="mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Qté Commandée</TableHead>
                    <TableHead>Qté Préparée</TableHead>
                    <TableHead>Prix Unit.</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{getProductName(item)}</TableCell>
                      <TableCell>
                        <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {item.quantity_ordered} {item.products?.unit || 'pc'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity_ordered}
                          onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                          className="w-20"
                          min="0"
                        />
                      </TableCell>
                      <TableCell>{item.unit_price.toFixed(2)}€</TableCell>
                      <TableCell className="font-medium">
                        {(item.quantity_ordered * item.unit_price).toFixed(2)}€
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
              <Label>Nouveau total</Label>
              <p className="text-lg font-bold">
                {editingItems.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_price), 0).toFixed(2)}€
              </p>
            </div>
            <Button
              onClick={() => selectedOrder && handleValidatePreparation(selectedOrder.id)}
              disabled={updating === selectedOrder?.id}
            >
              {updating === selectedOrder?.id ? 'Validation...' : 'Valider la préparation'}
            </Button>
          </div>
        </div>
      </Modal>
    </SidebarProvider>
  )
}