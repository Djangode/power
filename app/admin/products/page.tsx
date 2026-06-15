"use client"

import { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SectionCards } from "@/components/admin/section-cards"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Badge } from "@/components/admin/ui/badge"
import { Label } from "@/components/admin/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/admin/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/admin/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Package, Eye, EyeOff, RefreshCw, ChefHat, X,
} from "lucide-react"
import Image from "next/image"

interface Product {
  id: string
  name: string
  description: string | null
  selling_price: number
  unit: string
  current_stock: number
  minimum_stock: number
  status: string
  is_organic: boolean
  image_url: string | null
  categories?: { name: string } | null
  supplier?: string | null
  origin?: string | null
  purchasePrice?: number | null
  categoryId?: string
}

interface Composition {
  id: string
  name: string
  type: string
  description: string | null
  basePrice: number
  imageUrl: string | null
}

interface Category {
  id: string
  name: string
  slug: string
}

type CreateType = "product" | "composition"

const UNITS = [
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "piece", label: "Pièce" },
  { value: "botte", label: "Botte" },
  { value: "barquette", label: "Barquette" },
  { value: "lot", label: "Lot" },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [compositions, setCompositions] = useState<Composition[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"products" | "compositions">("products")

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState<CreateType>("product")
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Product form
  const [productForm, setProductForm] = useState({
    name: "", description: "", price: "", unit: "kg", categoryId: "",
    image: "", organic: false, supplier: "", origin: "",
    purchasePrice: "", currentStock: "0", minimumStock: "10",
  })

  // Composition form
  const [compositionForm, setCompositionForm] = useState({
    name: "", type: "jus", description: "", basePrice: "", imageUrl: "",
  })

  // New category inline
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Origin autocomplete
  const [originSearch, setOriginSearch] = useState("")
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false)
  const existingOrigins = [...new Set(products.map(p => p.origin).filter(Boolean) as string[])]
  const filteredOrigins = existingOrigins.filter(o => o.toLowerCase().includes(originSearch.toLowerCase()))

  // Autocomplétion type composition (dynamique depuis DB)
  const [typeSearch, setTypeSearch] = useState("")
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false)
  const existingTypes = [...new Set(compositions.map(c => c.type).filter(Boolean))]
  const filteredTypes = typeSearch
    ? existingTypes.filter(t => t.toLowerCase().includes(typeSearch.toLowerCase()))
    : existingTypes

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [productsRes, compositionsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/compositions"),
        fetch("/api/admin/categories"),
      ])

      if (productsRes.ok) setProducts(await productsRes.json())
      if (compositionsRes.ok) setCompositions(await compositionsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Stats
  const totalProducts = products.length
  const totalCompositions = compositions.length
  const outOfStockProducts = products.filter(p => p.status === "out_of_stock" || p.current_stock === 0).length
  const stockValue = products.reduce((sum, p) => sum + (p.selling_price * p.current_stock), 0)

  const statsData = [
    { title: "Produits", value: totalProducts, description: "Produits en catalogue", trend: { value: `${totalProducts}`, isPositive: true }, footer: { label: "Catalogue", subtitle: "Total produits" } },
    { title: "Compositions", value: totalCompositions, description: "Jus, Soupes, Découpés", trend: { value: `${totalCompositions}`, isPositive: true }, footer: { label: "Compositions", subtitle: "Total compositions" } },
    { title: "En Rupture", value: outOfStockProducts, description: "Stock épuisé", trend: { value: outOfStockProducts > 5 ? "Critique" : "OK", isPositive: outOfStockProducts <= 5 }, footer: { label: "Stock", subtitle: outOfStockProducts > 5 ? "Réapprovisionner" : "Sous contrôle" } },
    { title: "Valeur Stock", value: `${stockValue.toFixed(0)}€`, description: "Valeur totale", trend: { value: "+0%", isPositive: true }, footer: { label: "Inventaire", subtitle: "Capital immobilisé" } },
  ]

  // Filtrer
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categories?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredCompositions = compositions.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Actions produits
  const updateProductStatus = async (productId: string, newStatus: string) => {
    try {
      setUpdating(productId)
      await fetch(`/api/admin/products/${productId}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      setProducts(products.map(p => p.id === productId ? { ...p, status: newStatus } : p))
    } catch (error) { console.error("Erreur:", error) }
    finally { setUpdating(null) }
  }

  const updateStock = async (productId: string, newStock: number) => {
    try {
      setUpdating(productId)
      await fetch(`/api/admin/products/${productId}/stock`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock })
      })
      const newStatus = newStock > 0 ? "active" : "out_of_stock"
      setProducts(products.map(p => p.id === productId ? { ...p, current_stock: newStock, status: newStatus } : p))
    } catch (error) { console.error("Erreur:", error) }
    finally { setUpdating(null) }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm("Supprimer ce produit ?")) return
    try {
      setUpdating(productId)
      await fetch(`/api/admin/products/${productId}`, { method: "DELETE" })
      setProducts(products.filter(p => p.id !== productId))
    } catch (error) { console.error("Erreur:", error) }
    finally { setUpdating(null) }
  }

  const deleteComposition = async (compositionId: string) => {
    if (!confirm("Supprimer cette composition ?")) return
    try {
      setUpdating(compositionId)
      await fetch(`/api/admin/compositions/${compositionId}`, { method: "DELETE" })
      setCompositions(compositions.filter(c => c.id !== compositionId))
    } catch (error) { console.error("Erreur:", error) }
    finally { setUpdating(null) }
  }

  // Create / Edit
  const handleFileUpload = async (file: File, target: "product" | "composition") => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        if (target === "product") {
          setProductForm(f => ({ ...f, image: url }))
        } else {
          setCompositionForm(f => ({ ...f, imageUrl: url }))
        }
        setImagePreview(url)
      } else {
        alert("Erreur lors de l'upload")
      }
    } catch (error) { console.error("Upload error:", error) }
    finally { setUploading(false) }
  }

  const openCreateModal = (type: CreateType) => {
    setCreateType(type)
    setEditingId(null)
    setImagePreview(null)
    setOriginSearch("")
    if (type === "product") {
      setProductForm({ name: "", description: "", price: "", unit: "kg", categoryId: "", image: "", organic: false, supplier: "", origin: "", purchasePrice: "", currentStock: "0", minimumStock: "10" })
    } else {
      setCompositionForm({ name: "", type: "jus", description: "", basePrice: "", imageUrl: "" })
      setTypeSearch("")
    }
    setShowCreateModal(true)
  }

  const openEditProduct = (product: Product) => {
    setCreateType("product")
    setEditingId(product.id)
    setImagePreview(product.image_url || null)
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: String(product.selling_price),
      unit: product.unit,
      categoryId: product.categoryId || "",
      image: product.image_url || "",
      organic: product.is_organic,
      supplier: product.supplier || "",
      origin: product.origin || "",
      purchasePrice: product.purchasePrice ? String(product.purchasePrice) : "",
      currentStock: String(product.current_stock),
      minimumStock: String(product.minimum_stock),
    })
    setShowCreateModal(true)
  }

  const openEditComposition = (comp: Composition) => {
    setCreateType("composition")
    setEditingId(comp.id)
    setImagePreview(comp.imageUrl || null)
    setTypeSearch(comp.type)
    setCompositionForm({
      name: comp.name,
      type: comp.type,
      description: comp.description || "",
      basePrice: String(comp.basePrice),
      imageUrl: comp.imageUrl || "",
    })
    setShowCreateModal(true)
  }

  const createCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() })
      })
      if (res.ok) {
        const cat = await res.json()
        setCategories([...categories, cat])
        setProductForm(prev => ({ ...prev, categoryId: cat.id }))
        setNewCategoryName("")
        setShowNewCategory(false)
      }
    } catch (error) { console.error("Erreur:", error) }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (createType === "product") {
        if (!productForm.name || !productForm.price || !productForm.categoryId) {
          alert("Nom, prix et catégorie sont obligatoires")
          setSaving(false)
          return
        }
        const method = editingId ? "PUT" : "POST"
        const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products"
        const res = await fetch(url, {
          method, headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productForm)
        })
        if (res.ok) {
          setShowCreateModal(false)
          loadAll()
        } else {
          const err = await res.json().catch(() => ({}))
          alert(err.error || "Erreur lors de l'enregistrement du produit")
        }
      } else {
        if (!compositionForm.name || !compositionForm.basePrice) {
          alert("Nom et prix de base sont obligatoires")
          setSaving(false)
          return
        }
        const method = editingId ? "PUT" : "POST"
        const url = editingId ? `/api/admin/compositions/${editingId}` : "/api/admin/compositions"
        const res = await fetch(url, {
          method, headers: { "Content-Type": "application/json" },
          body: JSON.stringify(compositionForm)
        })
        if (res.ok) {
          setShowCreateModal(false)
          loadAll()
        } else {
          const err = await res.json().catch(() => ({}))
          alert(err.error || "Erreur lors de l'enregistrement de la composition")
        }
      }
    } catch (error) { console.error("Erreur:", error) }
    finally { setSaving(false) }
  }

  const getStatusBadge = (product: Product) => {
    switch (product.status) {
      case "inactive":
        return <Badge variant="secondary">Hors ligne</Badge>
      case "out_of_stock":
        return <Badge variant="destructive">Rupture</Badge>
      case "low_stock":
        return <Badge className="bg-amber-500">Stock bas</Badge>
      default:
        return <Badge className="bg-green-600">En ligne</Badge>
    }
  }

  const getCompositionTypeBadge = (type: string) => {
    return <Badge className="bg-orange-500">{type}</Badge>
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "18rem", "--header-height": "3rem" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Gestion du Catalogue</h1>
                <p className="text-muted-foreground">Produits, compositions, stocks et prix</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadAll} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Actualiser
                </Button>
                <Button onClick={() => openCreateModal("product")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Produit
                </Button>
                <Button variant="outline" onClick={() => openCreateModal("composition")}>
                  <ChefHat className="h-4 w-4 mr-2" />
                  Composition
                </Button>
              </div>
            </div>

            <SectionCards data={statsData} />

            {/* Tabs produits / compositions */}
            <div className="flex items-center gap-4 border-b pb-2">
              <button
                onClick={() => setActiveTab("products")}
                className={`pb-2 text-sm font-medium transition-colors ${activeTab === "products" ? "border-b-2 border-orange-500 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Produits ({filteredProducts.length})
              </button>
              <button
                onClick={() => setActiveTab("compositions")}
                className={`pb-2 text-sm font-medium transition-colors ${activeTab === "compositions" ? "border-b-2 border-orange-500 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Compositions ({filteredCompositions.length})
              </button>
            </div>

            {/* Recherche */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto mb-4" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                ) : activeTab === "products" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                                {product.image_url ? (
                                  <Image src={product.image_url} alt={product.name} width={40} height={40} className="object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.is_organic && <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Bio</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{product.categories?.name || "Non classé"}</TableCell>
                          <TableCell>{product.selling_price.toFixed(2)}€ / {product.unit}</TableCell>
                          <TableCell>
                            <span className={product.current_stock <= product.minimum_stock ? "text-red-500 font-semibold" : ""}>
                              {product.current_stock}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(product)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={updating === product.id}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditProduct(product)}>
                                  <Edit className="h-4 w-4 mr-2" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateProductStatus(product.id, product.status !== "inactive" ? "inactive" : "active")}>
                                  {product.status !== "inactive" ? <><EyeOff className="h-4 w-4 mr-2" /> Mettre hors ligne</> : <><Eye className="h-4 w-4 mr-2" /> Mettre en ligne</>}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStock(product.id, product.current_stock + 10)}>
                                  <Package className="h-4 w-4 mr-2" /> +10 Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteProduct(product.id)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredProducts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun produit trouvé</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Composition</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Prix de base</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompositions.map((comp) => (
                        <TableRow key={comp.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                                {comp.imageUrl ? (
                                  <Image src={comp.imageUrl} alt={comp.name} width={40} height={40} className="object-cover" />
                                ) : (
                                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <p className="font-medium">{comp.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getCompositionTypeBadge(comp.type)}</TableCell>
                          <TableCell>{comp.basePrice.toFixed(2)}€</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditComposition(comp)} disabled={updating === comp.id}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteComposition(comp.id)} disabled={updating === comp.id}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredCompositions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune composition trouvée</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>

      {/* Modal Création */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier" : "Créer"} {createType === "product" ? "un produit" : "une composition"}</DialogTitle>
            <DialogDescription>
              {createType === "product" ? "Ajoutez un produit à vendre dans la boutique" : "Ajoutez une composition personnalisable (jus, soupe, découpés)"}
            </DialogDescription>
          </DialogHeader>

          {/* Toggle type */}
          {!editingId && (
            <div className="flex gap-2 mb-4">
              <Button
                variant={createType === "product" ? "default" : "outline"}
                size="sm"
                onClick={() => setCreateType("product")}
              >
                <Package className="h-4 w-4 mr-1" /> Produit
              </Button>
              <Button
                variant={createType === "composition" ? "default" : "outline"}
                size="sm"
                onClick={() => setCreateType("composition")}
              >
                <ChefHat className="h-4 w-4 mr-1" /> Composition
              </Button>
            </div>
          )}

          {createType === "product" ? (
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input value={productForm.name} onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Pomme Golden" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={productForm.description} onChange={(e) => setProductForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du produit" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prix de vente * (€)</Label>
                  <Input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm(f => ({ ...f, price: e.target.value }))} placeholder="2.50" />
                </div>
                <div>
                  <Label>Unité</Label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm(f => ({ ...f, unit: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Catégorie *</Label>
                {!showNewCategory ? (
                  <div className="flex gap-2">
                    <select
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm(f => ({ ...f, categoryId: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNewCategory(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nouvelle catégorie"
                      onKeyDown={(e) => e.key === "Enter" && createCategory()}
                    />
                    <Button type="button" size="sm" onClick={createCategory}>OK</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCategory(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Photo du produit</Label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center h-24 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-background">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, "product")
                      }}
                    />
                    {uploading ? (
                      <span className="text-sm text-muted-foreground">Compression...</span>
                    ) : imagePreview || productForm.image ? (
                      <img src={imagePreview || productForm.image} alt="Preview" className="h-20 w-20 object-cover rounded" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Cliquer pour uploader</span>
                    )}
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prix d'achat (€)</Label>
                  <Input type="number" step="0.01" value={productForm.purchasePrice} onChange={(e) => setProductForm(f => ({ ...f, purchasePrice: e.target.value }))} placeholder="1.50" />
                </div>
                <div>
                  <Label>Fournisseur</Label>
                  <Input value={productForm.supplier} onChange={(e) => setProductForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nom fournisseur" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stock actuel</Label>
                  <Input type="number" value={productForm.currentStock} onChange={(e) => setProductForm(f => ({ ...f, currentStock: e.target.value }))} />
                </div>
                <div>
                  <Label>Stock minimum</Label>
                  <Input type="number" value={productForm.minimumStock} onChange={(e) => setProductForm(f => ({ ...f, minimumStock: e.target.value }))} />
                </div>
              </div>
              <div className="relative">
                <Label>Origine</Label>
                <Input
                  value={originSearch || productForm.origin}
                  onChange={(e) => {
                    setOriginSearch(e.target.value)
                    setProductForm(f => ({ ...f, origin: e.target.value }))
                    setShowOriginSuggestions(true)
                  }}
                  onFocus={() => setShowOriginSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                  placeholder="Tapez pour chercher... (France, Espagne...)"
                />
                {showOriginSuggestions && filteredOrigins.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto">
                    {filteredOrigins.map(o => (
                      <button
                        key={o}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onMouseDown={() => {
                          setProductForm(f => ({ ...f, origin: o }))
                          setOriginSearch(o)
                          setShowOriginSuggestions(false)
                        }}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="organic"
                  checked={productForm.organic}
                  onChange={(e) => setProductForm(f => ({ ...f, organic: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="organic">Produit biologique</Label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input value={compositionForm.name} onChange={(e) => setCompositionForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Jus Détox Vert" />
              </div>
              <div>
                <Label>Type *</Label>
                <select
                  value={compositionForm.type}
                  onChange={(e) => setCompositionForm(f => ({ ...f, type: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="jus">Jus</option>
                  <option value="soupe">Soupe</option>
                  <option value="legumes-decoupes">Légumes découpés</option>
                  <option value="fruits-decoupes">Fruits découpés</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Détermine la page boutique : Jus/Soupe → « Jus & Soupes », Découpés → « Découpés ».
                </p>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={compositionForm.description} onChange={(e) => setCompositionForm(f => ({ ...f, description: e.target.value }))} placeholder="Description de la composition" />
              </div>
              <div>
                <Label>Prix de base * (€)</Label>
                <Input type="number" step="0.01" value={compositionForm.basePrice} onChange={(e) => setCompositionForm(f => ({ ...f, basePrice: e.target.value }))} placeholder="5.00" />
              </div>
              <div>
                <Label>Photo</Label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center h-24 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-background">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, "composition")
                      }}
                    />
                    {uploading ? (
                      <span className="text-sm text-muted-foreground">Compression...</span>
                    ) : imagePreview || compositionForm.imageUrl ? (
                      <img src={imagePreview || compositionForm.imageUrl} alt="Preview" className="h-20 w-20 object-cover rounded" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Cliquer pour uploader</span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
