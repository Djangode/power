import { describe, it, expect } from 'vitest'
import {
  compositionPrice,
  resolveSize,
  defaultOptionIds,
  startingPrice,
  describeSelection,
  remainingIncludedChoices,
} from '@/lib/composition-pricing'

/**
 * TESTS — Tarification des compositions.
 *
 * Le calcul précédent additionnait les prix au kilo du catalogue : ajouter de la mangue à
 * un plateau facturait un kilo de mangues. Ces tests figent la règle voulue —
 * prix de la taille + suppléments — et le fait que la formule standard soit comprise.
 */

const SIZES = [
  { id: 's1', name: 'Petit', price: 15, isDefault: true },
  { id: 's2', name: 'Moyen', price: 22 },
  { id: 's3', name: 'Grand', price: 30 },
]

const OPTIONS = [
  { id: 'o1', name: 'Fraise', extraPrice: 0, includedByDefault: true },
  { id: 'o2', name: 'Kiwi', extraPrice: 0, includedByDefault: true },
  { id: 'o3', name: 'Ananas', extraPrice: 0, includedByDefault: true },
  { id: 'o4', name: 'Mangue', extraPrice: 2 },
  { id: 'o5', name: 'Fruits rouges', extraPrice: 3 },
]

describe('lib/composition-pricing', () => {
  describe('resolveSize', () => {
    it('devrait retenir la taille choisie', () => {
      expect(resolveSize(SIZES, 's3')?.name).toBe('Grand')
    })

    it('devrait retomber sur la taille par defaut', () => {
      expect(resolveSize(SIZES, null)?.name).toBe('Petit')
    })

    it('devrait ignorer un identifiant inconnu', () => {
      expect(resolveSize(SIZES, 'inexistant')?.name).toBe('Petit')
    })

    it('devrait prendre la premiere taille si aucune n est par defaut', () => {
      const sizes = [{ id: 'a', name: 'Unique', price: 9 }]
      expect(resolveSize(sizes, null)?.name).toBe('Unique')
    })

    it('devrait renvoyer null sans aucune taille', () => {
      expect(resolveSize([], null)).toBeNull()
    })
  })

  describe('compositionPrice', () => {
    it('devrait facturer le prix de la taille pour la formule standard', () => {
      const price = compositionPrice(
        { sizeId: 's1', optionIds: defaultOptionIds(OPTIONS) },
        SIZES, OPTIONS, 15,
      )
      expect(price).toBe(15)
    })

    it('devrait changer de prix selon la taille', () => {
      const ids = defaultOptionIds(OPTIONS)
      expect(compositionPrice({ sizeId: 's2', optionIds: ids }, SIZES, OPTIONS, 15)).toBe(22)
      expect(compositionPrice({ sizeId: 's3', optionIds: ids }, SIZES, OPTIONS, 15)).toBe(30)
    })

    it('devrait ajouter le supplement d une option payante', () => {
      const price = compositionPrice(
        { sizeId: 's1', optionIds: [...defaultOptionIds(OPTIONS), 'o4'] },
        SIZES, OPTIONS, 15,
      )
      expect(price).toBe(17)
    })

    it('devrait cumuler plusieurs supplements', () => {
      const price = compositionPrice(
        { sizeId: 's2', optionIds: [...defaultOptionIds(OPTIONS), 'o4', 'o5'] },
        SIZES, OPTIONS, 15,
      )
      expect(price).toBe(27)
    })

    // Régression : l'ancien calcul ajoutait le prix catalogue au kilo de chaque ingrédient.
    it('ne devrait rien facturer pour les ingredients de la formule standard', () => {
      const sansOptions = compositionPrice({ sizeId: 's1', optionIds: [] }, SIZES, OPTIONS, 15)
      const avecFormule = compositionPrice(
        { sizeId: 's1', optionIds: defaultOptionIds(OPTIONS) },
        SIZES, OPTIONS, 15,
      )
      expect(sansOptions).toBe(avecFormule)
      expect(avecFormule).toBe(15)
    })

    it('ne devrait pas facturer une option inconnue envoyee par le client', () => {
      const price = compositionPrice(
        { sizeId: 's1', optionIds: ['option-forgee'] },
        SIZES, OPTIONS, 15,
      )
      expect(price).toBe(15)
    })

    it('devrait utiliser le prix de repli sans aucune taille definie', () => {
      expect(compositionPrice({ sizeId: null, optionIds: [] }, [], OPTIONS, 12.5)).toBe(12.5)
    })

    it('devrait arrondir au centime', () => {
      const sizes = [{ id: 'a', name: 'M', price: 10.005, isDefault: true }]
      expect(compositionPrice({ sizeId: 'a' }, sizes, [], 0)).toBe(10.01)
    })
  })

  describe('startingPrice', () => {
    it('devrait annoncer le format le moins cher', () => {
      expect(startingPrice(SIZES, 99)).toBe(15)
    })

    it('devrait utiliser le repli sans taille', () => {
      expect(startingPrice([], 8)).toBe(8)
    })
  })

  /**
   * Formats à quota : « choisissez 2 fruits, les suivants sont en supplément ».
   * Distinct de la formule fixe, où le commerçant impose la recette de base.
   */
  describe('ingrédients au choix (quota)', () => {
    const SMOOTHIE_SIZES = [
      { id: 'p', name: '25 cl', price: 2, isDefault: true, includedChoices: 2 },
      { id: 'g', name: '50 cl', price: 4, includedChoices: 3 },
    ]
    const FRUITS = [
      { id: 'f1', name: 'Banane', extraPrice: 1 },
      { id: 'f2', name: 'Pomme', extraPrice: 1 },
      { id: 'f3', name: 'Orange', extraPrice: 1 },
      { id: 'f4', name: 'Mangue', extraPrice: 1.5 },
    ]

    it('ne devrait rien precocher sur un format a quota', () => {
      expect(defaultOptionIds(FRUITS, SMOOTHIE_SIZES[0])).toEqual([])
    })

    it('devrait inclure les fruits dans la limite du quota', () => {
      const price = compositionPrice({ sizeId: 'p', optionIds: ['f1', 'f2'] }, SMOOTHIE_SIZES, FRUITS, 2)
      expect(price).toBe(2)
    })

    it('devrait facturer le fruit au-dela du quota', () => {
      const price = compositionPrice({ sizeId: 'p', optionIds: ['f1', 'f2', 'f3'] }, SMOOTHIE_SIZES, FRUITS, 2)
      expect(price).toBe(3)
    })

    it('devrait facturer chaque fruit supplementaire a son tarif', () => {
      const price = compositionPrice(
        { sizeId: 'p', optionIds: ['f1', 'f2', 'f3', 'f4'] },
        SMOOTHIE_SIZES, FRUITS, 2,
      )
      expect(price).toBe(4.5)
    })

    it('devrait suivre l ordre de selection pour designer les inclus', () => {
      // Mangue choisie en premier : elle est comprise, c'est Orange qui devient payante.
      const price = compositionPrice({ sizeId: 'p', optionIds: ['f4', 'f1', 'f3'] }, SMOOTHIE_SIZES, FRUITS, 2)
      expect(price).toBe(3)
    })

    it('devrait appliquer le quota propre a chaque format', () => {
      const price = compositionPrice({ sizeId: 'g', optionIds: ['f1', 'f2', 'f3'] }, SMOOTHIE_SIZES, FRUITS, 2)
      expect(price).toBe(4)
    })

    it('devrait facturer moins que le quota sans supplement', () => {
      const price = compositionPrice({ sizeId: 'p', optionIds: ['f1'] }, SMOOTHIE_SIZES, FRUITS, 2)
      expect(price).toBe(2)
    })

    it('devrait compter les choix restants', () => {
      expect(remainingIncludedChoices({ sizeId: 'p', optionIds: [] }, SMOOTHIE_SIZES)).toBe(2)
      expect(remainingIncludedChoices({ sizeId: 'p', optionIds: ['f1'] }, SMOOTHIE_SIZES)).toBe(1)
      expect(remainingIncludedChoices({ sizeId: 'p', optionIds: ['f1', 'f2', 'f3'] }, SMOOTHIE_SIZES)).toBe(0)
    })

    it('ne devrait pas compter de quota sur une formule fixe', () => {
      expect(remainingIncludedChoices({ sizeId: 's1', optionIds: [] }, SIZES)).toBeNull()
    })

    it('devrait decrire les inclus et les supplements selon le quota', () => {
      const d = describeSelection({ sizeId: 'p', optionIds: ['f1', 'f2', 'f4'] }, SMOOTHIE_SIZES, FRUITS)
      expect(d.included).toEqual(['Banane', 'Pomme'])
      expect(d.extras).toEqual([{ name: 'Mangue', price: 1.5 }])
    })
  })

  describe('describeSelection', () => {
    it('devrait separer la formule standard des supplements', () => {
      const d = describeSelection(
        { sizeId: 's2', optionIds: ['o1', 'o2', 'o4'] },
        SIZES, OPTIONS,
      )
      expect(d.sizeName).toBe('Moyen')
      expect(d.included).toEqual(['Fraise', 'Kiwi'])
      expect(d.extras).toEqual([{ name: 'Mangue', price: 2 }])
    })

    it('devrait refleter le retrait d un ingredient de base', () => {
      const d = describeSelection({ sizeId: 's1', optionIds: ['o1'] }, SIZES, OPTIONS)
      expect(d.included).toEqual(['Fraise'])
      expect(d.extras).toEqual([])
    })
  })
})
