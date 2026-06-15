"use client"

import React, { useState, useEffect } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { Button } from "@/components/admin/ui/button"
import { Badge } from "@/components/admin/ui/badge"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Plus, Trash2, Edit, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface BlogPost {
  id: string
  title: string
  content: string
  excerpt: string | null
  author: string
  category: string | null
  imageUrl: string | null
  published: boolean
  createdAt: string
}

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formTitle, setFormTitle] = useState("")
  const [formExcerpt, setFormExcerpt] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formAuthor, setFormAuthor] = useState("Equipe Power")
  const [formCategory, setFormCategory] = useState("")
  const [formImageUrl, setFormImageUrl] = useState("")
  const [formPublished, setFormPublished] = useState(true)

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/admin/blog")
      if (res.ok) {
        const data = await res.json()
        setPosts(data)
      }
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [])

  const resetForm = () => {
    setFormTitle("")
    setFormExcerpt("")
    setFormContent("")
    setFormAuthor("Equipe Power")
    setFormCategory("")
    setFormImageUrl("")
    setFormPublished(true)
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
      excerpt: formExcerpt,
      content: formContent,
      author: formAuthor,
      category: formCategory,
      imageUrl: formImageUrl,
      published: formPublished,
    }

    try {
      const res = await fetch("/api/admin/blog", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(editingId ? "Article modifié" : "Article créé")
        resetForm()
        fetchPosts()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur serveur")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return
    try {
      const res = await fetch("/api/admin/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success("Article supprimé")
        fetchPosts()
      }
    } catch {
      toast.error("Erreur de suppression")
    }
  }

  const handleTogglePublished = async (post: BlogPost) => {
    try {
      await fetch("/api/admin/blog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, published: !post.published }),
      })
      fetchPosts()
    } catch {
      toast.error("Erreur de mise à jour")
    }
  }

  const handleEdit = (post: BlogPost) => {
    setEditingId(post.id)
    setFormTitle(post.title)
    setFormExcerpt(post.excerpt || "")
    setFormContent(post.content)
    setFormAuthor(post.author)
    setFormCategory(post.category || "")
    setFormImageUrl(post.imageUrl || "")
    setFormPublished(post.published)
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
                <FileText className="h-6 w-6" /> Articles du Blog
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{posts.length} article(s)</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel article
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Modifier l'article" : "Nouvel article"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Titre *</Label>
                    <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Auteur</Label>
                    <Input value={formAuthor} onChange={(e) => setFormAuthor(e.target.value)} placeholder="Equipe Power" />
                  </div>
                  <div>
                    <Label>Catégorie</Label>
                    <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Actualité, Conseils…" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Extrait</Label>
                    <textarea
                      value={formExcerpt}
                      onChange={(e) => setFormExcerpt(e.target.value)}
                      rows={2}
                      placeholder="Court résumé affiché dans la liste"
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Contenu *</Label>
                    <textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      rows={8}
                      required
                      placeholder="Corps de l'article…"
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
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input
                      id="published"
                      type="checkbox"
                      checked={formPublished}
                      onChange={(e) => setFormPublished(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="published" className="cursor-pointer">Publié</Label>
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
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun article. Cliquez sur "Nouvel article" pour commencer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Auteur</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell>{post.category || "—"}</TableCell>
                        <TableCell>{post.author}</TableCell>
                        <TableCell>
                          {new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={post.published ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleTogglePublished(post)}
                          >
                            {post.published ? "Publié" : "Brouillon"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(post)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(post.id)}>
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
