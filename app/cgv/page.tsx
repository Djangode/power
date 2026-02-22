import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"

export default function CGVPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-16">
                    Conditions Générales de <span className="text-orange-500">Vente</span>
                </h1>

                <div className="prose prose-invert max-w-none text-zinc-400 leading-relaxed space-y-8">
                    <p className="border-l-4 border-orange-500 pl-6 py-2 italic font-medium">Les présentes conditions régissent les ventes effectuées sur le site POWER.</p>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest">Article 1 - Prix</h2>
                        <p>Les prix de nos produits sont indiqués en euros toutes taxes comprises (TVA et autres taxes applicables au jour de la commande).</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest">Article 2 - Commandes</h2>
                        <p>Vous pouvez passer commande directement sur notre site internet. Les informations contractuelles sont présentées en langue française.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest">Article 3 - Paiement</h2>
                        <p>Le fait de valider votre commande implique pour vous l'obligation de payer le prix indiqué. Le règlement s'effectue par carte bancaire via le système sécurisé Stripe.</p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    )
}
