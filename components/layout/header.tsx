"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, User, Menu } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { getCartItems } from "@/app/actions/cart"
import CartDrawer from "@/components/cart/cart-drawer"

function scrollToMarketplace() {
  const el = document.getElementById("marketplace")
  if (el) {
    el.scrollIntoView({ behavior: "smooth" })
  } else {
    window.location.href = "/#marketplace"
  }
}

export default function Header() {
  const [cartCount, setCartCount] = useState(0)
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const isLoggedIn = status === "authenticated"
  const loading = status === "loading"
  const user = session?.user

  const loadCartCount = async () => {
    try {
      const cartResult = await getCartItems()
      if (cartResult.success && cartResult.data) {
        const totalItems = cartResult.data.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        setCartCount(totalItems)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadCartCount()
  }, [])

  // Écouter les mises à jour du panier (ajout, suppression)
  useEffect(() => {
    const handler = () => loadCartCount()
    window.addEventListener("cart-updated", handler)
    return () => window.removeEventListener("cart-updated", handler)
  }, [])

  const handleLogout = async () => {
    await signOut({ redirect: false })
  }

  const getUserDisplayName = () => {
    if (user?.name) return user.name
    return user?.email || "Utilisateur"
  }

  return (
    <>
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <header className="w-full max-w-6xl flex items-center justify-between pointer-events-auto">

          {/* Logo + Menu mobile */}
          <div className="flex items-center space-x-1 glassmorphism bg-black/60 px-2 sm:px-5 py-1.5 sm:py-3 rounded-full border border-white/10 hover:bg-black/80 transition-colors shadow-2xl backdrop-blur-xl">
            {/* Menu hamburger mobile - à gauche du logo */}
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu" className="md:hidden rounded-full hover:bg-white/10 text-white h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="glassmorphism bg-black/90 border-white/10 text-white rounded-2xl p-2 mt-2 backdrop-blur-xl w-56 shadow-2xl md:hidden">
                <DropdownMenuItem onClick={() => { scrollToMarketplace(); setMobileMenuOpen(false) }} className="rounded-xl focus:bg-white/10 cursor-pointer">
                  Boutique
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setCartOpen(true); setMobileMenuOpen(false) }} className="rounded-xl focus:bg-white/10 cursor-pointer">
                  Panier
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl focus:bg-white/10 cursor-pointer">
                  <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
                </DropdownMenuItem>
                {!isLoggedIn && (
                  <DropdownMenuItem asChild className="rounded-xl focus:bg-orange-500/20 text-orange-400 cursor-pointer">
                    <Link href="/connexion" onClick={() => setMobileMenuOpen(false)}>Connexion</Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/" aria-label="Power Primeur — Accueil" className="flex items-center gap-2">
              {/* Médaillon détouré, pas le bandeau du fichier source : sur un header
                  translucide, un logotype à fond noir plaque un rectangle opaque. */}
              <Image
                src="/logo-power-mark.png"
                alt=""
                width={36}
                height={36}
                priority
                className="h-8 w-8 sm:h-9 sm:w-9"
              />
              <span className="hidden sm:inline text-xl font-extrabold text-white tracking-tight">
                Power<span className="text-orange-500">.</span>
              </span>
            </Link>
          </div>

          {/* Pas de navigation centrale : la boutique se découvre au scroll, le panier a
              son bouton à droite, et Contact vit dans le pied de page. */}

          {/* Boutons Droite */}
          <div className="flex items-center space-x-2 glassmorphism bg-black/60 px-2 py-1.5 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Panier"
              className="relative rounded-full hover:bg-white/10 text-white"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-orange-500 text-white border-0">
                  {cartCount}
                </Badge>
              )}
            </Button>

            {loading ? (
              <div className="w-9 h-9 bg-white/10 animate-pulse rounded-full"></div>
            ) : isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Profil Utilisateur" className="rounded-full hover:bg-white/10 text-white">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glassmorphism bg-black/90 border-white/10 text-white rounded-2xl p-2 mt-2 backdrop-blur-xl w-48 shadow-2xl">
                  <div className="px-2 py-2 text-sm font-medium text-zinc-400 mb-2 border-b border-white/10">
                    {getUserDisplayName()}
                  </div>
                  <DropdownMenuItem asChild className="rounded-xl focus:bg-white/10 cursor-pointer">
                    <Link href="/mon-compte">Mon profil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl focus:bg-white/10 cursor-pointer">
                    <Link href="/mon-compte">Commandes</Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild className="rounded-xl focus:bg-orange-500/20 text-orange-400 cursor-pointer">
                      <Link href="/admin">Gestion</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl focus:bg-red-500/20 text-red-400 cursor-pointer mt-1">
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-5 h-9 font-semibold shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                asChild
              >
                <Link href="/connexion">Connexion</Link>
              </Button>
            )}

          </div>

        </header>
      </div>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  )
}
