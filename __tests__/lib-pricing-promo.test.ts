import { describe, it, expect } from "vitest"
import { cartItemUnitPrice } from "@/lib/pricing"

/**
 * La promo produit s'applique au point unique de calcul (cartItemUnitPrice), donc à la fois
 * pour l'affichage panier et pour la facturation. Ces cas verrouillent ce comportement :
 * un prix promo doit être facturé, et l'absence de promo ne doit rien changer.
 */
describe("cartItemUnitPrice — promo produit", () => {
    it("utilise le prix normal quand aucune promo", () => {
        expect(cartItemUnitPrice({ product: { price: 4.5 } })).toBe(4.5)
    })

    it("utilise le prix promo quand il est défini", () => {
        expect(cartItemUnitPrice({ product: { price: 4.5, promoPrice: 2 } })).toBe(2)
    })

    it("revient au prix normal quand la promo est nulle", () => {
        expect(cartItemUnitPrice({ product: { price: 4.5, promoPrice: null } })).toBe(4.5)
    })

    it("un prix promo de 0 est un prix effectif de 0 (produit offert)", () => {
        expect(cartItemUnitPrice({ product: { price: 4.5, promoPrice: 0 } })).toBe(0)
    })
})
