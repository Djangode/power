import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Soup } from "lucide-react"
import CompositionCard from "@/components/product/composition-card"
import { getCompositionsByTypes } from "@/app/actions/compositions"

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Jus, smoothies et soupes à composer — Power Primeur',
    description:
        "Composez votre jus, smoothie ou soupe : choisissez le format, la recette de base " +
        "et vos suppléments. Pressé du jour, retrait à Alfortville ou livraison.",
    alternates: { canonical: '/jus-soupes' },
}

export default async function JusSoupesPage() {
    const { data: compositions } = await getCompositionsByTypes(['jus', 'soupe'])

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <div className="flex flex-col gap-8">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl border-b border-white/10 pb-6 uppercase italic">
                            Jus & Soupes <span className="text-orange-500">Ultra-Frais</span>
                        </h1>
                        <p className="mt-4 text-zinc-400 max-w-2xl text-xl">
                            Des vitamines pures, pressées à froid et sans conservateurs. Le goût du fruit, rien d'autre.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {compositions.map((comp) => (
                            <CompositionCard
                                key={comp.id}
                                composition={comp}
                                fallbackLabel="ÉNERGIE"
                                badge={
                                    <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-xl border border-white/10 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                                        <Soup className="w-4 h-4 text-orange-500" /> Pressé à Froid
                                    </div>
                                }
                            />
                        ))}
                    </div>

                    {compositions.length === 0 && (
                        <div className="text-center py-40 border border-dashed border-white/10 rounded-[48px]">
                            <p className="text-zinc-500 text-xl italic">Nos pressoirs font une pause. Revenez plus tard !</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}
