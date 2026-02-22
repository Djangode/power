import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

declare module "next-auth" {
    interface User {
        role?: string
    }
    interface Session {
        user: {
            id: string
            role?: string
        } & DefaultSession["user"]
    }
}

import { DefaultSession } from "next-auth"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        ...authConfig.providers.filter(p => p.id !== "credentials"),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials)

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data

                    const user = await prisma.user.findUnique({
                        where: { email }
                    })

                    if (!user) return null

                    const passwordsMatch = await bcrypt.compare(password, user.password)

                    if (passwordsMatch) {
                        return {
                            id: user.id,
                            email: user.email,
                            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                            role: user.role
                        }
                    }
                }

                return null
            }
        })
    ],
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account, profile }) {
            if (account?.provider === "google" && user.email) {
                try {
                    const existingUser = await prisma.user.findUnique({
                        where: { email: user.email }
                    })
                    if (!existingUser) {
                        await prisma.user.create({
                            data: {
                                email: user.email,
                                firstName: (profile?.given_name as string) || user.name?.split(' ')[0] || "",
                                lastName: (profile?.family_name as string) || user.name?.split(' ').slice(1).join(' ') || "",
                                password: "",
                                role: "user"
                            }
                        })
                    }
                } catch (e) {
                    console.error("Error creating oauth user", e)
                    return false
                }
            }
            return true
        },
        async jwt({ token, user, account }) {
            // Premier login : on va chercher le vrai ID et ROLE en DB
            if (user && user.email) {
                const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
                if (dbUser) {
                    token.sub = dbUser.id
                    token.role = dbUser.role
                }
            }
            // Persister le role dans le token à chaque requête
            if (!token.role && token.sub) {
                try {
                    const dbUser = await prisma.user.findUnique({ where: { id: token.sub } })
                    if (dbUser) {
                        token.role = dbUser.role
                    }
                } catch {}
            }
            return token
        }
    }
})
