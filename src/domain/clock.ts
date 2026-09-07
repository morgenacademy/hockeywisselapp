/**
 * Wedstrijdindeling: 4 kwarten van 17:30, elk kwart in gelijke blokken.
 *
 * Hoeveel blokken er in een kwart gaan is geen vaste waarde meer maar een
 * keuze van de coach. Eén blok per kwart betekent dat je alleen in de rust
 * wisselt; vier blokken betekent drie wisselmomenten binnen elk kwart. De app
 * doet een voorstel op basis van de opkomst (zie `aanbevolenBlokkenPerKwart`),
 * de coach mag er altijd overheen.
 *
 * Alle functies hieronder krijgen dat aantal daarom als argument mee. Bewust
 * zonder standaardwaarde: een vergeten argument zou dan stilletjes een andere
 * indeling opleveren dan de coach heeft ingesteld, en dat zie je pas als de
 * klok op het verkeerde moment gaat.
 */

export const AANTAL_KWARTEN = 4
export const KWART_SECONDEN = 17 * 60 + 30 // 1050
export const WEDSTRIJD_SECONDEN = AANTAL_KWARTEN * KWART_SECONDEN // 4200

/** Waar de app op uitkomt als er niets gekozen is: drie blokken van 5:50. */
export const STANDAARD_BLOKKEN_PER_KWART = 3

/** Alleen in de rust wisselen (1) tot en met drie keer per kwart (4). */
export const MIN_BLOKKEN_PER_KWART = 1
export const MAX_BLOKKEN_PER_KWART = 4

/** De keuzes die het scherm aanbiedt, van rustig naar druk. */
export const BLOKKEN_PER_KWART_KEUZES: readonly number[] = [1, 2, 3, 4]

/** Houdt een (opgeslagen of getikte) waarde binnen wat de app aankan. */
export function geldigeBlokkenPerKwart(waarde: unknown): number {
  const getal = Math.round(Number(waarde))
  if (!Number.isFinite(getal)) return STANDAARD_BLOKKEN_PER_KWART
  return Math.min(MAX_BLOKKEN_PER_KWART, Math.max(MIN_BLOKKEN_PER_KWART, getal))
}

/** Totaal aantal blokken in de wedstrijd. */
export function aantalBlokken(blokkenPerKwart: number): number {
  return AANTAL_KWARTEN * blokkenPerKwart
}

/** Hoe lang duurt één blok -- oftewel: hoeveel minuten zit er tussen twee wissels? */
export function blokSeconden(blokkenPerKwart: number): number {
  return KWART_SECONDEN / blokkenPerKwart
}

/**
 * Hoe vaak wissel je *binnen* een kwart?
 *
 * De wissel op de kwartgrens telt niet mee: die valt in de rust, daar staat de
 * klok stil. Dit is dus het getal waar de coach het over heeft als hij zegt
 * "één keer per kwart wisselen".
 */
export function wisselsPerKwart(blokkenPerKwart: number): number {
  return blokkenPerKwart - 1
}

/** Kwart (1-based) waarin dit blok valt. */
export function kwartVanBlok(blok: number, blokkenPerKwart: number): number {
  return Math.floor(blok / blokkenPerKwart) + 1
}

/** Is dit blok het eerste van een kwart? Dan valt de wissel in de rust. */
export function isKwartStart(blok: number, blokkenPerKwart: number): boolean {
  return blok % blokkenPerKwart === 0
}

/** Blokindex voor een verstreken tijd binnen een kwart. */
export function blokInKwart(secondenInKwart: number, blokkenPerKwart: number): number {
  const index = Math.floor(secondenInKwart / blokSeconden(blokkenPerKwart))
  return Math.min(index, blokkenPerKwart - 1)
}

export function blokIndex(kwart: number, blokBinnenKwart: number, blokkenPerKwart: number): number {
  return (kwart - 1) * blokkenPerKwart + blokBinnenKwart
}

/** Seconden tot het einde van het huidige blok. */
export function secondenTotWissel(secondenInKwart: number, blokkenPerKwart: number): number {
  const grens = (blokInKwart(secondenInKwart, blokkenPerKwart) + 1) * blokSeconden(blokkenPerKwart)
  return Math.max(0, grens - secondenInKwart)
}

export function formatTijd(seconden: number): string {
  const veilig = Math.max(0, Math.round(seconden))
  const m = Math.floor(veilig / 60)
  const s = veilig % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Speeltijd in seconden voor een aantal gespeelde blokken. */
export function blokkenNaarSeconden(blokken: number, blokkenPerKwart: number): number {
  return blokken * blokSeconden(blokkenPerKwart)
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
