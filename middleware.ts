import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"
import { isOwnerEmail } from "@/lib/authz"

// Utilise auth.config.ts (léger, Edge-compatible)
// au lieu de auth.ts (qui importe Prisma/bcrypt → trop lourd pour Edge)
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role
  const userEmail = req.auth?.user?.email
  const isDisabled = req.auth?.user?.disabled === true

  // ============================================
  // Compte désactivé : accès révoqué (le jeton peut encore exister). On laisse la page de
  // connexion accessible pour permettre de se reconnecter avec un autre compte.
  // ============================================
  if (isDisabled && pathname !== "/connexion") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 })
    }
    return NextResponse.redirect(new URL("/connexion", req.url))
  }

  // ============================================
  // Protection des routes admin (pages + API)
  // ============================================
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin")
  if (isAdminRoute) {
    if (!isLoggedIn) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/connexion", req.url))
    }
    if (userRole !== "admin" || !isOwnerEmail(userEmail)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
      }
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // ============================================
  // Protection des routes utilisateur authentifié
  // ============================================
  // "/commandes" (historique) : l'API filtre déjà sur le propriétaire, mais sans redirection
  // un visiteur déconnecté reste sur un écran de chargement puis une erreur brute.
  const protectedRoutes = ["/mon-compte", "/commande", "/commandes"]
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/connexion", req.url))
  }

  // ============================================
  // Redirection si déjà connecté (page login)
  // ============================================
  if (pathname === "/connexion" && isLoggedIn && !isDisabled) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/mon-compte/:path*",
    "/commande/:path*",
    "/commandes/:path*",
    "/connexion",
  ],
}
