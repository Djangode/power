import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import Image from "next/image"
import { Leaf, ArrowLeft, ShieldCheck, Truck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import AddToCartButton from "@/components/product/add-to-cart-button"

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const product = await prisma.product.findUnique({
        where: { id },
        include: { category: true }
    })

    if (!product) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-44 pb-32">
                <Link href="/produits" className="inline-flex items-center gap-2 text-zinc-500 hover:text-orange-500 font-black uppercase italic tracking-widest text-xs mb-12 group transition-all">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" />
                    <span>Retour au catalogue</span>
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 xl:gap-32">
                    {/* Image Section */}
                    <div className="relative aspect-square rounded-[60px] overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl group">
                        <Image
                            src={product.image || "/placeholder-product.jpg"}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-[2000ms]"
                        />
                        {product.organic && (
                            <div className="absolute top-10 left-10 bg-orange-500/90 backdrop-blur-2xl text-white px-6 py-3 rounded-full flex items-center gap-3 font-black uppercase italic tracking-widest text-sm shadow-2xl">
                                <Leaf className="w-5 h-5" /> <span>Bio Certifié Power</span>
                            </div>
                        )}
                        <div className="absolute bottom-10 right-10 bg-black/60 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 flex items-center gap-2">
                            <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
                            <span className="font-black italic text-xl">4.9</span>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex flex-col justify-center">
                        <div className="mb-12">
                            <span className="text-orange-500 font-black uppercase tracking-[0.4em] text-xs mb-6 block">{product.category.name}</span>
                            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter uppercase italic leading-[0.9] mb-8">
                                {product.name}
                            </h1>
                            <div className="flex items-baseline gap-6 mb-10">
                                {product.promoPrice != null && <span className="text-3xl font-black text-zinc-500 italic line-through">{product.price.toFixed(2)}€</span>}
                                <span className="text-5xl font-black text-white italic">{(product.promoPrice ?? product.price).toFixed(2)}€</span>
                                <span className="text-2xl text-zinc-600 font-black uppercase italic opacity-50 tracking-tighter">/ {product.unit}</span>
                            </div>
                            <p className="text-zinc-500 text-xl font-medium italic leading-relaxed mb-12 max-w-xl">
                                {product.description || "Une sélection rigoureuse pour une fraîcheur absolue. Directement récolté et livré en moins de 24h pour garantir une puissance nutritionnelle maximale."}
                            </p>
                        </div>

                        <div className="flex flex-col gap-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="glassmorphism bg-white/5 p-8 rounded-[32px] border border-white/5 flex flex-col gap-3 group hover:border-orange-500/30 transition-all">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <span className="font-black uppercase italic text-sm tracking-widest text-white">Livraison 24h</span>
                                    <span className="text-xs text-zinc-500 font-medium leading-relaxed">Récolté le matin, chez vous le soir. Fraîcheur Power.</span>
                                </div>
                                <div className="glassmorphism bg-white/5 p-8 rounded-[32px] border border-white/5 flex flex-col gap-3 group hover:border-orange-500/30 transition-all">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                                        <ShieldCheck className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <span className="font-black uppercase italic text-sm tracking-widest text-white">Garantie Power</span>
                                    <span className="text-xs text-zinc-500 font-medium leading-relaxed">Si ce n'est pas parfait, on vous le remplace immédiatement.</span>
                                </div>
                            </div>

                            <AddToCartButton
                                productId={product.id}
                                name={product.name}
                                price={product.price}
                                className="h-20 text-xl"
                            />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
