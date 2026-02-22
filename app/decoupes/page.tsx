import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { prisma } from "@/lib/db"
import Image from "next/image"
import { Scissors } from "lucide-react"
import AddToCartButton from "@/components/product/add-to-cart-button"

export const dynamic = 'force-dynamic'

export default async function DecoupesPage() {
    const compositions = await prisma.composition.findMany({
        where: {
            type: { in: ['legumes-decoupes', 'fruits-decoupes'] }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <div className="flex flex-col gap-8">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl border-b border-white/10 pb-6 uppercase italic">
                            Fruits & Légumes <span className="text-orange-500">Découpés</span>
                        </h1>
                        <p className="mt-4 text-zinc-400 max-w-2xl text-xl">
                            Gagnez du temps en cuisine avec nos produits épluchés et découpés avec soin chaque matin.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {compositions.map((comp) => (
                            <div key={comp.id} className="group glassmorphism bg-zinc-900/40 rounded-[48px] overflow-hidden border border-white/5 hover:border-orange-500/50 transition-all">
                                <div className="relative h-72 overflow-hidden">
                                    {comp.imageUrl ? (
                                        <Image
                                            src={comp.imageUrl}
                                            alt={comp.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-1000"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl font-black text-zinc-900 italic">DÉCOUPÉ</div>
                                    )}
                                    <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-xl border border-white/10 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                                        <Scissors className="w-4 h-4 text-orange-500" /> Fraîcheur Garantie
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-2xl font-black uppercase italic mb-3 text-white group-hover:text-orange-500 transition-colors">{comp.name}</h3>
                                    <p className="text-zinc-500 mb-6 line-clamp-2">
                                        {comp.description || "Un produit ultra-frais, prêt pour vos recettes."}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-3xl font-black text-white">{comp.basePrice.toFixed(2)}€</span>
                                        <AddToCartButton
                                            compositionId={comp.id}
                                            name={comp.name}
                                            price={comp.basePrice}
                                            className="h-12 px-6 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {compositions.length === 0 && (
                        <div className="text-center py-40 border border-dashed border-white/10 rounded-[48px]">
                            <p className="text-zinc-500 text-xl italic">Aucun produit découpé disponible pour le moment.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}
