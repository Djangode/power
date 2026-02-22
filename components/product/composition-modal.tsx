"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Plus, Minus, Trash2, Loader2 } from "lucide-react"
import { addToCart } from "@/app/actions/cart"
import { toast } from "sonner"

interface CompositionType {
  id: string
  name: string
  type: string
  basePrice: number
  description: string
  image: string
}

interface IngredientProduct {
  id: string
  name: string
  price: number
  category: string
}

interface CompositionModalProps {
  composition: CompositionType
  isOpen: boolean
  onClose: () => void
  availableProducts?: IngredientProduct[]
}

interface SelectedIngredient {
  id: string
  ingredientId: string
}

// Tous les produits sont disponibles comme ingrédients pour toute composition
function getRelevantCategories(): string[] | null {
  return null // Tous les produits de la DB sont accessibles
}

export default function CompositionModal({ composition, isOpen, onClose, availableProducts = [] }: CompositionModalProps) {
  const [selections, setSelections] = useState<SelectedIngredient[]>([
    { id: crypto.randomUUID(), ingredientId: "" },
    { id: crypto.randomUUID(), ingredientId: "" },
  ])
  const [quantity, setQuantity] = useState("1")
  const [size, setSize] = useState("standard")
  const [isAdding, setIsAdding] = useState(false)

  // Filtrer les produits par catégorie pertinente pour ce type de composition
  const relevantCategories = getRelevantCategories()
  const filteredIngredients = relevantCategories
    ? availableProducts.filter(p => {
        const cat = p.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        return relevantCategories.some(rc => cat.includes(rc))
      })
    : availableProducts

  // Reset quand la composition change
  useEffect(() => {
    setSelections([
      { id: crypto.randomUUID(), ingredientId: "" },
      { id: crypto.randomUUID(), ingredientId: "" },
    ])
    setQuantity("1")
    setSize("standard")
  }, [composition.id])

  const addIngredientSlot = () => {
    setSelections(prev => [...prev, { id: crypto.randomUUID(), ingredientId: "" }])
  }

  const removeIngredientSlot = (slotId: string) => {
    if (selections.length <= 1) return
    setSelections(prev => prev.filter(s => s.id !== slotId))
  }

  const updateIngredient = (slotId: string, ingredientId: string) => {
    setSelections(prev => prev.map(s => s.id === slotId ? { ...s, ingredientId } : s))
  }

  const selectedIds = selections.map(s => s.ingredientId).filter(Boolean)

  const sizeMultiplier = size === "large" ? 1.5 : size === "small" ? 0.7 : 1

  const ingredientsPrice = selections.reduce((total, sel) => {
    const ing = filteredIngredients.find(i => i.id === sel.ingredientId)
    return total + (ing ? ing.price : 0)
  }, 0)

  const totalPrice = (composition.basePrice + ingredientsPrice) * sizeMultiplier * parseInt(quantity)

  const getSizeLabel = (s: string) => {
    const sizeLabels: Record<string, string> = { small: "Petit", standard: "Standard", large: "Grand" }
    return sizeLabels[s] || s
  }

  const handleAddToCart = async () => {
    setIsAdding(true)
    const chosenIngredients = selections
      .filter(s => s.ingredientId)
      .map(s => {
        const ing = filteredIngredients.find(i => i.id === s.ingredientId)
        return ing ? { id: ing.id, name: ing.name, price: ing.price } : null
      })
      .filter(Boolean)

    try {
      const result = await addToCart({
        compositionId: composition.id,
        quantity: parseInt(quantity),
        customData: {
          size,
          sizeLabel: getSizeLabel(size),
          ingredients: chosenIngredients,
          totalPrice: totalPrice,
        }
      })
      if (result.success) {
        toast.success(`${quantity} x ${composition.name} ajouté au panier !`, {
          style: { background: "#f97316", color: "#fff", border: "none" }
        })
        window.dispatchEvent(new Event("cart-updated"))
        onClose()
      } else {
        toast.error("Erreur lors de l'ajout au panier.")
      }
    } catch (error) {
      console.error(error)
      toast.error("Erreur lors de l'ajout au panier.")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Composer {composition.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image + description */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800">
              <Image
                src={composition.image || "/placeholder.svg"}
                alt={composition.name}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover"
              />
            </div>
            <p className="text-muted-foreground text-sm">{composition.description}</p>
            <span className="text-xl font-bold text-orange-600">
              À partir de {composition.basePrice.toFixed(2)}€
            </span>
          </div>

          {/* Configuration */}
          <div className="space-y-5">
            {/* Taille */}
            <div>
              <label className="block text-sm font-medium mb-2">Taille</label>
              <div className="grid grid-cols-3 gap-2">
                {(["small", "standard", "large"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`py-3 rounded-xl text-sm font-bold transition-all ${
                      size === s
                        ? "bg-orange-500 text-white"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    <div>{s === "small" ? "Petit" : s === "standard" ? "Standard" : "Grand"}</div>
                    <div className="text-xs opacity-70">{getSizeLabel(s)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ingrédients depuis la DB */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Vos ingrédients ({filteredIngredients.length} disponibles)
              </label>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selections.map((sel, index) => (
                  <div key={sel.id} className="flex items-center gap-2">
                    <Select
                      value={sel.ingredientId}
                      onValueChange={(val) => updateIngredient(sel.id, val)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={`Ingrédient ${index + 1}`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {filteredIngredients
                          .filter(ing => !selectedIds.includes(ing.id) || ing.id === sel.ingredientId)
                          .map(ing => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} (+{ing.price.toFixed(2)}€/{ing.category})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {selections.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-zinc-400 hover:text-red-400"
                        onClick={() => removeIngredientSlot(sel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={addIngredientSlot}
              >
                <Plus className="h-4 w-4 mr-1" /> Ajouter un ingrédient
              </Button>
            </div>

            {/* Quantité */}
            <div>
              <label className="block text-sm font-medium mb-2">Quantité</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1)))}
                  className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(String(Math.min(10, parseInt(quantity) + 1)))}
                  className="h-10 w-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Separator />

            {/* Total */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total:</span>
                <span className="text-orange-600">{totalPrice.toFixed(2)}€</span>
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3"
                onClick={handleAddToCart}
                disabled={isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-5 w-5 mr-2" />
                )}
                {isAdding ? "Ajout en cours..." : "Ajouter au panier"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
