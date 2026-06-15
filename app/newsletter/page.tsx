import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Mail } from "lucide-react"
import NewsletterForm from "@/components/newsletter-form"

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

                <NewsletterForm />
            </main>
            <Footer />
        </div>
    )
}
