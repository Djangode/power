"use client"

import { useState } from "react"
import { ShoppingCart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addToCart } from "@/app/actions/cart"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AddToCartButtonProps {
    productId?: string
    compositionId?: string
    name: string
    price: number
    quantity?: number
    className?: string
}

export default function AddToCartButton({ productId, compositionId, name, price, quantity = 1, className }: AddToCartButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await addToCart({
                productId,
                compositionId,
                quantity: quantity
            })

            if (result.success) {
                toast.success(`${name} ajouté au panier !`)
                window.dispatchEvent(new Event("cart-updated"))
            } else {
                toast.error(result.error || "Erreur lors de l'ajout au panier")
            }
        } catch (error) {
            console.error("Cart error:", error)
            toast.error("Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleAddToCart}
            disabled={loading}
            className={cn(
                "rounded-[24px] bg-orange-500 hover:bg-orange-600 text-white font-black h-20 text-xl gap-4 shadow-2xl shadow-orange-500/40 uppercase italic transition-all active:scale-95",
                className
            )}
        >
            {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
                <ShoppingCart className="w-6 h-6" />
            )}
            {loading ? "..." : (className?.includes("h-12") ? "Ajouter" : "Ajouter au panier")}
        </Button>
    )
}
