import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import Image from "next/image"
import { getRecipe } from "@/app/actions/content"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, Flame, Utensils, Zap } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { data: recipe } = await getRecipe(id)

    if (!recipe) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-44 pb-32">
                <Link href="/recettes" className="inline-flex items-center gap-2 text-zinc-500 hover:text-orange-500 font-black uppercase italic tracking-widest text-xs mb-12 group transition-all">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" />
                    <span>Retour aux recettes</span>
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
                    <div className="relative aspect-square rounded-[60px] overflow-hidden border border-white/5 shadow-2xl sticky top-44">
                        {recipe.imageUrl ? (
                            <Image src={recipe.imageUrl} alt={recipe.title} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-6xl font-black italic text-zinc-800 uppercase tracking-tighter text-center px-10">Power Cooking.</div>
                        )}
                        <div className="absolute top-10 left-10 bg-orange-500/90 backdrop-blur-2xl text-white px-6 py-3 rounded-full flex items-center gap-3 font-black uppercase italic tracking-widest text-sm shadow-2xl">
                            <Zap className="w-5 h-5" /> <span>Recette Signature</span>
                        </div>
                    </div>

                    <div className="flex flex-col animate-in fade-in slide-in-from-right-8 duration-1000">
                        <div className="mb-12">
                            <span className="text-orange-500 font-black uppercase tracking-[0.4em] text-xs mb-6 block">Gastronomie Power.</span>
                            <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-tight mb-8">
                                {recipe.title}
                            </h1>
                            <p className="text-zinc-500 text-xl font-medium italic leading-relaxed mb-10">
                                {recipe.description}
                            </p>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="glassmorphism bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center gap-2 text-center">
                                    <Clock className="w-6 h-6 text-orange-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Temps</span>
                                    <span className="font-bold italic uppercase">{recipe.duration ?? "N/A"}</span>
                                </div>
                                <div className="glassmorphism bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center gap-2 text-center">
                                    <Utensils className="w-6 h-6 text-orange-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Difficulté</span>
                                    <span className="font-bold italic uppercase">{recipe.difficulty}</span>
                                </div>
                                <div className="glassmorphism bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center gap-2 text-center">
                                    <Flame className="w-6 h-6 text-orange-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Énergie</span>
                                    <span className="font-bold italic uppercase">Haute</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            {recipe.content && (
                            <div>
                                <h3 className="text-2xl font-black uppercase italic mb-6 border-b border-white/5 pb-4">Recette <span className="text-orange-500">Power</span></h3>
                                <div className="text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap bg-zinc-900/40 p-6 rounded-2xl border border-white/5">
                                    {recipe.content}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
