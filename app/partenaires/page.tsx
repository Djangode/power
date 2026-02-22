import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Handshake } from "lucide-react"
import { getPartners } from "@/app/actions/content"
import Image from "next/image"

export const dynamic = 'force-dynamic'

export default async function PartenairesPage() {
    const { data: partners } = await getPartners()

    return (
        <div className="min-h-screen bg-black text-white font-sans tracking-tight">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20 text-center">
                <Handshake className="w-20 h-20 text-orange-500 mx-auto mb-10 opacity-20" />
                <h1 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter leading-none mb-12">
                    Nos<br /><span className="text-zinc-800">Producteurs.</span>
                </h1>
                <p className="text-zinc-500 text-xl md:text-2xl font-medium max-w-3xl mx-auto mb-20">
                    Nous avons sélectionné les meilleurs artisans de la terre. Ceux qui respectent les sols, les saisons et la qualité avant tout.
                </p>

                {partners && partners.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {partners.map((partner) => (
                            <div key={partner.id} className="glassmorphism bg-zinc-900/40 p-12 rounded-[40px] border border-white/5 flex flex-col items-center justify-center grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100 cursor-pointer group">
                                {partner.logoUrl ? (
                                    <div className="relative w-full aspect-square mb-4">
                                        <Image src={partner.logoUrl} alt={partner.name} fill className="object-contain" />
                                    </div>
                                ) : (
                                    <span className="font-black uppercase italic text-2xl tracking-tighter text-zinc-700 group-hover:text-orange-500 transition-colors">{partner.name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20">
                        <p className="text-zinc-500 text-xl italic">Nos producteurs arrivent bientôt sur la plateforme.</p>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    )
}
