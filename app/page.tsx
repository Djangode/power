import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import HeroSection from "@/components/sections/hero-section"
import ProductSection from "@/components/sections/product-section"

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-black font-sans selection:bg-orange-500/30">
      <Header />
      <main className="flex flex-col items-center">
        <HeroSection />

        <div id="marketplace" className="w-full bg-zinc-950">
          <ProductSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
