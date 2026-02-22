import type { NextAuthConfig } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

export const authConfig = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize() {
                return null; // The real logic is in auth.ts which runs in Node.js runtime, not Edge.
            }
        })
    ],
    secret: process.env.AUTH_SECRET,
    pages: {
        signIn: '/connexion',
    },
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (token.role && session.user) {
                session.user.role = token.role as string
            }
            return session
        },
        async jwt({ token, user }) {
            if (user && user.email) {
                if (user.role) {
                    token.role = user.role
                }
            }
            return token
        }
    },
    session: { strategy: "jwt" }
} satisfies NextAuthConfig
