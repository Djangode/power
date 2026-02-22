"use client"

import { useState, useMemo, useEffect } from "react"
import { Search } from "lucide-react"
import ProductCard from "./product-card"
import ProductCardMobile from "./product-card-mobile"
import CompositionMobileItem from "./composition-mobile-item"
import CompositionModal from "./composition-modal"
import { ProductModalProvider, useProductModal } from "./product-modal-context"
import Image from "next/image"

interface Product {
  id: string
  name: string
  price: number
  unit: string
  image: string
  description: string
  category: string
  categorySlug?: string
  inStock: boolean
  organic: boolean
}

interface Composition {
  id: string
  name: string
  type: string
  basePrice: number
  description: string
  image: string
}

interface ProductGridProps {
  products: Product[]
  compositions?: Composition[]
  categories?: string[]
}

function ProductGridInner({ products, compositions = [], categories = [] }: ProductGridProps) {
  const { openProductModal } = useProductModal()
  const [activeTab, setActiveTab] = useState("tout")
  const [search, setSearch] = useState("")
  const [selectedComposition, setSelectedComposition] = useState<Composition | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as string
      if (tab) setActiveTab(tab)
    }
    window.addEventListener("marketplace-tab", handler)
    return () => window.removeEventListener("marketplace-tab", handler)
  }, [])

  // Tabs dynamiques depuis les vraies catégories DB + types de compositions DB
  const visibleTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [{ id: "tout", label: "Tout" }]

    // Ajouter chaque catégorie réelle de produits depuis la DB
    categories.forEach(cat => {
      const id = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
      tabs.push({ id, label: cat })
    })

    // Ajouter chaque type de composition unique depuis la DB
    const compositionTypes = [...new Set(compositions.map(c => c.type))]
    compositionTypes.forEach(type => {
      const id = "comp-" + type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
      // Capitaliser le label
      const label = type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")
      tabs.push({ id, label })
    })

    return tabs
  }, [categories, compositions])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let filteredProducts = products
    let filteredCompositions = compositions

    if (activeTab.startsWith("comp-")) {
      // Onglet composition dynamique — extraire le type
      const compType = activeTab.replace("comp-", "")
      filteredProducts = []
      filteredCompositions = compositions.filter(c => {
        const typeSlug = c.type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
        return typeSlug === compType
      })
    } else if (activeTab !== "tout") {
      // Onglet catégorie produit
      filteredProducts = products.filter(p => {
        const catSlug = p.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
        return catSlug === activeTab
      })
      filteredCompositions = []
    }

    if (q) {
      filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(q))
      filteredCompositions = filteredCompositions.filter(c => c.name.toLowerCase().includes(q))
    }

    return { products: filteredProducts, compositions: filteredCompositions }
  }, [products, compositions, activeTab, search])

  const totalItems = filtered.products.length + filtered.compositions.length

  return (
    <>
      {/* Search + Tabs centré */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-full max-w-md mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 transition-colors text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-center flex-wrap">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-900/60 text-zinc-400 border border-white/5 hover:border-orange-500/30 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 italic font-medium">Aucun produit trouvé.</p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden flex flex-col gap-2">
            {filtered.products.map((product) => (
              <ProductCardMobile
                key={product.id}
                product={product}
                onViewDetails={() => openProductModal(product)}
              />
            ))}
            {filtered.compositions.map((comp) => (
              <CompositionMobileItem
                key={comp.id}
                composition={{
                  id: comp.id,
                  name: comp.name,
                  basePrice: comp.basePrice,
                  imageUrl: comp.image,
                  description: comp.description,
                }}
                onCompose={() => setSelectedComposition(comp)}
              />
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filtered.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={() => openProductModal(product)}
              />
            ))}
            {filtered.compositions.map((comp) => (
              <div
                key={comp.id}
                className="group glassmorphism bg-zinc-900/40 border-white/5 rounded-[40px] overflow-hidden hover:border-orange-500/50 transition-all duration-500 h-full flex flex-col cursor-pointer"
                onClick={() => setSelectedComposition(comp)}
              >
                <div className="relative aspect-square overflow-hidden bg-zinc-800">
                  <Image
                    src={comp.image || "/placeholder.svg"}
                    alt={comp.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-6 left-6">
                    <span className="bg-black/60 backdrop-blur-xl border border-white/10 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {comp.type.charAt(0).toUpperCase() + comp.type.slice(1).replace(/-/g, " ")}
                    </span>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                      <span className="text-2xl font-black text-white italic leading-none">
                        {comp.basePrice.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-8 pb-4 flex-1">
                  <h3 className="text-2xl font-black uppercase italic text-white mb-2 line-clamp-1 group-hover:text-orange-500 transition-colors">
                    {comp.name}
                  </h3>
                  <p className="text-zinc-500 font-medium line-clamp-2 min-h-[48px] text-sm leading-relaxed">
                    {comp.description}
                  </p>
                </div>
                <div className="p-8 pt-0 mt-auto">
                  <button className="w-full h-14 rounded-[24px] bg-orange-500 hover:bg-orange-600 text-white font-black uppercase italic text-sm tracking-widest transition-colors">
                    Composer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedComposition && (
        <CompositionModal
          composition={selectedComposition}
          isOpen={!!selectedComposition}
          onClose={() => setSelectedComposition(null)}
          availableProducts={products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
          }))}
        />
      )}
    </>
  )
}

export default function ProductGrid({ products, compositions = [], categories = [] }: ProductGridProps) {
  return (
    <ProductModalProvider>
      <ProductGridInner products={products} compositions={compositions} categories={categories} />
    </ProductModalProvider>
  )
}
