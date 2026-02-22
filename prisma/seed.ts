import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const url = (process.env.DATABASE_URL || '').replace(/&channel_binding=[^&]*/g, '')
console.log('DB URL:', url.substring(0, 40) + '...')
const adapter = new PrismaNeonHttp(url, { fullResults: false })
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Seeding database...')

    // Nettoyer les anciennes données
    await prisma.cartItem.deleteMany()
    await prisma.cart.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    await prisma.composition.deleteMany()
    await prisma.category.deleteMany()
    await prisma.faq.deleteMany()
    console.log('🗑️ Anciennes données supprimées')

    // Catégories
    const fruits = await prisma.category.create({
        data: { name: 'Fruits', slug: 'fruits', description: 'Fruits frais de saison' }
    })
    const legumes = await prisma.category.create({
        data: { name: 'Légumes', slug: 'legumes', description: 'Légumes frais et locaux' }
    })
    const aromates = await prisma.category.create({
        data: { name: 'Aromates', slug: 'aromates', description: 'Herbes fraîches et aromates' }
    })
    const exotiques = await prisma.category.create({
        data: { name: 'Exotiques', slug: 'exotiques', description: 'Fruits et légumes exotiques' }
    })

    console.log('✅ Catégories créées')

    // Produits - Fruits
    const fruitsData = [
        { name: 'Pommes Gala', price: 3.50, unit: 'kg', description: 'Pommes croquantes et sucrées, origine France', organic: true, currentStock: 50, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400' },
        { name: 'Bananes', price: 2.20, unit: 'kg', description: 'Bananes mûres à point', organic: false, currentStock: 80, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
        { name: 'Oranges Navel', price: 3.90, unit: 'kg', description: 'Oranges juteuses sans pépins', organic: true, currentStock: 60, image: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400' },
        { name: 'Fraises Gariguette', price: 6.90, unit: 'barquette', description: 'Fraises françaises, parfumées et sucrées', organic: true, currentStock: 30, image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400' },
        { name: 'Citrons Bio', price: 4.50, unit: 'kg', description: 'Citrons non traités, idéaux pour cuisiner', organic: true, currentStock: 40, image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400' },
        { name: 'Poires Conférence', price: 4.20, unit: 'kg', description: 'Poires fondantes et parfumées', organic: false, currentStock: 35, image: 'https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=400' },
    ]

    for (const p of fruitsData) {
        await prisma.product.create({
            data: { ...p, categoryId: fruits.id, inStock: true, minimumStock: 10 }
        })
    }

    // Produits - Légumes
    const legumesData = [
        { name: 'Tomates Grappe', price: 3.80, unit: 'kg', description: 'Tomates mûries sur grappe, saveur intense', organic: true, currentStock: 45, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400' },
        { name: 'Carottes Nouvelles', price: 2.90, unit: 'botte', description: 'Carottes tendres et sucrées avec fanes', organic: true, currentStock: 55, image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400' },
        { name: 'Courgettes', price: 3.20, unit: 'kg', description: 'Courgettes fermes et brillantes', organic: false, currentStock: 40, image: 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=400' },
        { name: 'Salade Batavia', price: 1.50, unit: 'pièce', description: 'Salade croquante, cultivée localement', organic: true, currentStock: 25, image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400' },
        { name: 'Poivrons Tricolores', price: 5.50, unit: 'kg', description: 'Mix de poivrons rouge, jaune et vert', organic: false, currentStock: 30, image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400' },
        { name: 'Aubergines', price: 3.60, unit: 'kg', description: 'Aubergines brillantes et fermes', organic: true, currentStock: 20, image: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400' },
    ]

    for (const p of legumesData) {
        await prisma.product.create({
            data: { ...p, categoryId: legumes.id, inStock: true, minimumStock: 10 }
        })
    }

    // Produits - Aromates
    const aromatesData = [
        { name: 'Basilic Frais', price: 2.50, unit: 'botte', description: 'Basilic parfumé, récolté du jour', organic: true, currentStock: 20, image: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=400' },
        { name: 'Menthe Fraîche', price: 2.00, unit: 'botte', description: 'Menthe verte intense pour thé et cuisine', organic: true, currentStock: 25, image: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400' },
        { name: 'Persil Plat', price: 1.50, unit: 'botte', description: 'Persil plat savoureux', organic: true, currentStock: 30, image: 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=400' },
    ]

    for (const p of aromatesData) {
        await prisma.product.create({
            data: { ...p, categoryId: aromates.id, inStock: true, minimumStock: 5 }
        })
    }

    // Produits - Exotiques
    const exotiquesData = [
        { name: 'Mangue Kent', price: 4.90, unit: 'pièce', description: 'Mangue fondante et sucrée', organic: false, currentStock: 15, image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400' },
        { name: 'Avocat Hass', price: 2.50, unit: 'pièce', description: 'Avocat crémeux à point', organic: false, currentStock: 40, image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400' },
        { name: 'Ananas Victoria', price: 5.90, unit: 'pièce', description: 'Petit ananas ultra-sucré de La Réunion', organic: true, currentStock: 10, image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400' },
    ]

    for (const p of exotiquesData) {
        await prisma.product.create({
            data: { ...p, categoryId: exotiques.id, inStock: true, minimumStock: 5 }
        })
    }

    console.log('✅ Produits créés')

    // Compositions - Jus
    const jusData = [
        { name: 'Jus Détox Vert', type: 'jus', description: 'Concombre, pomme verte, menthe, citron. Idéal pour un boost matinal.', basePrice: 6.50, imageUrl: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400' },
        { name: 'Jus Énergie Orange', type: 'jus', description: 'Orange, carotte, gingembre, curcuma. Un concentré de vitalité.', basePrice: 5.90, imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400' },
        { name: 'Jus Fruits Rouges', type: 'jus', description: 'Fraise, framboise, myrtille, pomme. Antioxydant et gourmand.', basePrice: 7.50, imageUrl: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400' },
    ]

    // Compositions - Soupes
    const soupesData = [
        { name: 'Velouté de Potimarron', type: 'soupe', description: 'Potimarron, crème, muscade. Doux et réconfortant.', basePrice: 5.50, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400' },
        { name: 'Soupe Tomate-Basilic', type: 'soupe', description: 'Tomates fraîches, basilic, ail. Un classique méditerranéen.', basePrice: 4.90, imageUrl: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400' },
        { name: 'Gaspacho Andalou', type: 'soupe', description: 'Tomate, poivron, concombre. Frais et parfait pour l\'été.', basePrice: 5.90, imageUrl: 'https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?w=400' },
    ]

    for (const c of [...jusData, ...soupesData]) {
        await prisma.composition.create({ data: c })
    }

    console.log('✅ Jus & Soupes créés')

    // Compositions - Découpés
    const decoupesData = [
        { name: 'Mix Ratatouille', type: 'legumes-decoupes', description: 'Courgettes, aubergines, poivrons et oignons découpés, prêts à cuisiner.', basePrice: 8.90, imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400' },
        { name: 'Salade de Fruits Frais', type: 'fruits-decoupes', description: 'Mangue, ananas, fraise, kiwi. Fraîchement découpés ce matin.', basePrice: 7.50, imageUrl: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400' },
        { name: 'Julienne de Légumes', type: 'legumes-decoupes', description: 'Carottes, courgettes, poireaux en julienne. Idéal pour wok ou vapeur.', basePrice: 6.90, imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400' },
    ]

    for (const c of decoupesData) {
        await prisma.composition.create({ data: c })
    }

    console.log('✅ Découpés créés')

    // FAQ
    const faqData = [
        { question: 'Comment sont sélectionnés vos produits ?', answer: 'Nous travaillons avec des producteurs locaux et sélectionnons chaque matin les meilleurs fruits et légumes de saison.', order: 1 },
        { question: 'Quels sont vos délais de livraison ?', answer: 'Nous livrons sous 24h dans toute la région. Vous pouvez choisir votre créneau de livraison lors de la commande.', order: 2 },
        { question: 'Vos produits sont-ils bio ?', answer: 'Une grande partie de notre catalogue est certifiée bio. Les produits bio sont clairement identifiés avec un label sur chaque fiche produit.', order: 3 },
        { question: 'Comment fonctionne le paiement ?', answer: 'Nous acceptons les paiements par carte bancaire via Stripe, 100% sécurisé. Le paiement est débité au moment de la commande.', order: 4 },
        { question: 'Puis-je modifier ou annuler ma commande ?', answer: 'Vous pouvez modifier ou annuler votre commande tant qu\'elle n\'est pas en cours de préparation. Contactez-nous le plus rapidement possible.', order: 5 },
    ]

    for (const f of faqData) {
        await prisma.faq.create({ data: f })
    }

    console.log('✅ FAQ créée')

    console.log('🎉 Seed terminé avec succès !')
}

main().catch(console.error).finally(() => process.exit(0))
