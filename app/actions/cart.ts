"use server"

import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { auth } from "@/auth"

// Helper : Obtenir l'ID du panier actif (via User ou SessionId anonyme)
export async function getCartId() {
    try {
        const session = await auth()
        const userId = session?.user?.id
        const cookieStore = await cookies()
        let sessionId = cookieStore.get("cart_session_id")?.value

        if (!userId && !sessionId) {
            sessionId = crypto.randomUUID()
            cookieStore.set("cart_session_id", sessionId, { maxAge: 60 * 60 * 24 * 30 }) // 30 jours
        }

        // Chercher panier existant
        let cart = await prisma.cart.findFirst({
            where: userId ? { userId } : { sessionId }
        })

        // Le créer s'il n'existe pas
        if (!cart) {
            cart = await prisma.cart.create({
                data: userId ? { userId } : { sessionId }
            })
        }

        // SI on a un user MAIS qu'un panier anonyme existait avant le login, on fusionne
        if (userId && sessionId) {
            try {
                const anonymousCart = await prisma.cart.findFirst({ where: { sessionId } })
                if (anonymousCart && anonymousCart.id !== cart.id) {
                    // Transfert des items un par un (pas de transaction, Neon HTTP)
                    const anonItems = await prisma.cartItem.findMany({ where: { cartId: anonymousCart.id } })
                    for (const item of anonItems) {
                        await prisma.cartItem.update({
                            where: { id: item.id },
                            data: { cartId: cart.id }
                        })
                    }
                    await prisma.cart.delete({ where: { id: anonymousCart.id } })
                }
            } catch (e) {
                console.error("Cart merge failed:", e)
            }
            cookieStore.delete("cart_session_id")
        }

        return cart.id
    } catch (error) {
        console.error("Error getting cart ID:", error)
        throw new Error("Impossible d'accéder au panier")
    }
}

// Action : Ajouter au Panier
export async function addToCart({ productId, compositionId, quantity = 1, customData }: { productId?: string, compositionId?: string, quantity?: number, customData?: any }) {
    try {
        const cartId = await getCartId()

        // Cherche l'item
        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId,
                productId: productId || null,
                compositionId: compositionId || null
            }
        })

        if (existingItem && !customData) {
            // Augmente la quantité (produits simples)
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + quantity }
            })
        } else if (existingItem && customData) {
            // Composition avec choix personnalisés — update les données
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + quantity, customData }
            })
        } else {
            // Cree nouvel item
            await prisma.cartItem.create({
                data: {
                    cartId,
                    productId: productId || null,
                    compositionId: compositionId || null,
                    quantity,
                    ...(customData ? { customData } : {})
                }
            })
        }

        return { success: true }
    } catch (error) {
        console.error("Error adding to cart:", error)
        return { success: false, error: "Failed to add item to cart" }
    }
}

// Action : Recupérer tous les items du panier
export async function getCartItems() {
    try {
        const cartId = await getCartId()

        const items = await prisma.cartItem.findMany({
            where: { cartId },
            include: {
                product: {
                    select: { id: true, name: true, price: true, image: true, unit: true, inStock: true, currentStock: true }
                },
                composition: {
                    select: { id: true, name: true, basePrice: true, imageUrl: true, type: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: items }
    } catch (error) {
        console.error("Error fetching cart items:", error)
        return { success: false, data: [] }
    }
}

// Action : Mettre a jour Quantité
export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
    try {
        if (quantity <= 0) {
            await prisma.cartItem.delete({ where: { id: cartItemId } })
        } else {
            await prisma.cartItem.update({
                where: { id: cartItemId },
                data: { quantity }
            })
        }
        return { success: true }
    } catch (error) {
        console.error("Error updating cart item:", error)
        return { success: false }
    }
}

// Action : Supprimer Item
export async function removeCartItem(cartItemId: string) {
    try {
        await prisma.cartItem.delete({ where: { id: cartItemId } })
        return { success: true }
    } catch (error) {
        console.error("Error removing cart item:", error)
        return { success: false }
    }
}

// Action : Vider le panier
export async function clearCart() {
    try {
        const cartId = await getCartId()
        const items = await prisma.cartItem.findMany({ where: { cartId } })
        for (const item of items) {
            await prisma.cartItem.delete({ where: { id: item.id } })
        }
        return { success: true }
    } catch (error) {
        console.error("Error clearing cart:", error)
        return { success: false }
    }
}

// Action : Décrémenter depuis la fiche produit (par productId)
export async function decrementFromCart(productId: string) {
    try {
        const cartId = await getCartId()

        const item = await prisma.cartItem.findFirst({
            where: { cartId, productId }
        })

        if (!item) return { success: true, removed: false, newQuantity: 0 }

        if (item.quantity <= 1) {
            await prisma.cartItem.delete({ where: { id: item.id } })
            return { success: true, removed: true, newQuantity: 0 }
        } else {
            await prisma.cartItem.update({
                where: { id: item.id },
                data: { quantity: item.quantity - 1 }
            })
            return { success: true, removed: false, newQuantity: item.quantity - 1 }
        }
    } catch (error) {
        console.error("Error decrementing cart item:", error)
        return { success: false, removed: false, newQuantity: 0 }
    }
}
