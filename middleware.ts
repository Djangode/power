import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const userRole = req.auth?.user?.role || "user"

    const isAdminRoute = nextUrl.pathname.startsWith('/admin')
    const isAuthRoute = nextUrl.pathname.startsWith('/connexion')

    // Si connecté et sur la page connexion → retour accueil
    if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl))
    }

    // Protection admin
    if (isAdminRoute) {
        if (!isLoggedIn) {
            return Response.redirect(new URL('/connexion', nextUrl))
        }
        if (userRole !== "admin") {
            return Response.redirect(new URL('/', nextUrl))
        }
    }
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
