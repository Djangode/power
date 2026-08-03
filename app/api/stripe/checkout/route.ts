import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import Stripe from "stripe"
import { prisma } from "@/lib/db"
import { cartItemUnitPrice, collectIngredientIds } from "@/lib/pricing"
import { parseDeliveryDate } from "@/lib/utils"

function getStripe() {
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-01-27.acacia" as any,
    })
}

function generatePickupCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(req: NextRequest) {
    const stripe = getStripe()
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const { deliveryMethod, deliveryDate, deliveryTime, deliverySlotId, deliveryAddress, deliveryCity, deliveryPostalCode, phone, promoCode } = body

        // Récupération du panier dynamique de l'utilisateur
        const cartItems = await prisma.cartItem.findMany({
            where: { cart: { userId: session.user.id } },
            include: {
                product: true,
                composition: true
            }
        })

        if (!cartItems.length) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
        }

        // Vérification de la disponibilité du stock AVANT de créer la commande / la session de paiement
        for (const item of cartItems) {
            if (item.productId && item.product) {
                if (!item.product.inStock || item.product.currentStock < item.quantity) {
                    return NextResponse.json(
                        { error: `Stock insuffisant pour « ${item.product.name} » (${Math.max(0, item.product.currentStock)} restant${item.product.currentStock > 1 ? "s" : ""}).` },
                        { status: 409 }
                    )
                }
            }
        }

        // Vérifier la disponibilité du créneau de livraison choisi (réservation effective au webhook)
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

        // Calculer le total et préparer les items — prix unitaire recalculé côté serveur
        let subtotal = 0
        const unitPriceById = new Map<string, number>()
        const orderItemsData = cartItems.map(item => {
            const unitPrice = cartItemUnitPrice(item, ingredientPrices)
            unitPriceById.set(item.id, unitPrice)
            subtotal += unitPrice * item.quantity
            return {
                productId: item.productId || null,
                compositionId: item.compositionId || null,
                quantity: item.quantity,
                priceAtPurchase: unitPrice,
                customData: item.customData ?? undefined
            }
        })

        // Validation et application du code promo
        let promoDiscount = 0
        let validPromoCode: string | null = null

        if (promoCode) {
            const promo = await prisma.promoCode.findUnique({
                where: { code: promoCode.toUpperCase().trim() }
            })

            if (promo && promo.isActive
                && (!promo.expiresAt || new Date(promo.expiresAt) >= new Date())
                && (promo.maxUses === 0 || promo.currentUses < promo.maxUses)
                && subtotal >= promo.minOrder
            ) {
                if (promo.type === "percentage") {
                    promoDiscount = subtotal * (promo.value / 100)
                } else {
                    promoDiscount = promo.value
                }
                promoDiscount = Math.min(promoDiscount, subtotal)
                promoDiscount = Math.round(promoDiscount * 100) / 100
                validPromoCode = promo.code
                // NB: currentUses est incrémenté par le webhook Stripe UNIQUEMENT au paiement
                // confirmé, pour ne pas comptabiliser les sessions de paiement abandonnées.
            }
        }

        // Calcul frais de livraison
        const isDelivery = deliveryMethod === "livraison"
        const deliveryFee = isDelivery ? (subtotal >= 30 ? 0 : 4.90) : 0
        // Arrondi au centime : les sommes de flottants dérivent (6.6000000000000005) et
        // finiraient telles quelles en base.
        const total = Math.round((subtotal - promoDiscount + deliveryFee) * 100) / 100

        // Récupérer l'adresse utilisateur si pas fournie
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

        // Création de la commande "pending" avec toutes les infos
        const order = await prisma.order.create({
            data: {
                userId: session.user.id,
                total,
                status: "pending",
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
            }
        })

        // Lignes créées une par une : les writes imbriqués et createMany multi-lignes
        // ouvrent une transaction implicite, non supportée par l'adaptateur Neon HTTP
        // (cf. /api/orders/place).
        for (const item of orderItemsData) {
            await prisma.orderItem.create({ data: { ...item, orderId: order.id } })
        }

        // Préparer les items Stripe
        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map(item => {
            const name = item.productId ? item.product!.name : item.composition!.name
            const image = item.productId ? item.product!.image : item.composition!.imageUrl
            const price = unitPriceById.get(item.id) ?? cartItemUnitPrice(item, ingredientPrices)

            return {
                quantity: item.quantity,
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: name,
                        images: image ? [image] : undefined,
                    },
                    unit_amount: Math.round(price * 100),
                }
            }
        })

        // Ajouter les frais de livraison comme ligne Stripe si > 0
        if (deliveryFee > 0) {
            line_items.push({
                quantity: 1,
                price_data: {
                    currency: 'eur',
                    product_data: { name: "Frais de livraison" },
                    unit_amount: Math.round(deliveryFee * 100),
                }
            })
        }

        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

        // Créer un coupon Stripe si réduction appliquée
        let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
        if (promoDiscount > 0) {
            const coupon = await stripe.coupons.create({
                amount_off: Math.round(promoDiscount * 100),
                currency: 'eur',
                duration: 'once',
                name: `Promo ${validPromoCode}`,
            })
            discounts = [{ coupon: coupon.id }]
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            ...(discounts ? { discounts } : {}),
            success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/panier`,
            metadata: {
                orderId: order.id,
                userId: session.user.id,
                deliverySlotId: deliverySlotId || ""
            }
        })

        // Sauvegarder le sessionId Stripe dans la commande
        await prisma.order.update({
            where: { id: order.id },
            data: { stripeSessionId: checkoutSession.id }
        })

        return NextResponse.json({ url: checkoutSession.url })
    } catch (error) {
        console.error("🔴 Checkout error:", error)
        return NextResponse.json({ error: "Mise en place du checkout impossible." }, { status: 500 })
    }
}
