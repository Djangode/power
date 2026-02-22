import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"

export default function ConfidentialitePage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-16">
                    Politique de <span className="text-orange-500">Confidentialité</span>
                </h1>

                <div className="prose prose-invert max-w-none text-zinc-400 leading-relaxed space-y-8">
                    <p>Chez POWER, nous accordons une importance capitale à la protection de vos données personnelles.</p>
                    <h2 className="text-xl font-bold text-white uppercase">Collecte des données</h2>
                    <p>Nous collectons les données nécessaires au traitement de vos commandes et à l'amélioration de nos services (nom, adresse, email, téléphone).</p>
                </div>
            </main>
            <Footer />
        </div>
    )
}
