"use client"

import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
}

export default function HeroSection({ title, subtitle }: HeroSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  // Parallax effects
  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacityText = useTransform(scrollYProgress, [0, 1], [1, 0])

  const scrollToMarketplace = () => {
    const marketplaceSection = document.getElementById("marketplace")
    if (marketplaceSection) {
      marketplaceSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section ref={ref} className="relative w-full h-screen flex flex-col justify-center items-center bg-black text-white overflow-hidden">
      {/* Background patterns or gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-950/20 via-black to-black opacity-90" />

      <motion.div
        style={{ y: yText, opacity: opacityText }}
        className="container mx-auto px-4 text-center relative z-10 flex flex-col items-center"
      >
        <div className="max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-8xl font-black mb-6 tracking-tight leading-tight"
          >
            {title || <>Le Primeur <br /><span className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]">Moderne</span></>}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto font-light"
          >
            {subtitle || "Le primeur digital avec des produits extra-frais et locaux, sélectionnés chaque matin."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              onClick={scrollToMarketplace}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg md:text-xl px-10 py-8 rounded-full font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(249,115,22,0.5)] border border-orange-400/50"
            >
              Découvrir la Boutique
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-10 cursor-pointer"
        onClick={scrollToMarketplace}
      >
        <span className="text-zinc-500 text-xs mb-3 uppercase tracking-[0.2em] font-medium">Scroll</span>
        <div className="w-12 h-12 rounded-full glassmorphism flex items-center justify-center border border-white/20 hover:bg-white/10 transition-colors">
          <ArrowDown className="w-5 h-5 text-orange-500" />
        </div>
      </motion.div>

      {/* Decorative Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.05, 0.1, 0.05]
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", delay: 2 }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-[150px] pointer-events-none"
      />
    </section>
  )
}