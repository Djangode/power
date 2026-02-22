"use client"

import { useState, useEffect } from "react"
import Script from "next/script"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export default function GoogleAnalytics() {
  const [consentGiven, setConsentGiven] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent")
    if (consent === "all") {
      setConsentGiven(true)
    }

    // Écouter les changements de consent (quand l'utilisateur clique)
    const handleStorage = () => {
      const updated = localStorage.getItem("cookie-consent")
      setConsentGiven(updated === "all")
    }
    window.addEventListener("storage", handleStorage)

    // Custom event pour le même onglet
    const handleConsent = () => {
      const updated = localStorage.getItem("cookie-consent")
      setConsentGiven(updated === "all")
    }
    window.addEventListener("cookie-consent-update", handleConsent)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("cookie-consent-update", handleConsent)
    }
  }, [])

  if (!GA_MEASUREMENT_ID || !consentGiven) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}
