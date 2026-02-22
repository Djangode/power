const requiredEnvVars = [
  { key: "DATABASE_URL", label: "Base de données" },
  { key: "AUTH_SECRET", label: "Authentification" },
  { key: "STRIPE_SECRET_KEY", label: "Paiements Stripe" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Stripe" },
] as const

export function validateEnv() {
  const missing: string[] = []

  for (const { key, label } of requiredEnvVars) {
    const value = process.env[key]
    if (!value || value.includes("xxx") || value.includes("placeholder")) {
      missing.push(`${key} (${label})`)
    }
  }

  if (missing.length === 0) return

  const isProduction = process.env.NODE_ENV === "production"

  if (isProduction) {
    console.warn(
      `⚠️  Variables d'environnement manquantes en production :\n${missing.map(m => `  - ${m}`).join("\n")}`
    )
    return
  }

  console.warn(
    `\n⚠️  Variables d'environnement manquantes :\n${missing.map(m => `   - ${m}`).join("\n")}\n   L'app fonctionne en mode dégradé.\n`
  )
}

// Exécuter la validation au chargement du module
validateEnv()
