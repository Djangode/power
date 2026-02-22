import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  if (!session?.user) {
    redirect("/")
  }

  if (session.user.role !== "admin") {
    redirect("/")
  }

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
      {children}
    </div>
  )
}
