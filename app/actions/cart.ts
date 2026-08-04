"use server"

import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { auth } from "@/auth"
import { roundToStep, minQuantity, formatQuantity } from "@/lib/units"

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
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return { success: false, error: "Quantité invalide" }
        }

        const cartId = await getCartId()

        // Contrôle de stock dès l'ajout : sans lui, le client ne découvre la rupture qu'au
        // moment de valider sa commande, après avoir saisi adresse et créneau.
        if (productId) {
            const product = await prisma.product.findUnique({
                where: { id: productId },
                select: { name: true, unit: true, inStock: true, currentStock: true },
            })
            if (!product || !product.inStock) {
                return { success: false, error: "Ce produit n'est plus disponible" }
            }

            // La quantité est réalignée ici sur le pas de l'unité : le formulaire peut être
            // contourné, et une quantité au millième fausserait la pesée comme la facture.
            quantity = roundToStep(quantity, product.unit)
            if (quantity < minQuantity(product.unit)) {
                return {
                    success: false,
                    error: `Quantité minimale : ${formatQuantity(minQuantity(product.unit), product.unit)}`,
                }
            }

            const alreadyInCart = await prisma.cartItem.findFirst({
                where: { cartId, productId },
                select: { quantity: true },
            })
            const requested = roundToStep((alreadyInCart?.quantity ?? 0) + quantity, product.unit)
            if (requested > product.currentStock) {
                const left = Math.max(0, product.currentStock - (alreadyInCart?.quantity ?? 0))
                return {
                    success: false,
                    error: left > 0
                        ? `Il ne reste que ${formatQuantity(left, product.unit)} de « ${product.name} » en stock`
                        : `« ${product.name} » est épuisé`,
                }
            }
        }

        // Cherche l'item.
        // Une composition personnalisée n'est fusionnée qu'avec une personnalisation
        // identique : un jus taille S et un jus taille L doivent rester deux lignes.
        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId,
                productId: productId || null,
                compositionId: compositionId || null,
                ...(customData ? { customData: { equals: customData } } : {}),
            }
        })

        if (existingItem) {
            // Même produit, ou même composition avec exactement la même personnalisation :
            // on cumule les quantités sur la ligne existante.
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + quantity }
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
                    select: { id: true, name: true, price: true, promoPrice: true, image: true, unit: true, inStock: true, currentStock: true }
                },
                composition: {
                    // Formats et ingrédients inclus : le panier doit afficher le même prix
                    // que celui recalculé à la commande, sinon le total change en cours de route.
                    select: {
                        id: true, name: true, basePrice: true, imageUrl: true, type: true,
                        sizes: { select: { id: true, name: true, price: true, isDefault: true, includedChoices: true } },
                        options: {
                            where: { isActive: true },
                            select: { id: true, name: true, extraPrice: true, includedByDefault: true },
                        },
                    }
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

/**
 * Vérifie que l'item visé appartient bien au panier de l'appelant.
 * Sans ce contrôle, un identifiant d'item deviné suffit à modifier ou vider le panier
 * de n'importe quel autre visiteur.
 */
async function assertItemBelongsToCaller(cartItemId: string) {
    const cartId = await getCartId()
    const item = await prisma.cartItem.findFirst({
        where: { id: cartItemId, cartId },
        select: { id: true },
    })
    return item ? cartId : null
}

// Action : Mettre a jour Quantité
export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
    try {
        if (!(await assertItemBelongsToCaller(cartItemId))) {
            return { success: false, error: "Article introuvable dans votre panier" }
        }

        if (quantity > 0) {
            const item = await prisma.cartItem.findUnique({
                where: { id: cartItemId },
                include: { product: { select: { name: true, unit: true, currentStock: true, inStock: true } } },
            })
            if (item?.product) {
                if (!item.product.inStock) {
                    return { success: false, error: "Ce produit n'est plus disponible" }
                }
                quantity = roundToStep(quantity, item.product.unit)
                if (quantity < minQuantity(item.product.unit)) {
                    return {
                        success: false,
                        error: `Quantité minimale : ${formatQuantity(minQuantity(item.product.unit), item.product.unit)}`,
                    }
                }
                if (quantity > item.product.currentStock) {
                    return {
                        success: false,
                        error: `Il ne reste que ${formatQuantity(Math.max(0, item.product.currentStock), item.product.unit)} de « ${item.product.name} » en stock`,
                    }
                }
            }
        }

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
        if (!(await assertItemBelongsToCaller(cartItemId))) {
            return { success: false, error: "Article introuvable dans votre panier" }
        }

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
