const DEFAULT_OWNER_EMAIL = "ibaricyril2111@gmail.com"

export function ownerEmail(): string {
  return (process.env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase()
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().toLowerCase() === ownerEmail()
}

/**
 * Le rôle admin n'est valable que pour le propriétaire déclaré. Cette deuxième
 * barrière protège même si une ancienne ligne en base conserve role="admin".
 */
export function effectiveRole(role: string, email: string | null | undefined): string {
  if (role === "admin" && !isOwnerEmail(email)) return "user"
  return role
}
