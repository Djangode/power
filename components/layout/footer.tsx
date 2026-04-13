import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-orange-500 text-white">
      <div className="container mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-lg tracking-tight">Power<span className="text-white">.</span></span>
          <span className="text-white text-sm">
            &copy; {new Date().getFullYear()} by <Link href="https://github.com/Haeim8" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded">djangode</Link>.
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-white font-medium">
          <Link href="/contact" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded">Contact</Link>
          <Link href="/faq" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded">FAQ</Link>
          <Link href="/mentions-legales" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded">Mentions légales</Link>
          <Link href="/cgv" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded">CGV</Link>
        </nav>
      </div>
    </footer>
  )
}
