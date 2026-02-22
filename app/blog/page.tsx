import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import Image from "next/image"
import Link from "next/link"
import { getBlogPosts } from "@/app/actions/content"

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
    const { data: posts } = await getBlogPosts()

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter mb-20 text-center leading-none">
                    Journal<span className="text-zinc-800">.</span>
                </h1>

                {posts && posts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {posts.map((post: any) => (
                            <Link href={`/blog/${post.id}`} key={post.id} className="group glassmorphism bg-zinc-900/40 rounded-[48px] overflow-hidden border border-white/5 hover:border-orange-500/50 transition-all cursor-pointer">
                                <div className="relative aspect-video bg-zinc-800 overflow-hidden">
                                    {post.imageUrl ? (
                                        <Image src={post.imageUrl} alt={post.title} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    ) : (
                                        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-4xl font-black uppercase italic text-zinc-800">POWER JOURNAL</div>
                                    )}
                                    {post.category && (
                                        <div className="absolute top-6 left-6 bg-orange-500 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest z-20 shadow-xl">{post.category}</div>
                                    )}
                                </div>
                                <div className="p-10">
                                    <span className="text-zinc-600 text-xs font-bold uppercase tracking-[0.2em] mb-4 block">
                                        {new Date(post.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} • Par {post.author}
                                    </span>
                                    <h3 className="text-3xl font-black uppercase italic leading-tight mb-6 group-hover:text-orange-500 transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-zinc-500 text-lg leading-relaxed line-clamp-2 font-medium">
                                        {post.excerpt}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-40">
                        <p className="text-zinc-500 text-xl font-medium italic">Le journal est en cours de rédaction. Revenez très bientôt !</p>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    )
}
