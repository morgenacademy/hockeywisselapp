import { describe, expect, it } from 'vitest'
import {
  BLOKKEN_PER_KWART_KEUZES,
  KWART_SECONDEN,
  MAX_BLOKKEN_PER_KWART,
  MIN_BLOKKEN_PER_KWART,
  STANDAARD_BLOKKEN_PER_KWART,
  aantalBlokken,
  blokInKwart,
  blokSeconden,
  formatTijd,
  geldigeBlokkenPerKwart,
  secondenTotWissel,
  verstrekenMet,
  wisselsPerKwart,
} from '../clock'

/** De standaardindeling: drie blokken van 5:50 per kwart. */
const BLOKKEN_PER_KWART = STANDAARD_BLOKKEN_PER_KWART
const BLOK_SECONDEN = blokSeconden(BLOKKEN_PER_KWART)
const AANTAL_BLOKKEN = aantalBlokken(BLOKKEN_PER_KWART)

describe('verstrekenMet', () => {
  it('telt op echte snelheid gewoon de seconden', () => {
    expect(verstrekenMet(0, 1000, 1)).toBe(1)
    expect(verstrekenMet(10, 2500, 1)).toBe(12.5)
  })

  it('versnelt de klok met de factor', () => {
    expect(verstrekenMet(0, 1000, 60)).toBe(60)
    expect(verstrekenMet(0, 1000, 10)).toBe(10)
    // Een heel kwart op 60x duurt 17,5 echte seconden.
    expect(verstrekenMet(0, 17_500, 60)).toBe(KWART_SECONDEN)
  })

  it('loopt nooit voorbij het einde van een kwart', () => {
    expect(verstrekenMet(0, 60_000, 60)).toBe(KWART_SECONDEN)
    expect(verstrekenMet(KWART_SECONDEN, 5000, 1)).toBe(KWART_SECONDEN)
  })

  it('gaat niet achteruit bij een rare klokstand', () => {
    expect(verstrekenMet(20, -5000, 1)).toBe(20)
    expect(verstrekenMet(20, 1000, -3)).toBe(20)
  })

  it('telt pauzeren en hervatten niet dubbel, ook versneld niet', () => {
    // Drie echte seconden op 60x, dan pauze: de stand wordt vastgelegd.
    const naEerste = verstrekenMet(0, 3000, 60)
    expect(naEerste).toBe(180)
    // Hervatten begint vanaf die stand, niet vanaf nul.
    const naTweede = verstrekenMet(naEerste, 2000, 60)
    expect(naTweede).toBe(300)
    // Even lang doorlopen zonder pauze geeft hetzelfde.
    expect(verstrekenMet(0, 5000, 60)).toBe(naTweede)
  })

  it('houdt de blokindeling kloppend bij versnelde tijd', () => {
    // Op 60x is een blok 350/60 = 5,83 echte seconden.
    const halverwegeBlok2 = verstrekenMet(0, 8000, 60)
    expect(blokInKwart(halverwegeBlok2, BLOKKEN_PER_KWART)).toBe(1)
    expect(secondenTotWissel(halverwegeBlok2, BLOKKEN_PER_KWART)).toBeGreaterThan(0)
    expect(secondenTotWissel(halverwegeBlok2, BLOKKEN_PER_KWART)).toBeLessThanOrEqual(BLOK_SECONDEN)
  })
})

describe('wedstrijdindeling', () => {
  it('deelt elk kwart in drie gelijke blokken', () => {
    expect(BLOKKEN_PER_KWART * BLOK_SECONDEN).toBe(KWART_SECONDEN)
    expect(AANTAL_BLOKKEN).toBe(12)
    expect(formatTijd(BLOK_SECONDEN)).toBe('5:50')
  })

  it('telt binnen een blok af naar het wisselmoment', () => {
    expect(secondenTotWissel(0, BLOKKEN_PER_KWART)).toBe(BLOK_SECONDEN)
    expect(secondenTotWissel(BLOK_SECONDEN - 10, BLOKKEN_PER_KWART)).toBe(10)
    expect(secondenTotWissel(BLOK_SECONDEN, BLOKKEN_PER_KWART)).toBe(BLOK_SECONDEN)
  })
})

describe('een zelfgekozen wisselritme', () => {
  it('deelt elk kwart in gelijke blokken, hoeveel het er ook zijn', () => {
    for (const perKwart of BLOKKEN_PER_KWART_KEUZES) {
      expect(perKwart * blokSeconden(perKwart)).toBe(KWART_SECONDEN)
      expect(aantalBlokken(perKwart)).toBe(4 * perKwart)
    }
  })

  it('noemt de minuten die de coach op het scherm ziet', () => {
    expect(formatTijd(blokSeconden(1))).toBe('17:30')
    expect(formatTijd(blokSeconden(2))).toBe('8:45')
    expect(formatTijd(blokSeconden(3))).toBe('5:50')
    expect(formatTijd(blokSeconden(4))).toBe('4:23')
  })

  it('telt de wissels binnen een kwart, dus zonder die in de rust', () => {
    expect(wisselsPerKwart(1)).toBe(0)
    expect(wisselsPerKwart(3)).toBe(2)
  })

  it('legt de blokgrenzen op de gekozen momenten', () => {
    // Eén blok per kwart: pas de rust is een wisselmoment.
    expect(blokInKwart(0, 1)).toBe(0)
    expect(blokInKwart(KWART_SECONDEN - 1, 1)).toBe(0)
    expect(secondenTotWissel(0, 1)).toBe(KWART_SECONDEN)
    // Twee blokken: halverwege het kwart.
    expect(blokInKwart(524, 2)).toBe(0)
    expect(blokInKwart(525, 2)).toBe(1)
    expect(secondenTotWissel(500, 2)).toBe(25)
  })

  it('houdt een rare waarde binnen wat de app aankan', () => {
    expect(geldigeBlokkenPerKwart(undefined)).toBe(STANDAARD_BLOKKEN_PER_KWART)
    expect(geldigeBlokkenPerKwart('twee')).toBe(STANDAARD_BLOKKEN_PER_KWART)
    expect(geldigeBlokkenPerKwart(0)).toBe(MIN_BLOKKEN_PER_KWART)
    expect(geldigeBlokkenPerKwart(99)).toBe(MAX_BLOKKEN_PER_KWART)
    expect(geldigeBlokkenPerKwart(2)).toBe(2)
  })
})
