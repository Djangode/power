import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'
import GoogleAnalytics from '@/components/providers/google-analytics'
import CookieConsent from '@/components/cookie-consent'
import { Toaster } from "sonner"

export const metadata: Metadata = {
  metadataBase: new URL('https://powerprimeur.com'),
  title: 'Power - Primeur Frais à Alfortville & Livraison Île-de-France',
  description: 'Votre primeur spécialiste des produits frais, livrés chez vous en Île-de-France (94, 75, 92, 91). Retrouvez notre boutique à Alfortville / Vitry.',
  keywords: 'primeur, alfortville, vitry, fruits et légumes, livraison, ile de france, 94, 75, 92, 91',
  openGraph: {
    title: 'Power - Primeur Frais à Alfortville',
    description: 'Votre primeur de confiance en Île-de-France. Livraison de produits frais, fruits et légumes.',
    url: 'https://powerprimeur.com',
    siteName: 'Power Primeur',
    locale: 'fr_FR',
    type: 'website',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'GroceryStore',
  name: 'Power Primeur',
  url: 'https://powerprimeur.com',
  description: 'Votre primeur de confiance en Île-de-France. Livraison de produits frais, fruits et légumes sur Alfortville, Vitry (94), Paris (75), Hauts-de-Seine (92) et Essonne (91).',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '114 Rue Paul Vaillant Couturier',
    addressLocality: 'Alfortville',
    postalCode: '94140',
    addressRegion: 'Île-de-France',
    addressCountry: 'FR'
  },
  telephone: '+33659845017',
  areaServed: [
    'Alfortville',
    'Vitry-sur-Seine',
    'Paris',
    'Val-de-Marne (94)',
    'Hauts-de-Seine (92)',
    'Essonne (91)'
  ]
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
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {children}
          <CookieConsent />
          <Toaster position="top-center" richColors />
        </SessionProvider>
      </body>
    </html>
  )
}
