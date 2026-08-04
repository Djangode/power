import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { sendOrderConfirmation, sendNewOrderToCompany } from "@/lib/email"
import { cartItemUnitPrice, collectIngredientIds, deliveryFee as computeDeliveryFee } from "@/lib/pricing"
import { parseDeliveryDate } from "@/lib/utils"
import { getDeliveryConfig, getOrderNotificationEmail } from "@/app/actions/content"
import { nextInvoiceNumber } from "@/lib/invoice"
import { sendNewOrderToTelegram } from "@/lib/telegram"
import { describeSelection } from "@/lib/composition-pricing"

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

        // Les contrôles du formulaire ne protègent que l'utilisateur honnête : une commande
        // sans horaire, sans téléphone ou sans adresse complète est impossible à honorer.
        const method = deliveryMethod === "retrait" ? "retrait" : "livraison"
        const parsedDeliveryDate = parseDeliveryDate(deliveryDate)

        if (!parsedDeliveryDate) {
            return NextResponse.json(
                { error: method === "retrait" ? "Date de retrait manquante ou invalide" : "Date de livraison manquante ou invalide" },
                { status: 400 },
            )
        }
        if (!deliveryTime || typeof deliveryTime !== "string" || !deliveryTime.trim()) {
            return NextResponse.json(
                { error: method === "retrait" ? "Créneau de retrait manquant" : "Créneau de livraison manquant" },
                { status: 400 },
            )
        }
        if (!phone || typeof phone !== "string" || phone.replace(/[\s.\-]/g, "").length < 10) {
            return NextResponse.json({ error: "Numéro de téléphone manquant ou invalide" }, { status: 400 })
        }

        // Récupération du panier
        const cartItems = await prisma.cartItem.findMany({
            where: { cart: { userId: session.user.id } },
            include: {
                product: true,
                // Formats et ingrédients chargés depuis la base : le prix facturé est
                // recalculé ici, jamais repris de ce que le client a envoyé.
                composition: {
                    include: {
                        sizes: { select: { id: true, name: true, price: true, isDefault: true, includedChoices: true } },
                        options: {
                            where: { isActive: true },
                            select: { id: true, name: true, extraPrice: true, includedByDefault: true },
                        },
                    },
                },
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
            // La capacité (maxOrders) ne s'applique qu'à la LIVRAISON : un retrait n'occupe pas
            // de place de livraison. Sans ce garde, chaque Click & Collect mangeait une place
            // de livraison et se voyait refuser sur un créneau « complet » côté livraison.
            if (method === "livraison" && slot.currentOrders >= slot.maxOrders) {
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
        const isDelivery = method === "livraison"
        const cfg = await getDeliveryConfig()
        const deliveryFee = computeDeliveryFee(subtotal, isDelivery ? "livraison" : "retrait", cfg)
        // Arrondi au centime : les sommes de flottants dérivent (6.6000000000000005) et
        // finiraient telles quelles en base.
        const total = Math.round((subtotal - promoDiscount + deliveryFee) * 100) / 100

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

        if (isDelivery && (!finalAddress?.trim() || !finalCity?.trim() || !finalPostalCode?.trim())) {
            return NextResponse.json(
                { error: "Adresse de livraison incomplète (rue, code postal et ville sont requis)" },
                { status: 400 },
            )
        }

        // Numéro de facture séquentiel (obligation de numérotation continue, cf. lib/invoice)
        const invoiceNumber = await nextInvoiceNumber()

        // Création de la commande → auto-confirmée ("validated").
        // Les lignes sont créées SÉPARÉMENT, jamais en write imbriqué : un create Prisma
        // avec relation imbriquée ouvre une transaction implicite, que l'adaptateur Neon
        // HTTP ne supporte pas (« Transactions are not supported in HTTP mode »). Ce write
        // imbriqué faisait échouer toute commande en 500 — aucune n'a pu aboutir jusqu'ici.
        const order = await prisma.order.create({
            data: {
                userId: session.user.id,
                total,
                status: "validated", // ← Auto-confirmé !
                deliveryMethod: method,
                deliveryFee,
                deliveryDate: parsedDeliveryDate,
                deliverySlot: deliveryTime,
                deliveryAddress: isDelivery ? finalAddress : null,
                deliveryCity: isDelivery ? finalCity : null,
                deliveryPostalCode: isDelivery ? finalPostalCode : null,
                phone,
                pickupCode: method === "retrait" ? generatePickupCode() : null,
                promoCode: validPromoCode,
                discount: promoDiscount,
                invoiceNumber,
                carrier: paymentMethod === "cash" ? "Espèces" : "CB à la livraison",
            },
        })

        // Une par une, jamais createMany : Prisma enveloppe un createMany multi-lignes dans
        // une transaction, elle aussi refusée par l'adaptateur Neon HTTP. Un insert unitaire
        // est la seule écriture qui passe (même contrainte que la fusion de panier).
        for (const item of orderItemsData) {
            await prisma.orderItem.create({ data: { ...item, orderId: order.id } })
        }

        // Décrémenter le stock
        const orderItems = await prisma.orderItem.findMany({
            where: { orderId: order.id },
            // Formats et ingrédients rechargés : la notification doit décrire la
            // préparation à faire, pas seulement le nom de la composition.
            include: {
                product: true,
                composition: {
                    include: {
                        sizes: { select: { id: true, name: true, price: true, isDefault: true, includedChoices: true } },
                        options: {
                            where: { isActive: true },
                            select: { id: true, name: true, extraPrice: true, includedByDefault: true },
                        },
                    },
                },
            },
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

        // Réserver le créneau : uniquement en LIVRAISON (le retrait ne consomme pas de capacité).
        if (deliverySlotId && method === "livraison") {
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

        // Email de confirmation client.
        // Non bloquant : la commande est déjà en base et le stock décrémenté. Laisser une
        // panne Resend remonter en 500 ferait croire au client que sa commande a échoué,
        // et le pousserait à la repasser.
        const user = await prisma.user.findUnique({ where: { id: session.user.id } })
        if (user?.email) {
            try {
                await sendOrderConfirmation(
                    user.email,
                    order.id,
                    order.total,
                    order.deliveryMethod || undefined,
                    order.pickupCode
                )
            } catch (emailError) {
                console.error("⚠️ Email de confirmation client échoué:", emailError)
            }
        }

        const orderNumber = `CMD-${order.id.slice(-6).toUpperCase()}`
        const paymentLabel = paymentMethod === "cash" ? "Espèces à la réception" : "Carte bleue à la réception"
        // Chaque ligne porte son unité et, pour une composition, le détail de la
        // configuration : c'est la fiche de préparation du commerçant.
        const notifiedItems = orderItems.map((it) => {
            const custom = it.customData as { sizeId?: string; optionIds?: string[] } | null
            const composition = it.composition as
                | { name: string; sizes?: any[]; options?: any[] }
                | null

            return {
                name: it.product?.name ?? composition?.name ?? "Article",
                quantity: it.quantity,
                price: it.priceAtPurchase,
                unit: it.product?.unit ?? null,
                selection: composition
                    ? describeSelection(
                          { sizeId: custom?.sizeId, optionIds: custom?.optionIds },
                          composition.sizes ?? [],
                          composition.options ?? [],
                      )
                    : null,
            }
        })

        // Notification Telegram — arrive sur le téléphone en quelques secondes, là où l'email
        // peut traîner. Non bloquante, comme toutes les notifications ici.
        try {
            await sendNewOrderToTelegram({
                orderNumber,
                customerName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Client",
                customerPhone: order.phone,
                total: order.total,
                deliveryMethod: order.deliveryMethod,
                deliveryDate: order.deliveryDate,
                deliverySlot: order.deliverySlot,
                pickupCode: order.pickupCode,
                address: isDelivery
                    ? { line: order.deliveryAddress, postalCode: order.deliveryPostalCode, city: order.deliveryCity }
                    : null,
                paymentLabel,
                items: notifiedItems,
            })
        } catch (telegramError) {
            console.error("⚠️ Notification Telegram échouée:", telegramError)
        }

        // Notification à la société (non bloquant : n'échoue jamais la commande)
        try {
            const companyEmail = await getOrderNotificationEmail()
            if (companyEmail) {
                await sendNewOrderToCompany(companyEmail, {
                    orderId: order.id,
                    orderNumber,
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
                    items: notifiedItems,
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
