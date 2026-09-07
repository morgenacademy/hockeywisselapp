import { describe, expect, it } from 'vitest'
import { aanbevolenBlokkenPerKwart } from '../bezetting'
import { BLOKKEN_PER_KWART_KEUZES, aantalBlokken } from '../clock'
import { AANTAL_VELDPOSITIES, POSITIE_CODES, type Positie } from '../formation'
import { SELECTIE, magOpPositie } from '../players'
import { maakRooster, opstellingMet, type Opstelling, type Rooster } from '../schedule'

const sterkteAchter = SELECTIE.filter((s) => magOpPositie(s, 'LV')).map((s) => s.id)
const sterkteMidden = SELECTIE.filter((s) => magOpPositie(s, 'CM')).map((s) => s.id)

function rooster(aantalAanwezig: number, extra: Partial<Parameters<typeof maakRooster>[0]> = {}): Rooster {
  const aanwezigen = SELECTIE.slice(0, aantalAanwezig)
  return maakRooster({
    aanwezigen,
    keeperId: aanwezigen[0].id,
    sterkteAchter: sterkteAchter.filter((id) => aanwezigen.some((a) => a.id === id)),
    sterkteMidden: sterkteMidden.filter((id) => aanwezigen.some((a) => a.id === id)),
    ...extra,
  })
}

/**
 * Handmatig ingrijpen is niet "een voorkeurtje meegeven": wat de coach neerzet
 * moet er ook echt zo komen te staan, en de rest van dat blok moet met rust
 * gelaten worden. Deze twee eisen komen recht uit de eerste wedstrijd waarin de
 * app langs de lijn is gebruikt.
 */
describe('de coach zet zelf een speelster neer', () => {
  it('ruilt precies twee plekken als ze al in het veld stond', () => {
    const opstelling: Opstelling = { LV: 'a', CV: 'b', LB: 'c' }
    expect(opstellingMet(opstelling, 'LV', 'c')).toEqual({ LV: 'c', CV: 'b', LB: 'a' })
  })

  it('zet wie er stond op de bank als de invaller van de bank kwam', () => {
    const opstelling: Opstelling = { LV: 'a', CV: 'b' }
    expect(opstellingMet(opstelling, 'LV', 'z')).toEqual({ LV: 'z', CV: 'b' })
  })

  it('laat een lege plek achter waar zij vandaan kwam', () => {
    const opstelling: Opstelling = { LV: 'a', CV: 'b' }
    // Niemand op LV, dus b verhuist en CV blijft leeg.
    expect(opstellingMet({ CV: 'b' }, 'LV', 'b')).toEqual({ LV: 'b' })
    expect(opstellingMet(opstelling, 'LV', 'a')).toEqual(opstelling)
  })

  it('haalt een plek leeg zonder de rest aan te raken', () => {
    expect(opstellingMet({ LV: 'a', CV: 'b' }, 'LV', null)).toEqual({ CV: 'b' })
  })

  it('verandert niets anders in het blok dat is vastgezet', () => {
    // Zo werkt het scherm: het neemt de opstelling zoals hij op het veld staat,
    // verwerkt die ene ruil en zet het hele blok vast.
    const basis = rooster(14)
    const blok = 4
    const voor = basis.blokken[blok].opstelling
    const erin = basis.blokken[blok].bank[0]
    const nieuw = opstellingMet(voor, 'RM', erin)

    const na = rooster(14, { vastgezet: { [blok]: nieuw } })

    expect(na.blokken[blok].opstelling).toEqual(nieuw)
    // Alleen RM en de plek waar de bankspeelster voor terugkwam mogen anders zijn.
    const veranderd = POSITIE_CODES.filter((p) => voor[p] !== na.blokken[blok].opstelling[p])
    expect(veranderd).toEqual(['RM'])
  })

  it('zet ook een speelster neer die daar normaal niet centraal kan staan', () => {
    // Kate Janssen (p05) speelt verdediging maar kan niet centraal. De app zou
    // haar daar nooit zelf neerzetten; de coach mag het wel.
    const basis = rooster(14)
    const blok = 2
    expect(magOpPositie(SELECTIE[4], 'LV')).toBe(false)

    const nieuw = opstellingMet(basis.blokken[blok].opstelling, 'LV', 'p05')
    const na = rooster(14, { vastgezet: { [blok]: nieuw } })

    expect(na.blokken[blok].opstelling.LV).toBe('p05')
    // En het blijft zichtbaar dat het een noodgreep is.
    expect(na.blokken[blok].waarschuwingen.some((w) => w.includes('Noodbezetting'))).toBe(true)
  })

  it('laat de blokken erna gewoon doorlopen met een volle opstelling', () => {
    const basis = rooster(14)
    const nieuw = opstellingMet(basis.blokken[3].opstelling, 'SP', basis.blokken[3].bank[0])
    const na = rooster(14, { vastgezet: { 3: nieuw } })

    for (const blok of na.blokken) {
      const bezet = POSITIE_CODES.map((p) => blok.opstelling[p]).filter(Boolean)
      expect(bezet).toHaveLength(AANTAL_VELDPOSITIES)
      expect(new Set(bezet).size).toBe(AANTAL_VELDPOSITIES)
    }
  })
})

describe('het wisselritme dat de coach kiest', () => {
  it('levert bij elke keuze een volledig rooster', () => {
    for (const perKwart of BLOKKEN_PER_KWART_KEUZES) {
      for (const aanwezig of [11, 13, 16]) {
        const r = rooster(aanwezig, { blokkenPerKwart: perKwart })
        expect(r.blokken, `${aanwezig} aanwezig, ${perKwart} per kwart`).toHaveLength(
          aantalBlokken(perKwart),
        )
        for (const blok of r.blokken) {
          const bezet = POSITIE_CODES.map((p) => blok.opstelling[p]).filter(Boolean) as Positie[]
          expect(bezet).toHaveLength(AANTAL_VELDPOSITIES)
        }
      }
    }
  })

  it('houdt de speeltijd binnen één blok verschil, hoe vaak je ook wisselt', () => {
    for (const perKwart of BLOKKEN_PER_KWART_KEUZES) {
      for (const aanwezig of [12, 14, 16]) {
        const waarden = Object.values(rooster(aanwezig, { blokkenPerKwart: perKwart }).gespeeld)
        expect(
          Math.max(...waarden) - Math.min(...waarden),
          `${aanwezig} aanwezig, ${perKwart} per kwart`,
        ).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('het advies over hoe vaak je wisselt', () => {
  it('adviseert niet te wisselen als er niemand op de bank zit', () => {
    expect(aanbevolenBlokkenPerKwart(10)).toBe(1)
    expect(aanbevolenBlokkenPerKwart(9)).toBe(1)
  })

  it('adviseert vaak wisselen bij één wisselspeelster', () => {
    // Eén invalster op elf: pas na elf blokken is iedereen een keer aan de
    // beurt geweest, dus drie blokken per kwart -- 2x per kwart.
    expect(aanbevolenBlokkenPerKwart(11)).toBe(3)
  })

  it('adviseert rustiger wisselen naarmate er meer bank is', () => {
    expect(aanbevolenBlokkenPerKwart(12)).toBe(2)
    expect(aanbevolenBlokkenPerKwart(13)).toBe(2)
    expect(aanbevolenBlokkenPerKwart(15)).toBe(2)
  })

  it('zet niemand een heel kwart aan de kant en blijft binnen de keuzes', () => {
    for (let veld = 10; veld <= 20; veld++) {
      const advies = aanbevolenBlokkenPerKwart(veld)
      expect(BLOKKEN_PER_KWART_KEUZES).toContain(advies)
      if (veld > AANTAL_VELDPOSITIES) expect(advies).toBeGreaterThanOrEqual(2)
    }
  })
})
