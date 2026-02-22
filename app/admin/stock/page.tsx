"use client"

import React, { useState } from "react"
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
import { Package, Plus, Upload, Edit, AlertTriangle, TrendingDown } from "lucide-react"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"

// Types
interface StockItem {
  id: string
  productName: string
  supplier: string
  origin: string
  purchasePrice: number
  sellingPrice: number
  margin: number
  currentStock: number
  minimumStock: number
  lastRestockDate: string
  invoiceFile?: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

// Les données sont maintenant tirées de la base de données

const suppliers = ["Ferme Martin", "Bio Antilles", "Plantations Tropicales", "Marché de Gros", "Import Caraïbes"]
const origins = ["Guadeloupe", "Martinique", "Normandie", "Bretagne", "Provence", "Import"]

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([])
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)

  // States pour les modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)

  React.useEffect(() => {
    loadStock()
  }, [])

  const loadStock = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/stock")
      if (res.ok) {
        const data = await res.json()
        setStock(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Form data
  const [formData, setFormData] = useState({
    productName: "",
    supplier: "",
    origin: "",
    purchasePrice: 0,
    margin: 40,
    currentStock: 0,
    minimumStock: 10,
    invoiceFile: null as File | null
  })

  // Filtrer le stock
  const filteredStock = stock.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || item.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Calculer les statistiques
  const totalProducts = stock.length
  const lowStockItems = stock.filter(item => item.status === 'low_stock').length
  const outOfStockItems = stock.filter(item => item.status === 'out_of_stock').length
  const totalValue = stock.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0)

  const statsData = [
    {
      title: "Total Produits",
      value: totalProducts,
      description: "Articles en stock",
      trend: {
        value: "+3",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: `Valeur: €${totalValue.toFixed(2)}`,
        subtitle: "Stock total"
      }
    },
    {
      title: "Stock Faible",
      value: lowStockItems,
      description: "Articles à réapprovisionner",
      trend: {
        value: "+2",
        isPositive: false,
        icon: IconTrendingUp
      },
      footer: {
        label: "Alerte réapprovisionnement",
        subtitle: "Action requise"
      }
    },
    {
      title: "Rupture Stock",
      value: outOfStockItems,
      description: "Articles en rupture",
      trend: {
        value: "+1",
        isPositive: false,
        icon: IconTrendingUp
      },
      footer: {
        label: "Commande urgente",
        subtitle: "Perte de ventes"
      }
    }
  ]

  const handleAddProduct = () => {
    const sellingPrice = formData.purchasePrice * (1 + formData.margin / 100)
    const newItem: StockItem = {
      id: `STK-${Date.now()}`,
      productName: formData.productName,
      supplier: formData.supplier,
      origin: formData.origin,
      purchasePrice: formData.purchasePrice,
      sellingPrice: sellingPrice,
      margin: formData.margin,
      currentStock: formData.currentStock,
      minimumStock: formData.minimumStock,
      lastRestockDate: new Date().toISOString().split('T')[0],
      status: formData.currentStock <= formData.minimumStock ?
        (formData.currentStock === 0 ? 'out_of_stock' : 'low_stock') : 'in_stock'
    }

    setStock([...stock, newItem])
    setFormData({
      productName: "",
      supplier: "",
      origin: "",
      purchasePrice: 0,
      margin: 40,
      currentStock: 0,
      minimumStock: 10,
      invoiceFile: null
    })
    setIsAddModalOpen(false)
  }

  const handleRestock = async (itemId: string, quantity: number) => {
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: itemId, quantity, type: "restock" })
      })
      if (res.ok) {
        await loadStock()
      }
    } catch (error) {
      console.error("Erreur réapprovisionnement:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-600">En Stock</Badge>
      case 'low_stock':
        return <Badge className="bg-yellow-600">Stock Faible</Badge>
      case 'out_of_stock':
        return <Badge className="bg-red-600">Rupture</Badge>
      default:
        return <Badge variant="secondary">Inconnu</Badge>
    }
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
                <h1 className="text-2xl font-bold">Gestion des Stocks</h1>
                <p className="text-muted-foreground">Gérez vos approvisionnements et inventaire</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter Produit
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <SectionCards data={statsData} />

            {/* Filtres et recherche */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="in_stock">En stock</SelectItem>
                    <SelectItem value="low_stock">Stock faible</SelectItem>
                    <SelectItem value="out_of_stock">Rupture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tableau des stocks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventaire ({filteredStock.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Origine</TableHead>
                      <TableHead>Prix Achat</TableHead>
                      <TableHead>Prix Vente</TableHead>
                      <TableHead>Marge</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStock.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>{item.origin}</TableCell>
                        <TableCell>€{item.purchasePrice.toFixed(2)}</TableCell>
                        <TableCell>€{item.sellingPrice.toFixed(2)}</TableCell>
                        <TableCell>{item.margin}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={item.currentStock <= item.minimumStock ? 'text-red-600 font-bold' : ''}>
                              {item.currentStock}
                            </span>
                            {item.currentStock <= item.minimumStock && (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">Min: {item.minimumStock}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item)
                                setIsRestockModalOpen(true)
                              }}
                            >
                              <Package className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item)
                                setIsEditModalOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>

      {/* Modal Ajouter Produit */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter un Produit"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom du produit</Label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="Ex: Pommes Golden"
              />
            </div>
            <div>
              <Label>Fournisseur</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => setFormData({ ...formData, supplier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Origine</Label>
              <Select
                value={formData.origin}
                onValueChange={(value) => setFormData({ ...formData, origin: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir l'origine" />
                </SelectTrigger>
                <SelectContent>
                  {origins.map(origin => (
                    <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prix d'achat (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Marge (%)</Label>
              <Input
                type="number"
                value={formData.margin}
                onChange={(e) => setFormData({ ...formData, margin: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Stock initial</Label>
              <Input
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Stock minimum</Label>
              <Input
                type="number"
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Prix de vente calculé</Label>
            <div className="text-lg font-bold">
              €{(formData.purchasePrice * (1 + formData.margin / 100)).toFixed(2)}
            </div>
          </div>

          <div>
            <Label>Facture d'achat</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFormData({ ...formData, invoiceFile: e.target.files?.[0] || null })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleAddProduct} className="flex-1">
              Ajouter le produit
            </Button>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Réapprovisionnement */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        title={`Réapprovisionner - ${selectedItem?.productName}`}
        className="max-w-md"
      >
        <div className="space-y-4">
          {selectedItem && (
            <>
              <div>
                <Label>Stock actuel</Label>
                <p className="text-lg font-bold">{selectedItem.currentStock}</p>
              </div>

              <div>
                <Label>Quantité à ajouter</Label>
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  id="restock-quantity"
                />
              </div>

              <div>
                <Label>Facture de réapprovisionnement</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" />
              </div>

              <Button
                onClick={() => {
                  const quantity = Number((document.getElementById('restock-quantity') as HTMLInputElement)?.value || 0)
                  if (quantity > 0) {
                    handleRestock(selectedItem.id, quantity)
                    setIsRestockModalOpen(false)
                  }
                }}
                className="w-full"
              >
                Confirmer le réapprovisionnement
              </Button>
            </>
          )}
        </div>
      </Modal>
    </SidebarProvider>
  )
}