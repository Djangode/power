"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
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

interface CompositionBottomSheetProps {
  composition: CompositionType
  isOpen: boolean
  onClose: () => void
  availableProducts?: IngredientProduct[]
}

interface SelectedIngredient {
  id: string
  ingredientId: string
}

export default function CompositionBottomSheet({ composition, isOpen, onClose, availableProducts = [] }: CompositionBottomSheetProps) {
  const [selections, setSelections] = useState<SelectedIngredient[]>([
    { id: crypto.randomUUID(), ingredientId: "" },
    { id: crypto.randomUUID(), ingredientId: "" },
  ])
  const [quantity, setQuantity] = useState("1")
  const [size, setSize] = useState("standard")
  const [isAdding, setIsAdding] = useState(false)

  const filteredIngredients = availableProducts

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
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-gradient-to-b from-[#f5f0e8] to-[#e8e0d4] text-zinc-900 border-zinc-300 max-h-[85vh]">
        <div className="overflow-y-auto flex-1">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-xl font-bold text-zinc-900 text-left">
              Composer {composition.name}
            </DrawerTitle>
          </DrawerHeader>

          {/* Image */}
          <div className="relative mx-4 mt-3">
            <Image
              src={composition.image || "/placeholder.svg"}
              alt={composition.name}
              width={500}
              height={375}
              className="w-full aspect-[4/3] object-cover rounded-xl"
            />
          </div>

          {/* Config */}
          <div className="px-4 pt-4 space-y-4">
            <p className="text-sm text-zinc-500">{composition.description}</p>

            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-orange-600">À partir de {composition.basePrice.toFixed(2)}€</span>
            </div>

            <Separator className="bg-zinc-300" />

            {/* Taille */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Taille</label>
              <div className="grid grid-cols-3 gap-2">
                {(["small", "standard", "large"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                      size === s
                        ? "bg-orange-500 text-white"
                        : "bg-white/60 hover:bg-white/80 text-zinc-900 border border-zinc-200"
                    }`}
                  >
                    {s === "small" ? "Petit" : s === "standard" ? "Standard" : "Grand"}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingrédients */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Vos ingrédients ({filteredIngredients.length} disponibles)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selections.map((sel, index) => (
                  <div key={sel.id} className="flex items-center gap-2">
                    <Select
                      value={sel.ingredientId}
                      onValueChange={(val) => updateIngredient(sel.id, val)}
                    >
                      <SelectTrigger className="flex-1 bg-white/60 border-zinc-200 text-zinc-900">
                        <SelectValue placeholder={`Ingrédient ${index + 1}`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {filteredIngredients
                          .filter(ing => !selectedIds.includes(ing.id) || ing.id === sel.ingredientId)
                          .map(ing => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} (+{ing.price.toFixed(2)}€)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {selections.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-zinc-400 hover:text-red-500"
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
                className="mt-2 w-full border-zinc-300 text-zinc-700"
                onClick={addIngredientSlot}
              >
                <Plus className="h-4 w-4 mr-1" /> Ajouter un ingrédient
              </Button>
            </div>

            {/* Quantité */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Quantité</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1)))}
                  className="h-10 w-10 rounded-full bg-white/60 hover:bg-white/80 border border-zinc-200 flex items-center justify-center transition-colors"
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
          </div>
        </div>

        {/* Footer sticky */}
        <DrawerFooter className="border-t border-zinc-300 bg-[#e8e0d4]">
          <div className="flex items-center justify-between text-lg font-semibold text-zinc-900 mb-2">
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
