"use client"

import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import Image from "next/image"

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
  const scaleImage = useTransform(scrollYProgress, [0, 1], [1, 1.15])

  const scrollToMarketplace = () => {
    const marketplaceSection = document.getElementById("marketplace")
    if (marketplaceSection) {
      marketplaceSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section ref={ref} className="relative w-full h-screen flex flex-col justify-center items-center text-white overflow-hidden">
      {/* Background Image */}
      <motion.div style={{ scale: scaleImage }} className="absolute inset-0">
        <Image
          src="/power-champ-hero.webp"
          alt="Power Primeur - Fruits et légumes frais livrés à domicile"
          fill
          priority
          fetchPriority="high"
          quality={75}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
        />
      </motion.div>

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      <motion.div
        style={{ y: yText, opacity: opacityText }}
        className="container mx-auto px-4 text-center relative z-10 flex flex-col items-center"
      >
        <div className="max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-8xl font-black mb-6 tracking-tight leading-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]"
          >
            {title || <>Le Primeur <br /><span className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]">Moderne</span></>}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-2xl text-white/80 mb-12 max-w-2xl mx-auto font-light drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]"
          >
            {subtitle || "votre primeur extra-frais et locaux, sélectionnés chaque matin."}
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
      <motion.button
        aria-label="Défiler vers la boutique"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-6 sm:bottom-10 inset-x-0 flex justify-center z-10 bg-transparent border-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg p-2"
        onClick={scrollToMarketplace}
      >
        <div className="flex flex-col items-center animate-bounce cursor-pointer">
          <span className="text-white text-[10px] sm:text-xs mb-2 sm:mb-3 uppercase tracking-[0.2em] font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Scroll</span>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/40 hover:bg-black/80 transition-colors">
            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          </div>
        </div>
      </motion.button>
    </section>
  )
}