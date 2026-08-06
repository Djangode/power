// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Calendar } from "@/components/ui/calendar"

// Mois fixe pour un rendu stable, indépendant de la date d'exécution.
const AOUT_2026 = new Date(2026, 7, 1)

describe("Calendar (components/ui/calendar)", () => {
  it("affiche le calendrier en français avec la semaine commençant le lundi", () => {
    const { container } = render(<Calendar mode="single" defaultMonth={AOUT_2026} />)

    // Libellé du mois localisé (la capitalisation est faite en CSS, le DOM reste en minuscules)
    expect(container.textContent).toContain("août 2026")

    // Ordre des jours : lundi en premier, dimanche en dernier
    const enTetes = Array.from(container.querySelectorAll("th")).map((th) =>
      th.textContent?.trim().toLowerCase()
    )
    expect(enTetes).toHaveLength(7)
    expect(enTetes[0]).toMatch(/^lu/)
    expect(enTetes[6]).toMatch(/^di/)
  })

  it("applique les styles aux boutons de jour et aux rangées (clés classNames de l'API v9)", () => {
    const { container } = render(<Calendar mode="single" defaultMonth={AOUT_2026} />)

    // En v9 le bouton cliquable est `day_button` (et non `day`) : si les clés
    // ne correspondent pas à l'API installée, il reste sans dimension ni style.
    const boutonJour = container.querySelector("td button")
    expect(boutonJour).not.toBeNull()
    expect(boutonJour!.className).toContain("h-9")
    expect(boutonJour!.className).toContain("w-9")

    // La rangée des jours de la semaine doit être en flex pour rester alignée
    // avec la grille des jours (sinon la mise en page part en désordre).
    const rangeeEnTetes = container.querySelector("thead tr")
    expect(rangeeEnTetes).not.toBeNull()
    expect(rangeeEnTetes!.className).toContain("flex")
  })
})
