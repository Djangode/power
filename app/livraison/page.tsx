import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Truck, Clock, Shield, Globe } from "lucide-react"

export default function LivraisonPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <div className="mb-20">
                    <span className="text-orange-500 font-black uppercase tracking-[0.5em] text-xs mb-6 block">Logistique Power.</span>
                    <h1 className="text-7xl md:text-9xl font-extrabold uppercase italic tracking-tighter leading-none mb-12">
                        Livraison<br /><span className="text-zinc-800">Ultra-Rapide.</span>
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                    {[
                        { icon: Truck, title: "Zéro Émission", desc: "Livraison 100% électrique en centre-ville." },
                        { icon: Clock, title: "Flux Tendu", desc: "Moins de 12h entre la récolte et votre porte." },
                        { icon: Shield, title: "Traçabilité", desc: "Suivi GPS en temps réel de votre panier." },
                        { icon: Globe, title: "Local First", desc: "80% de nos produits viennent de < 50km." }
                    ].map((item, id) => (
                        <div key={id} className="glassmorphism bg-zinc-900/40 p-8 rounded-[32px] border border-white/5 hover:border-orange-500/50 transition-all flex flex-col gap-6 group">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:bg-orange-500 transition-all">
                                <item.icon className="w-7 h-7 text-orange-500 group-hover:text-white" />
                            </div>
                            <h3 className="text-2xl font-black uppercase italic">{item.title}</h3>
                            <p className="text-zinc-500 font-medium leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="glassmorphism bg-zinc-900/40 p-12 rounded-[48px] border border-white/10">
                    <h2 className="text-4xl font-black uppercase italic mb-8">Zones de <span className="text-orange-500">Livraison</span></h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="flex flex-col gap-4">
                            <h4 className="text-xl font-bold uppercase italic text-orange-500">Zone Alpha (Paris & IDF)</h4>
                            <p className="text-zinc-400">Livraison sous 2h pour toute commande passée avant 14h. Gratuit dès 50€.</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h4 className="text-xl font-bold uppercase italic text-orange-500">Zone Beta (Grandes Villes)</h4>
                            <p className="text-zinc-400">Livraison sous 24h via nos partenaires logistiques frais. Gratuit dès 80€.</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h4 className="text-xl font-bold uppercase italic text-orange-500">Reste de la France</h4>
                            <p className="text-zinc-400">Livraison sous 48h en Chronofresh pour garantir la chaîne du froid.</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
