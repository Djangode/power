import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-white border-t border-zinc-800">
      <div className="container mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-lg tracking-tight">Power<span className="text-orange-500">.</span></span>
          <span className="text-zinc-500 text-sm">&copy; {new Date().getFullYear()} by djangode.</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/contact" className="hover:text-orange-500 transition-colors">Contact</Link>
          <Link href="/faq" className="hover:text-orange-500 transition-colors">FAQ</Link>
          <Link href="/mentions-legales" className="hover:text-orange-500 transition-colors">Mentions légales</Link>
          <Link href="/cgv" className="hover:text-orange-500 transition-colors">CGV</Link>
        </nav>
      </div>
    </footer>
  )
}
