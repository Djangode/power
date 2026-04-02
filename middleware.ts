import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role

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
    if (userRole !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
      }
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // ============================================
  // Protection des routes utilisateur authentifié
  // ============================================
  const protectedRoutes = ["/mon-compte", "/commande"]
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/connexion", req.url))
  }

  // ============================================
  // Redirection si déjà connecté (page login)
  // ============================================
  if (pathname === "/connexion" && isLoggedIn) {
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
    "/connexion",
  ],
}
