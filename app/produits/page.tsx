import { prisma } from "@/lib/db"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import Image from "next/image"
import Link from "next/link"
import { Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import AddToCartButton from "@/components/product/add-to-cart-button"

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Tous nos produits frais — Power Primeur Alfortville',
    description:
        "Fruits, légumes et aromates frais de saison. Retrait en magasin à Alfortville ou " +
        "livraison en Île-de-France. Commandez en ligne, payez à la réception.",
    alternates: { canonical: '/produits' },
}

export default async function ProductsPage() {
    const products = await prisma.product.findMany({
        where: { inStock: true },
        include: { category: true },
        orderBy: { name: 'asc' }
    })

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <div className="flex flex-col gap-8">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl border-b border-white/10 pb-6">
                            Tous nos <span className="text-orange-500">Produits</span>
                        </h1>
                        <p className="mt-4 text-zinc-400 max-w-2xl">
                            Découvrez notre sélection de produits frais, bio et de saison, sourcés directement auprès de nos producteurs locaux.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => {
                            const isOutOfStock = product.currentStock <= 0
                            const isLowStock = !isOutOfStock && product.currentStock <= 5
                            return (
                            <div key={product.id} className="group glassmorphism bg-zinc-900/40 rounded-3xl overflow-hidden border border-white/5 hover:border-orange-500/50 transition-all duration-500 flex flex-col">
                                <div className="relative aspect-square overflow-hidden bg-zinc-800">
                                    {product.image ? (
                                        <Image
                                            src={product.image}
                                            alt={product.name}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                            className={`object-cover group-hover:scale-110 transition-transform duration-700 ${isOutOfStock ? "opacity-40 grayscale" : ""}`}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-600">Aucune image</div>
                                    )}
                                    {product.organic && (
                                        <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                            <Leaf className="w-3 h-3" /> BIO
                                        </div>
                                    )}
                                    {isOutOfStock && (
                                        <div className="absolute top-4 right-4 bg-zinc-950/90 backdrop-blur-md text-zinc-200 text-[10px] font-bold px-2 py-1 rounded-full border border-white/10">
                                            ÉPUISÉ
                                        </div>
                                    )}
                                    {isLowStock && (
                                        <div className="absolute top-4 right-4 bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                            PLUS QUE {product.currentStock}
                                        </div>
                                    )}
                                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-bold border border-white/10">
                                        {product.price.toFixed(2)}€ / {product.unit}
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col flex-1 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">{product.category.name}</span>
                                        <h3 className="text-xl font-bold line-clamp-1">{product.name}</h3>
                                        <p className="text-zinc-500 text-sm line-clamp-2 min-h-[40px]">{product.description}</p>
                                    </div>

                                    <div className="mt-auto flex items-center gap-2">
                                        <AddToCartButton
                                            productId={product.id}
                                            name={product.name}
                                            price={product.price}
                                            outOfStock={isOutOfStock}
                                            compact
                                            className="h-12 text-sm rounded-2xl flex-1"
                                        />
                                        <Button variant="outline" size="icon" className="rounded-2xl border-white/10 hover:bg-white/5 h-12 w-12" asChild>
                                            <Link href={`/produits/${product.id}`}>
                                                <span className="sr-only">Voir le détail de {product.name}</span>
                                                +
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            )
                        })}
                    </div>

                    {products.length === 0 && (
                        <div className="text-center py-40 border border-dashed border-white/10 rounded-3xl">
                            <p className="text-zinc-500">Aucun produit trouvé dans notre catalogue pour le moment.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}
