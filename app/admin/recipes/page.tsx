"use client"

import React, { useState, useEffect } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Plus, Trash2, Edit, ChefHat, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Recipe {
  id: string
  title: string
  description: string | null
  content: string | null
  duration: string | null
  difficulty: string | null
  imageUrl: string | null
  createdAt: string
}

export default function RecipesAdminPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formDuration, setFormDuration] = useState("")
  const [formDifficulty, setFormDifficulty] = useState("")
  const [formImageUrl, setFormImageUrl] = useState("")

  const fetchRecipes = async () => {
    try {
      const res = await fetch("/api/admin/recipes")
      if (res.ok) {
        const data = await res.json()
        setRecipes(data)
      }
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecipes() }, [])

  const resetForm = () => {
    setFormTitle("")
    setFormDescription("")
    setFormContent("")
    setFormDuration("")
    setFormDifficulty("")
    setFormImageUrl("")
    setEditingId(null)
    setShowForm(false)
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setFormImageUrl(url)
      } else {
        toast.error("Erreur lors de l'upload")
      }
    } catch {
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      title: formTitle,
      description: formDescription,
      content: formContent,
      duration: formDuration,
      difficulty: formDifficulty,
      imageUrl: formImageUrl,
    }

    try {
      const res = await fetch("/api/admin/recipes", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(editingId ? "Recette modifiée" : "Recette créée")
        resetForm()
        fetchRecipes()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur serveur")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette recette ?")) return
    try {
      const res = await fetch("/api/admin/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success("Recette supprimée")
        fetchRecipes()
      }
    } catch {
      toast.error("Erreur de suppression")
    }
  }

  const handleEdit = (recipe: Recipe) => {
    setEditingId(recipe.id)
    setFormTitle(recipe.title)
    setFormDescription(recipe.description || "")
    setFormContent(recipe.content || "")
    setFormDuration(recipe.duration || "")
    setFormDifficulty(recipe.difficulty || "")
    setFormImageUrl(recipe.imageUrl || "")
    setShowForm(true)
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ChefHat className="h-6 w-6" /> Recettes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{recipes.length} recette(s)</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle recette
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Modifier la recette" : "Nouvelle recette"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Titre *</Label>
                    <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Durée</Label>
                    <Input value={formDuration} onChange={(e) => setFormDuration(e.target.value)} placeholder="30 min" />
                  </div>
                  <div>
                    <Label>Difficulté</Label>
                    <Input value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} placeholder="Facile, Moyen, Difficile" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={2}
                      placeholder="Court résumé affiché dans la liste"
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Recette (étapes)</Label>
                    <textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      rows={8}
                      placeholder="Ingrédients et étapes de préparation…"
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Image</Label>
                    <label className="flex items-center justify-center h-24 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-background">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file)
                        }}
                      />
                      {uploading ? (
                        <span className="text-sm text-muted-foreground">Compression…</span>
                      ) : formImageUrl ? (
                        <img src={formImageUrl} alt="Aperçu" className="h-20 w-20 object-cover rounded" />
                      ) : (
                        <span className="text-sm text-muted-foreground">Cliquer pour uploader</span>
                      )}
                    </label>
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <Button type="submit">{editingId ? "Modifier" : "Créer"}</Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : recipes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucune recette. Cliquez sur "Nouvelle recette" pour commencer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Difficulté</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipes.map((recipe) => (
                      <TableRow key={recipe.id}>
                        <TableCell className="font-medium">{recipe.title}</TableCell>
                        <TableCell>{recipe.duration || "—"}</TableCell>
                        <TableCell>{recipe.difficulty || "—"}</TableCell>
                        <TableCell>
                          {new Date(recipe.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(recipe)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(recipe.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
