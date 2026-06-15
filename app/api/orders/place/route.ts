import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { sendOrderConfirmation, sendNewOrderToCompany } from "@/lib/email"
import { cartItemUnitPrice, collectIngredientIds, deliveryFee as computeDeliveryFee } from "@/lib/pricing"
import { parseDeliveryDate } from "@/lib/utils"
import { getDeliveryConfig, getOrderNotificationEmail } from "@/app/actions/content"

function generatePickupCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * Commande sans paiement en ligne (Espèces ou CB à la livraison)
 * → Auto-confirmation immédiate
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const {
            deliveryMethod,
            deliveryDate,
            deliveryTime,
            deliverySlotId,
            deliveryAddress,
            deliveryCity,
            deliveryPostalCode,
            phone,
            promoCode,
            paymentMethod, // "cash" ou "card_on_delivery"
        } = body

        if (!paymentMethod || !["cash", "card_on_delivery"].includes(paymentMethod)) {
            return NextResponse.json({ error: "Mode de paiement invalide" }, { status: 400 })
        }

        // Récupération du panier
        const cartItems = await prisma.cartItem.findMany({
            where: { cart: { userId: session.user.id } },
            include: {
                product: true,
                composition: true,
            },
        })

        if (!cartItems.length) {
            return NextResponse.json({ error: "Votre panier est vide" }, { status: 400 })
        }

        // Vérification de la disponibilité du stock AVANT de créer la commande
        for (const item of cartItems) {
            if (item.productId && item.product) {
                if (!item.product.inStock || item.product.currentStock < item.quantity) {
                    return NextResponse.json(
                        {
                            error: `Stock insuffisant pour « ${item.product.name} » (${Math.max(0, item.product.currentStock)} restant${item.product.currentStock > 1 ? "s" : ""}).`,
                        },
                        { status: 409 },
                    )
                }
            }
        }

        // Vérifier la disponibilité du créneau de livraison choisi
        if (deliverySlotId) {
            const slot = await prisma.deliverySlot.findUnique({ where: { id: deliverySlotId } })
            if (!slot || !slot.isActive) {
                return NextResponse.json({ error: "Le créneau de livraison choisi n'est plus disponible." }, { status: 409 })
            }
            if (slot.currentOrders >= slot.maxOrders) {
                return NextResponse.json({ error: "Ce créneau de livraison est complet. Veuillez en choisir un autre." }, { status: 409 })
            }
        }

        // Prix actuels des produits-ingrédients (recalcul serveur des compositions = anti-fraude)
        const ingredientIds = collectIngredientIds(cartItems)
        const ingredientPrices = new Map<string, number>()
        if (ingredientIds.length) {
            const ingProducts = await prisma.product.findMany({
                where: { id: { in: ingredientIds } },
                select: { id: true, price: true },
            })
            for (const p of ingProducts) ingredientPrices.set(p.id, p.price)
        }

        // Calcul du total — prix unitaire recalculé côté serveur (taille + ingrédients pour les compositions)
        let subtotal = 0
        const orderItemsData = cartItems.map((item) => {
            const unitPrice = cartItemUnitPrice(item, ingredientPrices)
            subtotal += unitPrice * item.quantity
            return {
                productId: item.productId || null,
                compositionId: item.compositionId || null,
                quantity: item.quantity,
                priceAtPurchase: unitPrice,
                customData: item.customData ?? undefined,
            }
        })

        // Validation et application du code promo
        let promoDiscount = 0
        let validPromoCode: string | null = null

        if (promoCode) {
            const promo = await prisma.promoCode.findUnique({
                where: { code: promoCode.toUpperCase().trim() },
            })

            if (
                promo &&
                promo.isActive &&
                (!promo.expiresAt || new Date(promo.expiresAt) >= new Date()) &&
                (promo.maxUses === 0 || promo.currentUses < promo.maxUses) &&
                subtotal >= promo.minOrder
            ) {
                if (promo.type === "percentage") {
                    promoDiscount = subtotal * (promo.value / 100)
                } else {
                    promoDiscount = promo.value
                }
                promoDiscount = Math.min(promoDiscount, subtotal)
                promoDiscount = Math.round(promoDiscount * 100) / 100
                validPromoCode = promo.code

                await prisma.promoCode.update({
                    where: { id: promo.id },
                    data: { currentUses: { increment: 1 } },
                })
            }
        }

        // Frais de livraison — basés sur la config réelle (frais + seuil de gratuité)
        const isDelivery = deliveryMethod === "livraison"
        const cfg = await getDeliveryConfig()
        const deliveryFee = computeDeliveryFee(subtotal, isDelivery ? "livraison" : "retrait", cfg)
        const total = subtotal - promoDiscount + deliveryFee

        // Adresse utilisateur si pas fournie
        let finalAddress = deliveryAddress
        let finalCity = deliveryCity
        let finalPostalCode = deliveryPostalCode

        if (isDelivery && !finalAddress) {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } })
            if (user) {
                finalAddress = user.address
                finalCity = user.city
                finalPostalCode = user.postalCode
            }
        }

        // Numéro de facture
        const invoiceNumber = `FAC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

        // Création de la commande → auto-confirmée ("validated")
        const order = await prisma.order.create({
            data: {
                userId: session.user.id,
                total,
                status: "validated", // ← Auto-confirmé !
                deliveryMethod: deliveryMethod || "livraison",
                deliveryFee,
                deliveryDate: parseDeliveryDate(deliveryDate),
                deliverySlot: deliveryTime || null,
                deliveryAddress: isDelivery ? finalAddress : null,
                deliveryCity: isDelivery ? finalCity : null,
                deliveryPostalCode: isDelivery ? finalPostalCode : null,
                phone: phone || null,
                pickupCode: deliveryMethod === "retrait" ? generatePickupCode() : null,
                promoCode: validPromoCode,
                discount: promoDiscount,
                invoiceNumber,
                carrier: paymentMethod === "cash" ? "Espèces" : "CB à la livraison",
                items: {
                    create: orderItemsData,
                },
            },
        })

        // Décrémenter le stock
        const orderItems = await prisma.orderItem.findMany({
            where: { orderId: order.id },
            include: { product: true },
        })
        for (const item of orderItems) {
            if (item.productId && item.product) {
                const newStock = Math.max(0, item.product.currentStock - item.quantity)
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        currentStock: newStock,
                        inStock: newStock > 0,
                    },
                })
            }
        }

        // Réserver le créneau de livraison (incrémente currentOrders)
        if (deliverySlotId) {
            await prisma.deliverySlot.updateMany({
                where: { id: deliverySlotId },
                data: { currentOrders: { increment: 1 } },
            })
        }

        // Vider le panier
        const userCart = await prisma.cart.findUnique({ where: { userId: session.user.id } })
        if (userCart) {
            const items = await prisma.cartItem.findMany({ where: { cartId: userCart.id } })
            for (const item of items) {
                await prisma.cartItem.delete({ where: { id: item.id } })
            }
        }

        // Email de confirmation client
        const user = await prisma.user.findUnique({ where: { id: session.user.id } })
        if (user?.email) {
            await sendOrderConfirmation(
                user.email,
                order.id,
                order.total,
                order.deliveryMethod || undefined,
                order.pickupCode
            )
        }

        // Notification à la société (non bloquant : n'échoue jamais la commande)
        try {
            const companyEmail = await getOrderNotificationEmail()
            if (companyEmail) {
                await sendNewOrderToCompany(companyEmail, {
                    orderId: order.id,
                    orderNumber: `CMD-${order.id.slice(-6).toUpperCase()}`,
                    customerName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Client",
                    customerEmail: user?.email ?? "",
                    customerPhone: order.phone,
                    total: order.total,
                    deliveryMethod: order.deliveryMethod,
                    deliveryDate: order.deliveryDate,
                    deliverySlot: order.deliverySlot,
                    address: isDelivery
                        ? {
                              line: order.deliveryAddress,
                              city: order.deliveryCity,
                              postalCode: order.deliveryPostalCode,
                          }
                        : null,
                    pickupCode: order.pickupCode,
                    items: orderItems.map((it) => ({
                        name: it.product?.name ?? "Composition personnalisée",
                        quantity: it.quantity,
                        price: it.priceAtPurchase,
                    })),
                })
            }
        } catch (notifyError) {
            console.error("⚠️ Notification société échouée:", notifyError)
        }

        return NextResponse.json({
            success: true,
            orderId: order.id,
            pickupCode: order.pickupCode,
            invoiceNumber: order.invoiceNumber,
            paymentMethod: paymentMethod === "cash" ? "Espèces" : "Carte bleue à la livraison",
        })
    } catch (error) {
        console.error("🔴 Order error:", error)
        return NextResponse.json({ error: "Erreur lors de la création de la commande" }, { status: 500 })
    }
}
