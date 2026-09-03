/** Wedstrijdindeling: 4 kwarten van 17:30, elk kwart in 3 blokken van 5:50. */

export const AANTAL_KWARTEN = 4
export const BLOKKEN_PER_KWART = 3
export const KWART_SECONDEN = 17 * 60 + 30 // 1050
export const BLOK_SECONDEN = KWART_SECONDEN / BLOKKEN_PER_KWART // 350 = 5:50
export const AANTAL_BLOKKEN = AANTAL_KWARTEN * BLOKKEN_PER_KWART // 12
export const WEDSTRIJD_SECONDEN = AANTAL_KWARTEN * KWART_SECONDEN // 4200

/** Kwart (1-based) waarin dit blok valt. */
export function kwartVanBlok(blok: number): number {
  return Math.floor(blok / BLOKKEN_PER_KWART) + 1
}

/** Is dit blok het eerste van een kwart? Dan valt de wissel in de rust. */
export function isKwartStart(blok: number): boolean {
  return blok % BLOKKEN_PER_KWART === 0
}

/** Blokindex voor een verstreken tijd binnen een kwart. */
export function blokInKwart(secondenInKwart: number): number {
  const index = Math.floor(secondenInKwart / BLOK_SECONDEN)
  return Math.min(index, BLOKKEN_PER_KWART - 1)
}

export function blokIndex(kwart: number, blokBinnenKwart: number): number {
  return (kwart - 1) * BLOKKEN_PER_KWART + blokBinnenKwart
}

/** Seconden tot het einde van het huidige blok. */
export function secondenTotWissel(secondenInKwart: number): number {
  const grens = (blokInKwart(secondenInKwart) + 1) * BLOK_SECONDEN
  return Math.max(0, grens - secondenInKwart)
}

export function formatTijd(seconden: number): string {
  const veilig = Math.max(0, Math.round(seconden))
  const m = Math.floor(veilig / 60)
  const s = veilig % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Speeltijd in seconden voor een aantal gespeelde blokken. */
export function blokkenNaarSeconden(blokken: number): number {
  return blokken * BLOK_SECONDEN
}

/**
 * Verstreken tijd binnen een kwart, met een snelheidsfactor.
 *
 * De factor is er voor de oefenwedstrijd in de testversie: bij 60 duurt een
 * wedstrijd ruim een minuut in plaats van 70. In de echte app staat hij altijd
 * op 1. Deze berekening staat bewust op één plek, want de klok, het pauzeren én
 * "volgend blok" gebruiken hem alle drie -- zou de factor er maar bij twee van
 * de drie in zitten, dan springt de tijd zodra je pauzeert.
 *
 * @param basis      al vastgelegde seconden binnen dit kwart
 * @param sindsMs    echte milliseconden sinds de klok startte
 * @param snelheid   1 is normaal; hoger loopt sneller
 */
export function verstrekenMet(basis: number, sindsMs: number, snelheid: number): number {
  const gelopen = Math.max(0, sindsMs) * Math.max(0, snelheid) / 1000
  return Math.min(basis + gelopen, KWART_SECONDEN)
}
