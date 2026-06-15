import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import Image from "next/image"
import { getBlogPost } from "@/app/actions/content"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, User, Calendar } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { data: post } = await getBlogPost(id)

    if (!post || !post.published) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-4xl mx-auto px-4 pt-44 pb-32">
                <Link href="/blog" className="inline-flex items-center gap-2 text-zinc-500 hover:text-orange-500 font-black uppercase italic tracking-widest text-xs mb-12 group transition-all">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" />
                    <span>Retour au journal</span>
                </Link>

                <article className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="mb-12">
                        <div className="flex items-center gap-4 mb-8">
                            <span className="bg-orange-500 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl shadow-orange-500/20">
                                {post.category || "Actualité"}
                            </span>
                            <span className="text-zinc-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> {new Date(post.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-tight mb-10">
                            {post.title}
                        </h1>
                        <div className="flex items-center gap-4 p-6 rounded-3xl bg-zinc-900/50 border border-white/5 w-fit">
                            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-black italic text-sm">
                                {post.author.slice(0, 1)}
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Écrit par</p>
                                <p className="text-white font-bold italic">{post.author}</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative aspect-video rounded-[48px] overflow-hidden mb-16 border border-white/5 shadow-2xl">
                        {post.imageUrl ? (
                            <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-4xl font-black italic text-zinc-800 uppercase tracking-tighter">Power Journalism.</div>
                        )}
                    </div>

                    <div className="prose prose-invert prose-orange max-w-none">
                        <div className="text-xl md:text-2xl text-zinc-400 font-medium italic mb-12 leading-relaxed border-l-4 border-orange-500 pl-8 py-2">
                            {post.excerpt}
                        </div>
                        <div className="text-zinc-300 leading-relaxed space-y-8 text-lg font-medium whitespace-pre-wrap">
                            {post.content}
                        </div>
                    </div>
                </article>
            </main>
            <Footer />
        </div>
    )
}
