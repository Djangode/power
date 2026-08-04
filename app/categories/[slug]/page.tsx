import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import Image from "next/image"
import { Leaf, ShoppingBag } from "lucide-react"
import AddToCartButton from "@/components/product/add-to-cart-button"

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const category = await prisma.category.findUnique({
        where: { slug },
        include: {
            products: {
                where: { inStock: true },
                orderBy: { name: 'asc' }
            }
        }
    })

    if (!category) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <div className="flex flex-col gap-12">
                    <div className="relative overflow-hidden rounded-[48px] bg-zinc-900/50 border border-white/5 p-12 md:p-20">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/10 to-transparent opacity-50"></div>
                        <div className="relative z-10">
                            <span className="text-orange-500 font-black uppercase tracking-[0.5em] text-xs mb-6 block">Collection Power.</span>
                            <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-8">
                                Rayon <span className="text-orange-500">{category.name}</span>
                            </h1>
                            <p className="max-w-2xl text-zinc-500 text-xl font-medium italic leading-relaxed">
                                {category.description || `Sélection premium de produits de la catégorie ${category.name}, sourcés avec une exigence absolue.`}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {category.products.map((product) => {
                            const isOutOfStock = product.currentStock <= 0
                            const isLowStock = !isOutOfStock && product.currentStock <= 5
                            return (
                            <div key={product.id} className="group glassmorphism bg-zinc-900/40 rounded-[40px] overflow-hidden border border-white/5 hover:border-orange-500/50 transition-all duration-500 flex flex-col h-full">
                                <div className="relative aspect-square overflow-hidden bg-zinc-800">
                                    <Image
                                        src={product.image || "/placeholder-product.jpg"}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        className={`object-cover group-hover:scale-110 transition-transform duration-1000 ${isOutOfStock ? "opacity-40 grayscale" : ""}`}
                                    />
                                    {product.organic && (
                                        <div className="absolute top-6 left-6 bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-xl shadow-orange-500/20 uppercase tracking-widest">
                                            <Leaf className="w-3 h-3" /> BIO
                                        </div>
                                    )}
                                    {isOutOfStock && (
                                        <div className="absolute top-6 right-6 bg-zinc-950/90 backdrop-blur-xl text-zinc-200 text-[10px] font-black px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-widest">
                                            Épuisé
                                        </div>
                                    )}
                                    {isLowStock && (
                                        <div className="absolute top-6 right-6 bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                                            Plus que {product.currentStock}
                                        </div>
                                    )}
                                    <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-xl text-white px-4 py-2 rounded-2xl text-xl font-black border border-white/10 italic">
                                        {product.promoPrice != null && <span className="text-sm text-zinc-400 line-through mr-2">{product.price.toFixed(2)}€</span>}{(product.promoPrice ?? product.price).toFixed(2)}€ <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">/ {product.unit}</span>
                                    </div>
                                </div>

                                <div className="p-8 flex flex-col flex-1">
                                    <h3 className="text-2xl font-black uppercase italic mb-3 group-hover:text-orange-500 transition-colors">{product.name}</h3>
                                    <p className="text-zinc-500 text-sm line-clamp-2 min-h-[40px] font-medium mb-8 leading-relaxed">{product.description}</p>

                                    <div className="mt-auto">
                                        <AddToCartButton
                                            productId={product.id}
                                            name={product.name}
                                            price={product.price}
                                            outOfStock={isOutOfStock}
                                            className="w-full h-14"
                                        />
                                    </div>
                                </div>
                            </div>
                            )
                        })}
                    </div>

                    {category.products.length === 0 && (
                        <div className="text-center py-40 bg-zinc-900/20 border border-dashed border-white/10 rounded-[48px]">
                            <ShoppingBag className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                            <p className="text-zinc-600 font-black uppercase italic tracking-widest text-xl">Rupture de Stock Temporaire</p>
                            <p className="text-zinc-700 mt-2 font-medium">Nos producteurs s'activent pour remplir ce rayon.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}
