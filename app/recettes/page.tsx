import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Clock, ChefHat, Timer, Utensils } from "lucide-react"
import { getRecipes } from "@/app/actions/content"
import Image from "next/image"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function RecettesPage() {
    const { data: recipes } = await getRecipes()

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <div className="flex flex-col items-center mb-20 text-center">
                    <div className="w-16 h-1 w-12 bg-orange-500 mb-8 rounded-full"></div>
                    <h1 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter leading-none mb-8">
                        Gastronomie<br /><span className="text-orange-500">Power</span>
                    </h1>
                    <p className="text-zinc-500 text-xl font-medium max-w-2xl">Sublimez vos produits frais avec les créations de nos chefs. Simplicité, saveur, performance.</p>
                </div>

                {recipes && recipes.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {recipes.map((recipe: any) => (
                            <Link href={`/recettes/${recipe.id}`} key={recipe.id} className="group glassmorphism bg-zinc-900/40 rounded-[48px] overflow-hidden border border-white/5 hover:border-orange-500/50 transition-all cursor-pointer">
                                <div className="relative aspect-video overflow-hidden">
                                    {recipe.imageUrl ? (
                                        <Image src={recipe.imageUrl} alt={recipe.title} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl font-black text-zinc-900 italic">POWER CUISINE</div>
                                    )}
                                    {recipe.duration && (
                                        <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-xl border border-white/10 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                                            <Timer className="w-4 h-4 text-orange-500" /> {recipe.duration}
                                        </div>
                                    )}
                                </div>
                                <div className="p-10">
                                    <h3 className="text-3xl font-black uppercase italic mb-4 text-white group-hover:text-orange-500 transition-colors">{recipe.title}</h3>
                                    <p className="text-zinc-500 mb-8 font-medium line-clamp-2">
                                        {recipe.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                                            <Utensils className="w-4 h-4" /> {recipe.difficulty}
                                        </span>
                                        <span className="text-white font-bold italic group-hover:translate-x-2 transition-transform">Découvrir →</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-40">
                        <p className="text-zinc-500 text-xl font-medium italic">Nos chefs peaufinent les prochaines recettes. Restez connectés !</p>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    )
}
