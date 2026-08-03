import { describe, it, expect } from 'vitest'
import { PRODUCT_UNITS, normalizeUnit, unitLabel } from '@/lib/units'

/**
 * TESTS — Unités de vente.
 *
 * Régression : deux listes divergentes dans l'admin (« piece » d'un côté, « pièce » de
 * l'autre) avaient créé deux unités distinctes en base pour la même réalité, faussant
 * regroupements et filtres.
 */
describe('lib/units', () => {
  it('devrait exposer des valeurs sans accent ni majuscule', () => {
    for (const unit of PRODUCT_UNITS) {
      expect(unit.value).toBe(unit.value.toLowerCase())
      expect(unit.value.normalize('NFD')).toBe(unit.value)
    }
  })

  it('ne devrait pas contenir de doublon', () => {
    const values = PRODUCT_UNITS.map((u) => u.value)
    expect(new Set(values).size).toBe(values.length)
  })

  describe('normalizeUnit', () => {
    it('devrait ramener « pièce » vers « piece »', () => {
      expect(normalizeUnit('pièce')).toBe('piece')
      expect(normalizeUnit('Pièce')).toBe('piece')
      expect(normalizeUnit('PIÈCE')).toBe('piece')
    })

    it('devrait tolerer les espaces et la casse', () => {
      expect(normalizeUnit('  KG  ')).toBe('kg')
      expect(normalizeUnit('Botte')).toBe('botte')
    })

    it('devrait retomber sur le kilogramme quand rien n est fourni', () => {
      expect(normalizeUnit(null)).toBe('kg')
      expect(normalizeUnit(undefined)).toBe('kg')
      expect(normalizeUnit('')).toBe('kg')
    })

    it('devrait conserver une unite inconnue plutot que de la perdre', () => {
      expect(normalizeUnit('cagette')).toBe('cagette')
    })
  })

  describe('unitLabel', () => {
    it('devrait afficher l accent au client', () => {
      expect(unitLabel('piece')).toBe('pièce')
      expect(unitLabel('kg')).toBe('kg')
    })

    it('devrait afficher tel quel une unite inconnue', () => {
      expect(unitLabel('cagette')).toBe('cagette')
    })
  })
})

/**
 * TESTS — Vente au poids.
 *
 * Le kilo se vend par tranches de 100 g : imposer le kilo entier faisait renoncer les
 * petits foyers. Les autres unités restent indivisibles.
 */
describe('vente au poids', () => {
  it('devrait reconnaitre les produits pesés', async () => {
    const { isWeighed } = await import('@/lib/units')
    expect(isWeighed('kg')).toBe(true)
    expect(isWeighed('piece')).toBe(false)
    expect(isWeighed('botte')).toBe(false)
  })

  it('devrait avancer par 100 g au kilo, par 1 sinon', async () => {
    const { quantityStep } = await import('@/lib/units')
    expect(quantityStep('kg')).toBe(0.1)
    expect(quantityStep('piece')).toBe(1)
    expect(quantityStep('barquette')).toBe(1)
  })

  it('devrait permettre de commander 100 g', async () => {
    const { minQuantity } = await import('@/lib/units')
    expect(minQuantity('kg')).toBe(0.1)
    expect(minQuantity('piece')).toBe(1)
  })

  describe('roundToStep', () => {
    it('devrait aligner sur la tranche de 100 g', async () => {
      const { roundToStep } = await import('@/lib/units')
      expect(roundToStep(0.34, 'kg')).toBe(0.3)
      expect(roundToStep(0.36, 'kg')).toBe(0.4)
    })

    // 0.1 + 0.2 vaut 0.30000000000000004 en flottant : sans arrondi, la quantité
    // enregistrée et le prix facturé dérivent.
    it('devrait absorber l imprecision des flottants', async () => {
      const { roundToStep } = await import('@/lib/units')
      expect(roundToStep(0.1 + 0.2, 'kg')).toBe(0.3)
      expect(roundToStep(0.1 * 3, 'kg')).toBe(0.3)
    })

    it('devrait garder des entiers pour les unites indivisibles', async () => {
      const { roundToStep } = await import('@/lib/units')
      expect(roundToStep(2.4, 'piece')).toBe(2)
      expect(roundToStep(2.6, 'piece')).toBe(3)
    })
  })

  describe('formatQuantity', () => {
    it('devrait afficher les grammes sous le kilo', async () => {
      const { formatQuantity } = await import('@/lib/units')
      expect(formatQuantity(0.1, 'kg')).toBe('100 g')
      expect(formatQuantity(0.3, 'kg')).toBe('300 g')
      expect(formatQuantity(0.5, 'kg')).toBe('500 g')
    })

    it('devrait afficher les kilos au-dela', async () => {
      const { formatQuantity } = await import('@/lib/units')
      expect(formatQuantity(1, 'kg')).toBe('1 kg')
      expect(formatQuantity(1.5, 'kg')).toBe('1,5 kg')
      expect(formatQuantity(2.3, 'kg')).toBe('2,3 kg')
    })

    it('devrait accorder les unites indivisibles', async () => {
      const { formatQuantity } = await import('@/lib/units')
      expect(formatQuantity(1, 'piece')).toBe('1 pièce')
      expect(formatQuantity(3, 'piece')).toBe('3 pièces')
      expect(formatQuantity(2, 'botte')).toBe('2 bottes')
    })
  })

  describe('lineTotal', () => {
    it('devrait facturer au prorata du poids', async () => {
      const { lineTotal } = await import('@/lib/units')
      // 3,80 €/kg pour 300 g
      expect(lineTotal(3.8, 0.3)).toBe(1.14)
      expect(lineTotal(3.8, 1)).toBe(3.8)
      expect(lineTotal(3.8, 2.5)).toBe(9.5)
    })

    it('devrait arrondir au centime', async () => {
      const { lineTotal } = await import('@/lib/units')
      expect(lineTotal(3.33, 0.7)).toBe(2.33)
    })
  })
})

/**
 * TESTS — Alignement d'une quantité héritée.
 *
 * Régression : la modale produit est montée une seule fois et ne reçoit que le produit en
 * props. La quantité d'un article au poids (0,2 kg) restait affichée sur l'article suivant
 * vendu à la pièce, donnant « 0,2 pièce » — et un ajout au panier de 0,2 unité.
 */
describe('quantité héritée d\'une autre unité', () => {
  it('devrait ramener une quantité au poids sur un article à la pièce', async () => {
    const { roundToStep, minQuantity } = await import('@/lib/units')
    // 0,2 hérité d'un produit au kilo, appliqué à un produit vendu à la pièce
    expect(roundToStep(Math.max(minQuantity('piece'), 0.2), 'piece')).toBe(1)
  })

  it('ne devrait jamais descendre sous une unité entière à la pièce', async () => {
    const { roundToStep, minQuantity } = await import('@/lib/units')
    for (const v of [0.1, 0.2, 0.4, 0.9]) {
      expect(roundToStep(Math.max(minQuantity('piece'), v), 'piece')).toBe(1)
    }
  })

  it('devrait conserver une quantité valide à la pièce', async () => {
    const { roundToStep, minQuantity } = await import('@/lib/units')
    expect(roundToStep(Math.max(minQuantity('piece'), 3), 'piece')).toBe(3)
  })

  it('devrait garder les tranches de 100 g au kilo', async () => {
    const { roundToStep, minQuantity } = await import('@/lib/units')
    expect(roundToStep(Math.max(minQuantity('kg'), 0.2), 'kg')).toBe(0.2)
  })

  it('devrait repartir de la quantité minimale selon l unité', async () => {
    const { minQuantity } = await import('@/lib/units')
    expect(minQuantity('piece')).toBe(1)
    expect(minQuantity('botte')).toBe(1)
    expect(minQuantity('barquette')).toBe(1)
    expect(minQuantity('kg')).toBe(0.1)
  })
})

