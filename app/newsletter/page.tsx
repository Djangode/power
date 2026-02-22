import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NewsletterPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-44 pb-20 text-center">
                <div className="relative inline-block mb-12">
                    <div className="absolute inset-0 bg-orange-500 blur-[100px] opacity-20"></div>
                    <div className="relative z-10 w-24 h-24 rounded-[32px] bg-orange-500 flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/40">
                        <Mail className="w-10 h-10 text-white" />
                    </div>
                </div>
                <h1 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter mb-8 leading-none">
                    Power<span className="text-orange-500">Letter</span>
                </h1>
                <p className="text-zinc-500 text-xl md:text-2xl font-medium max-w-2xl mx-auto mb-16">
                    Rejoignez le cercle privilégié. Recevez nos arrivages exclusifs et nos conseils nutritionnels avant tout le monde.
                </p>

                <div className="max-w-md mx-auto relative">
                    <input
                        type="email"
                        placeholder="Votre email premium..."
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-[24px] px-8 py-6 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-lg font-medium"
                    />
                    <Button className="w-full mt-6 rounded-[24px] bg-white text-black hover:bg-zinc-200 font-black h-16 text-lg uppercase italic tracking-tighter">
                        S'abonner maintenant
                    </Button>
                    <p className="mt-6 text-zinc-600 text-sm flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" /> Pas de spam. Uniquement de l'énergie.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    )
}
