import { describe, it, expect } from 'vitest'
import { compositionUnit, compositionTitle } from '@/lib/composition-pricing'

/**
 * TESTS — Libellés du configurateur de composition.
 *
 * Régressions constatées à l'usage : le compteur annonçait « 1 plateau » sur un smoothie,
 * et le titre affichait « Smoothie à composer à composer » parce que le suffixe était
 * ajouté à un nom qui le contenait déjà.
 */

describe('unité de commande', () => {
  it('devrait servir un jus au verre, pas au plateau', () => {
    expect(compositionUnit('jus')).toBe('verre')
    expect(compositionUnit('smoothie')).toBe('verre')
  })

  it('devrait servir une soupe en portion', () => {
    expect(compositionUnit('soupe')).toBe('portion')
  })

  it('devrait servir les découpes au plateau', () => {
    expect(compositionUnit('fruits-decoupes')).toBe('plateau')
    expect(compositionUnit('legumes-decoupes')).toBe('plateau')
  })

  it('devrait retomber sur un terme neutre pour un type inconnu', () => {
    expect(compositionUnit('coffret')).toBe('article')
    expect(compositionUnit(null)).toBe('article')
    expect(compositionUnit(undefined)).toBe('article')
  })

  it('devrait ignorer la casse', () => {
    expect(compositionUnit('JUS')).toBe('verre')
    expect(compositionUnit('Fruits-Decoupes')).toBe('plateau')
  })
})

describe('titre du configurateur', () => {
  it('ne devrait pas repeter « à composer »', () => {
    expect(compositionTitle('Smoothie à composer')).toBe('Smoothie à composer')
    expect(compositionTitle('Smoothie à composer ')).toBe('Smoothie à composer ')
  })

  it('devrait ajouter le suffixe quand il manque', () => {
    expect(compositionTitle('Plateau de fruits découpés')).toBe('Plateau de fruits découpés à composer')
  })

  it('devrait ignorer la casse du suffixe', () => {
    expect(compositionTitle('Smoothie À COMPOSER')).toBe('Smoothie À COMPOSER')
  })
})
