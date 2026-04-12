import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"

export default function MentionsLegalesPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-16">
                    Mentions <span className="text-orange-500">Légales</span>
                </h1>

                <div className="prose prose-invert max-w-none text-zinc-400 leading-relaxed space-y-8">
                    <section className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest">Éditeur du site</h2>
                        <p>Société : POWER<br />SIRET : 944 504 794 00016<br />Siège social : 114 Rue Paul Vaillant Couturier, 94140 Alfortville</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest">Hébergement</h2>
                        <p>Vercel Inc.<br />340 S Lemon Ave #1142<br />Walnut, CA 91789, États-Unis</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest">Propriété intellectuelle</h2>
                        <p>L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle.</p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    )
}
