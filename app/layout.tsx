import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'
import GoogleAnalytics from '@/components/providers/google-analytics'
import CookieConsent from '@/components/cookie-consent'
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: 'Power - Primeur en ligne',
  description: 'Produits frais, biologiques et locaux livrés chez vous',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <body>
        <SessionProvider>
          <GoogleAnalytics />
          {children}
          <CookieConsent />
          <Toaster position="top-center" richColors />
        </SessionProvider>
      </body>
    </html>
  )
}
