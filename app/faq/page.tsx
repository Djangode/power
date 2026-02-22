import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { getFaqs } from "@/app/actions/content"

export const dynamic = 'force-dynamic'

export default async function FAQPage() {
    const { data: faqs } = await getFaqs()

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-center mb-16">
                    FAQ<span className="text-orange-500">.</span>
                </h1>

                <div className="glassmorphism bg-zinc-900/40 p-8 md:p-12 rounded-[40px] border border-white/10">
                    {faqs && faqs.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, i) => (
                                <AccordionItem key={faq.id} value={`item-${i}`} className="border-white/10 mb-4 px-4 rounded-2xl hover:bg-white/5 transition-all">
                                    <AccordionTrigger className="text-xl font-bold uppercase italic hover:no-underline py-6">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-zinc-400 text-lg leading-relaxed pb-8">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-20 text-zinc-500 font-medium italic">
                            Aucune question pour le moment. Nous sommes à votre écoute !
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}
