import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'
import bcrypt from 'bcryptjs'

const url = (process.env.DATABASE_URL || '').replace(/&channel_binding=[^&]*/g, '')
if (!url) throw new Error('DATABASE_URL est obligatoire pour exécuter le seed')
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

    // Articles de blog (idempotent — créés seulement si la table est vide)
    if ((await prisma.blogPost.count()) === 0) {
        const blogData = [
            {
                title: 'Les bienfaits des fruits de saison',
                excerpt: 'Pourquoi privilégier les fruits de saison change tout pour votre santé et la planète.',
                content: "Manger de saison, c'est consommer des fruits cueillis à maturité, au moment où ils sont les plus riches en vitamines et en saveurs.\n\nEn plus d'être meilleurs au goût, les produits de saison sont moins chers et limitent l'empreinte carbone liée au transport. Chez Power, nous sélectionnons chaque matin les meilleurs fruits auprès de producteurs locaux.\n\nFraises au printemps, pêches en été, pommes en automne : laissez-vous guider par le calendrier de la nature !",
                author: 'Equipe Power',
                category: 'Conseils',
                imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800',
                published: true,
            },
            {
                title: 'Comment conserver ses légumes plus longtemps',
                excerpt: 'Nos astuces simples pour réduire le gaspillage et garder vos légumes frais plus longtemps.',
                content: "Le gaspillage alimentaire commence souvent à la maison. Voici quelques gestes simples pour conserver vos légumes plus longtemps.\n\nLes herbes fraîches se conservent dans un verre d'eau au réfrigérateur. Les pommes de terre et oignons préfèrent un endroit sombre et sec. Les tomates, elles, n'aiment pas le froid : laissez-les à température ambiante.\n\nUn bon stockage, c'est moins de gaspillage et plus d'économies !",
                author: 'Equipe Power',
                category: 'Astuces',
                imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
                published: true,
            },
            {
                title: 'Rencontre avec nos producteurs locaux',
                excerpt: 'Partez à la rencontre des femmes et des hommes qui cultivent vos fruits et légumes.',
                content: "Derrière chaque produit Power, il y a un producteur passionné. Cette semaine, nous vous emmenons à la ferme des Quatre Saisons, à quelques kilomètres de notre entrepôt.\n\nIci, on cultive dans le respect des sols et des saisons, sans pesticides de synthèse. La qualité prime sur la quantité, et cela se ressent dans chaque bouchée.\n\nSoutenir les circuits courts, c'est soutenir une agriculture plus durable et plus juste.",
                author: 'Equipe Power',
                category: 'Producteurs',
                imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800',
                published: true,
            },
        ]
        for (const b of blogData) {
            await prisma.blogPost.create({ data: b })
        }
        console.log('✅ Articles de blog créés')
    }

    // Recettes (idempotent — créées seulement si la table est vide)
    if ((await prisma.recipe.count()) === 0) {
        const recipeData = [
            {
                title: 'Ratatouille provençale',
                description: 'Un classique du Sud, mijoté avec des légumes frais et de l\'huile d\'olive.',
                content: "Ingrédients :\n- 2 courgettes\n- 1 aubergine\n- 2 poivrons\n- 4 tomates\n- 1 oignon\n- 2 gousses d'ail\n- Huile d'olive, thym, basilic\n\nPréparation :\n1. Découpez tous les légumes en dés.\n2. Faites revenir l'oignon et l'ail dans l'huile d'olive.\n3. Ajoutez les poivrons, puis l'aubergine et les courgettes.\n4. Incorporez les tomates et les herbes, puis laissez mijoter 40 minutes à feu doux.\n5. Servez chaud ou froid.",
                duration: '50 min',
                difficulty: 'Facile',
                imageUrl: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?w=800',
            },
            {
                title: 'Smoothie détox vert',
                description: 'Un boost de vitamines pour bien commencer la journée.',
                content: "Ingrédients :\n- 1 pomme verte\n- 1/2 concombre\n- Quelques feuilles de menthe\n- Le jus d'un citron\n- 200 ml d'eau\n\nPréparation :\n1. Lavez et découpez les fruits et légumes.\n2. Mettez tous les ingrédients dans un blender.\n3. Mixez jusqu'à obtenir une texture lisse.\n4. Dégustez immédiatement, bien frais.",
                duration: '10 min',
                difficulty: 'Très facile',
                imageUrl: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800',
            },
            {
                title: 'Velouté de potimarron',
                description: 'Doux et réconfortant, parfait pour les soirées d\'automne.',
                content: "Ingrédients :\n- 1 potimarron\n- 1 oignon\n- 1 pomme de terre\n- 50 cl de bouillon de légumes\n- 10 cl de crème\n- Muscade, sel, poivre\n\nPréparation :\n1. Découpez le potimarron, la pomme de terre et l'oignon.\n2. Faites revenir l'oignon, puis ajoutez les autres légumes.\n3. Versez le bouillon et laissez cuire 25 minutes.\n4. Mixez, ajoutez la crème et la muscade.\n5. Servez bien chaud.",
                duration: '40 min',
                difficulty: 'Facile',
                imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
            },
        ]
        for (const r of recipeData) {
            await prisma.recipe.create({ data: r })
        }
        console.log('✅ Recettes créées')
    }

    // Partenaires (idempotent — créés seulement si la table est vide)
    if ((await prisma.partner.count()) === 0) {
        const partnerData = [
            { name: 'Ferme des Quatre Saisons', logoUrl: null, isActive: true },
            { name: 'Vergers du Soleil', logoUrl: null, isActive: true },
            { name: 'Maraîchers du Terroir', logoUrl: null, isActive: true },
        ]
        for (const p of partnerData) {
            await prisma.partner.create({ data: p })
        }
        console.log('✅ Partenaires créés')
    }

    // Compte administrateur (idempotent — ne réinitialise PAS le mot de passe d'un admin existant)
    const adminEmail = (process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || 'ibaricyril2111@gmail.com').trim().toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword || adminPassword.length < 12) {
        throw new Error('ADMIN_PASSWORD doit être défini et contenir au moins 12 caractères ; aucun mot de passe admin par défaut n’est autorisé')
    }
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: { role: 'admin', isActive: true },
        create: {
            email: adminEmail,
            password: await bcrypt.hash(adminPassword, 10),
            firstName: 'Admin',
            lastName: 'Power',
            role: 'admin',
        },
    })
    console.log(`✅ Admin prêt : ${adminEmail}`)

    console.log('🎉 Seed terminé avec succès !')
}

main().catch(console.error).finally(() => process.exit(0))
