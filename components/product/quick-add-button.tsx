"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { addToCart } from "@/app/actions/cart"
import { toast } from "sonner"

interface QuickAddButtonProps {
    itemId: string
    itemType: "product" | "composition"
    itemName: string
}

export default function QuickAddButton({ itemId, itemType, itemName }: QuickAddButtonProps) {
    const [isAdding, setIsAdding] = useState(false)

    const handleAdd = async () => {
        setIsAdding(true)
        try {
            const result = await addToCart(
                itemType === "product"
                    ? { productId: itemId, quantity: 1 }
                    : { compositionId: itemId, quantity: 1 }
            )
            if (result.success) {
                toast.success(`1 x ${itemName} ajouté au panier !`, {
                    style: { background: "#f97316", color: "#fff", border: "none" }
                })
            } else {
                toast.error("Erreur lors de l'ajout au panier.", {
                    style: { background: "#ef4444", color: "#fff", border: "none" }
                })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <Button
            size="icon"
            aria-label={`Ajouter ${itemName} au panier`}
            onClick={handleAdd}
            disabled={isAdding}
            className="rounded-full bg-white/10 hover:bg-orange-500 text-white backdrop-blur-md transition-all border border-white/10 disabled:opacity-50"
        >
            {isAdding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Plus className="w-5 h-5" />
            )}
        </Button>
    )
}
