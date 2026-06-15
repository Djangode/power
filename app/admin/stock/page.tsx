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
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

interface Category {
  id: string
  name: string
  slug: string
}

// Les données sont maintenant tirées de la base de données.
// Les listes de fournisseurs / origines sont dérivées des produits réels (voir suppliers/origins ci-dessous).

// Valeurs de remplacement renvoyées par l'API quand le champ est vide : à exclure des suggestions.
const SUPPLIER_PLACEHOLDER = "Non renseigné"
const ORIGIN_PLACEHOLDER = "Local"

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // States pour les modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)

  React.useEffect(() => {
    loadStock()
    loadCategories()
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

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Form data (ajout)
  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    categoryId: "",
    supplier: "",
    origin: "",
    purchasePrice: 0,
    margin: 40,
    currentStock: 0,
    minimumStock: 10,
  })

  // Form data (édition)
  const [editForm, setEditForm] = useState({
    productName: "",
    categoryId: "",
    supplier: "",
    origin: "",
    purchasePrice: 0,
    margin: 40,
    sellingPrice: 0,
    minimumStock: 10,
  })

  // Filtrer le stock
  const filteredStock = stock.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || item.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Listes de suggestions dérivées des produits réels (saisie libre conservée)
  const suppliers = Array.from(
    new Set(
      stock
        .map((item) => item.supplier?.trim())
        .filter((s): s is string => !!s && s !== SUPPLIER_PLACEHOLDER)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"))

  const origins = Array.from(
    new Set(
      stock
        .map((item) => item.origin?.trim())
        .filter((o): o is string => !!o && o !== ORIGIN_PLACEHOLDER)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"))

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
      footer: {
        label: `Valeur: €${totalValue.toFixed(2)}`,
        subtitle: "Stock total"
      }
    },
    {
      title: "Stock Faible",
      value: lowStockItems,
      description: "Articles à réapprovisionner",
      footer: {
        label: "Alerte réapprovisionnement",
        subtitle: "Action requise"
      }
    },
    {
      title: "Rupture Stock",
      value: outOfStockItems,
      description: "Articles en rupture",
      footer: {
        label: "Commande urgente",
        subtitle: "Perte de ventes"
      }
    }
  ]

  const handleAddProduct = async () => {
    if (!formData.productName.trim()) {
      alert("Le nom du produit est requis.")
      return
    }
    if (!formData.categoryId) {
      alert("La catégorie est requise.")
      return
    }

    const sellingPrice = formData.purchasePrice * (1 + formData.margin / 100)

    try {
      setSaving(true)
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.productName,
          description: formData.description || null,
          price: Number(sellingPrice.toFixed(2)),
          unit: "kg",
          image: null,
          inStock: formData.currentStock > 0,
          organic: false,
          supplier: formData.supplier || null,
          origin: formData.origin || null,
          purchasePrice: formData.purchasePrice,
          margin: formData.margin,
          currentStock: formData.currentStock,
          minimumStock: formData.minimumStock,
          categoryId: formData.categoryId,
        })
      })

      if (res.ok) {
        await loadStock()
        setFormData({
          productName: "",
          description: "",
          categoryId: "",
          supplier: "",
          origin: "",
          purchasePrice: 0,
          margin: 40,
          currentStock: 0,
          minimumStock: 10,
        })
        setIsAddModalOpen(false)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erreur lors de la création du produit.")
      }
    } catch (error) {
      console.error("Erreur création produit:", error)
      alert("Erreur lors de la création du produit.")
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (item: StockItem) => {
    setSelectedItem(item)
    setEditForm({
      productName: item.productName,
      categoryId: "",
      supplier: item.supplier === "Non renseigné" ? "" : item.supplier,
      origin: item.origin === "Local" ? "" : item.origin,
      purchasePrice: item.purchasePrice,
      margin: item.margin,
      sellingPrice: item.sellingPrice,
      minimumStock: item.minimumStock,
    })
    setIsEditModalOpen(true)
  }

  const handleEditProduct = async () => {
    if (!selectedItem) return
    if (!editForm.productName.trim()) {
      alert("Le nom du produit est requis.")
      return
    }

    try {
      setSaving(true)
      const body: Record<string, unknown> = {
        name: editForm.productName,
        price: editForm.sellingPrice,
        supplier: editForm.supplier || null,
        origin: editForm.origin || null,
        purchasePrice: editForm.purchasePrice,
        margin: editForm.margin,
        minimumStock: editForm.minimumStock,
      }
      if (editForm.categoryId) body.categoryId = editForm.categoryId

      const res = await fetch(`/api/admin/products/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        await loadStock()
        setIsEditModalOpen(false)
        setSelectedItem(null)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erreur lors de la modification du produit.")
      }
    } catch (error) {
      console.error("Erreur modification produit:", error)
      alert("Erreur lors de la modification du produit.")
    } finally {
      setSaving(false)
    }
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
                              onClick={() => openEditModal(item)}
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
              <Label>Catégorie</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du produit (optionnel)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fournisseur</Label>
              <Input
                list="suppliers-list"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Choisir ou saisir un fournisseur"
              />
            </div>
            <div>
              <Label>Origine</Label>
              <Input
                list="origins-list"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                placeholder="Choisir ou saisir l'origine"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prix d'achat (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Marge (%)</Label>
              <Input
                type="number"
                value={formData.margin}
                onChange={(e) => setFormData({ ...formData, margin: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex gap-2 pt-4">
            <Button onClick={handleAddProduct} disabled={saving} className="flex-1">
              {saving ? "Enregistrement..." : "Ajouter le produit"}
            </Button>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Modifier Produit */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Modifier - ${selectedItem?.productName}`}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom du produit</Label>
              <Input
                value={editForm.productName}
                onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                placeholder="Ex: Pommes Golden"
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select
                value={editForm.categoryId}
                onValueChange={(value) => setEditForm({ ...editForm, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Inchangée" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fournisseur</Label>
              <Input
                list="suppliers-list"
                value={editForm.supplier}
                onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                placeholder="Choisir ou saisir un fournisseur"
              />
            </div>
            <div>
              <Label>Origine</Label>
              <Input
                list="origins-list"
                value={editForm.origin}
                onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                placeholder="Choisir ou saisir l'origine"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Prix d'achat (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.purchasePrice}
                onChange={(e) => setEditForm({ ...editForm, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Marge (%)</Label>
              <Input
                type="number"
                value={editForm.margin}
                onChange={(e) => setEditForm({ ...editForm, margin: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Prix de vente (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.sellingPrice}
                onChange={(e) => setEditForm({ ...editForm, sellingPrice: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Stock minimum</Label>
            <Input
              type="number"
              value={editForm.minimumStock}
              onChange={(e) => setEditForm({ ...editForm, minimumStock: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Le stock actuel se modifie via le bouton de réapprovisionnement.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleEditProduct} disabled={saving} className="flex-1">
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1">
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

      {/* Suggestions dérivées des produits réels (saisie libre conservée) */}
      <datalist id="suppliers-list">
        {suppliers.map((supplier) => (
          <option key={supplier} value={supplier} />
        ))}
      </datalist>
      <datalist id="origins-list">
        {origins.map((origin) => (
          <option key={origin} value={origin} />
        ))}
      </datalist>
    </SidebarProvider>
  )
}