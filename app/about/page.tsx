import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import Image from "next/image"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <span className="text-orange-500 font-black uppercase tracking-[0.4em] text-sm mb-6 block">Notre Manifeste</span>
                        <h1 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter mb-12 leading-none">
                            Re<span className="text-zinc-800">Définir</span><br />Le Frais.
                        </h1>
                        <p className="text-zinc-400 text-xl leading-relaxed font-medium">
                            POWER est né d'un constat simple : la qualité exceptionnelle des produits de nos terroirs ne doit pas être un luxe, mais une évidence accessible en un clic. Nous supprimons les intermédiaires pour vous offrir le meilleur de la terre, chaque jour.
                        </p>
                    </div>
                    <div className="relative aspect-square rounded-[60px] overflow-hidden bg-zinc-900 border border-white/10">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent"></div>
                        <div className="w-full h-full flex items-center justify-center text-4xl font-black italic uppercase text-zinc-800 tracking-tighter">
                            Génération<br />Primeur.
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
