import { prisma } from "@/lib/db"
import ProductGrid from "@/components/product/product-grid"

export default async function ProductSection() {
  const [products, compositions] = await Promise.all([
    prisma.product.findMany({
      where: { inStock: true },
      orderBy: { name: 'asc' },
      include: { category: true }
    }),
    prisma.composition.findMany({
      orderBy: { name: 'asc' }
    })
  ])

  const formattedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    unit: product.unit,
    image: product.image || "/placeholder.svg?height=200&width=300",
    description: product.description || "Produit frais de qualité",
    category: product.category.name,
    categorySlug: product.category.slug,
    inStock: product.inStock,
    organic: product.organic,
  }))

  const formattedCompositions = compositions.map((comp) => ({
    id: comp.id,
    name: comp.name,
    type: comp.type,
    basePrice: comp.basePrice,
    description: comp.description || "",
    image: comp.imageUrl || "/placeholder.svg",
  }))

  const categories = [...new Set(products.map(p => p.category.name))]

  return (
    <section id="fruits" className="py-20 px-4 w-full">
      <div className="w-full max-w-none px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black mb-4 text-white tracking-tight">
            Notre <span className="text-orange-500">Marketplace</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg italic font-medium">
            Fruits, légumes, jus pressés à froid, soupes et découpés frais.
          </p>
        </div>
        <ProductGrid
          products={formattedProducts}
          compositions={formattedCompositions}
          categories={categories}
        />
      </div>
    </section>
  )
}
