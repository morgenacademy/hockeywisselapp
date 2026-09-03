import { describe, expect, it } from 'vitest'
import {
  AANTAL_BLOKKEN,
  BLOKKEN_PER_KWART,
  BLOK_SECONDEN,
  KWART_SECONDEN,
  blokInKwart,
  formatTijd,
  secondenTotWissel,
  verstrekenMet,
} from '../clock'

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
    expect(blokInKwart(halverwegeBlok2)).toBe(1)
    expect(secondenTotWissel(halverwegeBlok2)).toBeGreaterThan(0)
    expect(secondenTotWissel(halverwegeBlok2)).toBeLessThanOrEqual(BLOK_SECONDEN)
  })
})

describe('wedstrijdindeling', () => {
  it('deelt elk kwart in drie gelijke blokken', () => {
    expect(BLOKKEN_PER_KWART * BLOK_SECONDEN).toBe(KWART_SECONDEN)
    expect(AANTAL_BLOKKEN).toBe(12)
    expect(formatTijd(BLOK_SECONDEN)).toBe('5:50')
  })

  it('telt binnen een blok af naar het wisselmoment', () => {
    expect(secondenTotWissel(0)).toBe(BLOK_SECONDEN)
    expect(secondenTotWissel(BLOK_SECONDEN - 10)).toBe(10)
    expect(secondenTotWissel(BLOK_SECONDEN)).toBe(BLOK_SECONDEN)
  })
})
