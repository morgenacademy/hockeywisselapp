import { describe, expect, it } from 'vitest'
import { KWART_SECONDEN, blokIndex, blokInKwart } from '../../domain/clock'
import { POSITIE_CODES } from '../../domain/formation'
import type { Blok } from '../../domain/schedule'
import { herindeel, standaardStand, type WedstrijdStand } from '../matchStore'

/** Twaalf blokken waarin te zien is welk blok het is: iedereen heet `b<index>-<positie>`. */
function blokkenVan(aantal: number): Blok[] {
  return Array.from({ length: aantal }, (_, index) => ({
    index,
    opstelling: Object.fromEntries(POSITIE_CODES.map((p) => [p, `b${index}-${p}`])),
    bank: [],
    waarschuwingen: [],
  }))
}

function stand(extra: Partial<WedstrijdStand> = {}): WedstrijdStand {
  return { ...standaardStand(), keeperId: 'keeper', ...extra }
}

/**
 * Een bloknummer betekent iets anders zodra een kwart uit twee in plaats van
 * drie blokken bestaat. Alles wat aan zo'n nummer hangt moet dus mee verhuizen,
 * anders staat de opstelling van blok 3 ineens in de rust van het tweede kwart
 * -- of telt de speeltijd van het eerste kwart dubbel.
 */
describe('het wisselritme wijzigen', () => {
  it('doet niets als het ritme hetzelfde blijft', () => {
    expect(herindeel(stand({ blokkenPerKwart: 3 }), 3, blokkenVan(12), 0)).toEqual({})
  })

  it('bevriest precies de blokken die al gespeeld zijn', () => {
    // Kwart 2 gaat beginnen: het eerste kwart is helemaal gespeeld.
    const huidig = stand({ blokkenPerKwart: 3, kwart: 2, secondenInKwart: 0 })
    const na = herindeel(huidig, 2, blokkenVan(12), 0)

    expect(na.blokkenPerKwart).toBe(2)
    expect(na.bevrorenTot).toBe(blokIndex(2, blokInKwart(0, 2), 2))
    expect(na.bevrorenBlokken).toHaveLength(2)
    // Elk nieuw blok pakt het oude blok dat op dat moment liep.
    expect(na.bevrorenBlokken?.map((b) => b.opstelling.LB)).toEqual(['b0-LB', 'b2-LB'])
    // En ze zijn hernummerd, anders klopt de plek in het rooster niet meer.
    expect(na.bevrorenBlokken?.map((b) => b.index)).toEqual([0, 1])
  })

  it('houdt de gespeelde blokken bij de nieuwe indeling', () => {
    const huidig = stand({ blokkenPerKwart: 3, kwart: 3, secondenInKwart: 0 })
    const na = herindeel(huidig, 2, blokkenVan(12), 0)

    expect(na.bevrorenTot).toBe(4)
    // Vier blokken van tien plekken; elke naam komt één keer voor.
    expect(Object.keys(na.gespeeldVoor ?? {})).toHaveLength(4 * POSITIE_CODES.length)
    expect(Object.values(na.gespeeldVoor ?? {}).every((n) => n === 1)).toBe(true)
  })

  it('bevriest niets als er nog geen bal is geslagen', () => {
    const na = herindeel(stand({ blokkenPerKwart: 3 }), 4, blokkenVan(12), 0)
    expect(na.bevrorenTot).toBe(0)
    expect(na.bevrorenBlokken).toEqual([])
    expect(na.gespeeldVoor).toEqual({})
  })

  it('verhuist een vastgezette opstelling naar hetzelfde moment', () => {
    // Blok 3 is bij drie blokken per kwart de start van het tweede kwart; bij
    // twee blokken per kwart is dat blok 2.
    const huidig = stand({ blokkenPerKwart: 3, vastgezet: { 3: { LV: 'nora' } } })
    const na = herindeel(huidig, 2, blokkenVan(12), 0)
    expect(na.vastgezet).toEqual({ 2: { LV: 'nora' } })
  })

  it('zet een vastgezette opstelling hoogstens één keer terug', () => {
    // Van drie naar vier blokken vallen er twee nieuwe blokken over hetzelfde
    // oude blok. Zou de opstelling dan twee keer terugkomen, dan doet het extra
    // wisselmoment dat de coach net heeft aangezet stilletjes niets.
    const huidig = stand({ blokkenPerKwart: 3, vastgezet: { 1: { LV: 'nora' } } })
    const na = herindeel(huidig, 4, blokkenVan(12), 0)
    expect(Object.keys(na.vastgezet ?? {})).toHaveLength(1)
  })

  it('kondigt het lopende blok niet opnieuw aan', () => {
    // Zonder dit gaat het belletje meteen af zodra je het ritme wijzigt.
    const huidig = stand({ blokkenPerKwart: 3, kwart: 4, secondenInKwart: KWART_SECONDEN / 2 })
    const na = herindeel(huidig, 2, blokkenVan(12), KWART_SECONDEN / 2)
    expect(na.alarmTot).toBe(na.bevrorenTot)
  })
})
