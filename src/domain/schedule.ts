import { AANTAL_BLOKKEN } from './clock'
import {
  AANTAL_VELDPOSITIES,
  POSITIE_CODES,
  positieInfo,
  type Linie,
  type Positie,
} from './formation'
import { inLinie, magOpPositie, type Speelster } from './players'
import { VERBODEN, hongaars, isVolledigTeBezetten } from './assignment'

export type Opstelling = Partial<Record<Positie, string>>

export interface Blok {
  index: number
  opstelling: Opstelling
  bank: string[]
  /** Zichtbare afwijkingen: buiten de linie, onvulbare sleutelpositie, lege plek. */
  waarschuwingen: string[]
}

export interface RoosterInvoer {
  /** Alle aanwezige speelsters, keeper inbegrepen. */
  aanwezigen: Speelster[]
  keeperId: string
  /** Sterkte-volgorde (ids) voor LV/CV; bovenaan staat het vaakst centraal. */
  sterkteAchter?: string[]
  /** Sterkte-volgorde (ids) voor CM. */
  sterkteMidden?: string[]
  /** Geblesseerd of vertrokken: speelt vanaf `vanafBlok` niet meer mee. */
  uitgevallen?: string[]
  /** Handmatig vastgezette posities per blok. */
  vastgezet?: Record<number, Opstelling>
  /** Herbereken vanaf dit blok; eerdere blokken blijven zoals ze waren. */
  vanafBlok?: number
  /** Al gespeelde blokken per speelster bij een herberekening. */
  gespeeldVoor?: Record<string, number>
  /** De blokken vóór `vanafBlok`, die ongewijzigd overgenomen worden. */
  eerdereBlokken?: Blok[]
}

export interface Rooster {
  keeperId: string
  blokken: Blok[]
  /** Gespeelde blokken per speelster-id; de keeper staat er niet in. */
  gespeeld: Record<string, number>
  waarschuwingen: string[]
}

/** Weging van het scoremodel; los benoemd zodat de tests eraan kunnen refereren. */
const GEWICHT = {
  continuiteit: 3,
  inLinie: 2,
  buitenLinie: -4,
  sterkte: 1,
  spreiding: 1,
}

interface Context {
  /** Gespeelde blokken per speelster. */
  gespeeld: Map<string, number>
  /** Laatste blok waarin ze op de bank zat (-1 = nog nooit). */
  laatsteRust: Map<string, number>
  /** Hoe vaak ze al op elke positie stond. */
  positieTeller: Map<string, Map<Positie, number>>
  /** Opstelling van het vorige blok, voor continuïteit. */
  vorigePositie: Map<string, Positie>
  sterkteRang: Map<Linie, Map<string, number>>
  sterkteOmvang: Map<Linie, number>
}

/**
 * Mag deze speelster hier staan?
 *
 * `streng` eist bovendien haar eigen linie. Sleutelposities (LV, CV, CM)
 * eisen die linie altijd -- daar wordt nooit van afgeweken. Bij de overige
 * zeven posities is buiten je linie spelen het laatste redmiddel, en dat komt
 * alleen in beeld als het strenge schema niet rond te krijgen is.
 */
function mag(speelster: Speelster, positie: Positie, streng: boolean): boolean {
  if (!magOpPositie(speelster, positie)) return false
  return streng ? inLinie(speelster, positie) : true
}

function kandidatenMatrix(veld: Speelster[], streng: boolean): number[][] {
  return POSITIE_CODES.map((positie) => {
    const rij: number[] = []
    veld.forEach((speelster, index) => {
      if (mag(speelster, positie, streng)) rij.push(index)
    })
    return rij
  })
}

/**
 * Kan deze groep alle tien de veldposities tegelijk bezetten, elk binnen haar
 * eigen linie? Dit is de guard van de rustrotatie: het is niet genoeg om te
 * kijken of de drie centrale plekken te vullen zijn, want je kunt net zo goed
 * te weinig verdedigers overhouden voor linksback en rechtsback.
 */
export function isBlokTeBezetten(veld: Speelster[], streng = true): boolean {
  if (veld.length < AANTAL_VELDPOSITIES) return false
  return isVolledigTeBezetten(AANTAL_VELDPOSITIES, kandidatenMatrix(veld, streng), veld.length)
}

/** Alleen de drie sleutelposities; gebruikt door de controle vooraf. */
export function heeftGeldigeSleutelbezetting(veld: Speelster[]): boolean {
  const sleutels: Positie[] = ['LV', 'CV', 'CM']
  const kandidaten = sleutels.map((positie) => {
    const rij: number[] = []
    veld.forEach((speelster, index) => {
      if (magOpPositie(speelster, positie)) rij.push(index)
    })
    return rij
  })
  return isVolledigTeBezetten(sleutels.length, kandidaten, veld.length)
}

function score1(speelster: Speelster, positie: Positie, ctx: Context): number {
  let score = 0

  if (ctx.vorigePositie.get(speelster.id) === positie) score += GEWICHT.continuiteit
  score += inLinie(speelster, positie) ? GEWICHT.inLinie : GEWICHT.buitenLinie

  const info = positieInfo(positie)
  if (info.sleutel) {
    const rangen = ctx.sterkteRang.get(info.linie)
    const omvang = ctx.sterkteOmvang.get(info.linie) ?? 0
    const rang = rangen?.get(speelster.id)
    if (rang !== undefined && omvang > 0) {
      // Bewust een kleine bonus: de bovenste namen staan merkbaar vaker
      // centraal, maar de onderste komen er ook. Speeltijd blijft leidend,
      // want de rustrotatie gaat hier al aan vooraf.
      score += GEWICHT.sterkte * ((omvang - rang) / omvang)
    }
  }

  const alGestaan = ctx.positieTeller.get(speelster.id)?.get(positie) ?? 0
  score += GEWICHT.spreiding * (1 / (1 + alGestaan))

  return score
}

type Niveau = 'streng' | 'soepel' | 'nood'

/** Extra kosten voor een noodbezetting: verliest altijd van elke geldige keuze. */
const NOOD_KOSTEN = 1000

function toegestaan(speelster: Speelster, positie: Positie, niveau: Niveau): boolean {
  switch (niveau) {
    case 'streng':
      return magOpPositie(speelster, positie) && inLinie(speelster, positie)
    case 'soepel':
      return magOpPositie(speelster, positie)
    case 'nood':
      return true
  }
}

/**
 * Vult alle posities in één keer via een koppeling met maximale score, zodat
 * de beste totaaloplossing gekozen wordt in plaats van de beste keuze per plek.
 *
 * Drie niveaus, van streng naar soepel:
 *  - `streng`  iedereen binnen haar eigen linie;
 *  - `soepel`  buiten je linie mag, behalve op LV, CV en CM;
 *  - `nood`    ook een sleutelpositie wordt gevuld, met een luide markering.
 *
 * Het derde niveau komt alleen in beeld als er letterlijk niemand aanwezig is
 * die de centrale plek aankan. Elf speelsters op het veld met een gemarkeerde
 * noodbezetting is dan beter dan acht speelsters en drie lege plekken.
 */
function verdeelPosities(
  veld: Speelster[],
  vast: Opstelling,
  ctx: Context,
): { opstelling: Opstelling; nood: Positie[]; leeg: Positie[] } {
  const opstelling: Opstelling = {}
  const bezetteIds = new Set<string>()
  const openPosities: Positie[] = []

  for (const positie of POSITIE_CODES) {
    const id = vast[positie]
    if (id && veld.some((s) => s.id === id) && !bezetteIds.has(id)) {
      opstelling[positie] = id
      bezetteIds.add(id)
    } else {
      openPosities.push(positie)
    }
  }

  const beschikbaar = veld.filter((s) => !bezetteIds.has(s.id))
  const nood: Positie[] = []
  const leeg: Positie[] = []

  if (openPosities.length === 0) return { opstelling, nood, leeg }

  const past = (niveau: Niveau): boolean =>
    isVolledigTeBezetten(
      openPosities.length,
      openPosities.map((positie) => {
        const rij: number[] = []
        beschikbaar.forEach((s, i) => {
          if (toegestaan(s, positie, niveau)) rij.push(i)
        })
        return rij
      }),
      beschikbaar.length,
    )

  const niveau: Niveau = past('streng') ? 'streng' : past('soepel') ? 'soepel' : 'nood'

  // Vierkant maken: even veel rijen als kolommen, met loze plekken als er meer
  // posities dan beschikbare speelsters zijn.
  const n = Math.max(openPosities.length, beschikbaar.length)
  const kosten: number[][] = []
  for (let rij = 0; rij < n; rij++) {
    const regel: number[] = []
    for (let kolom = 0; kolom < n; kolom++) {
      const positie = openPosities[rij]
      const speelster = beschikbaar[kolom]
      if (positie === undefined || speelster === undefined) {
        regel.push(0)
      } else if (!toegestaan(speelster, positie, niveau)) {
        regel.push(VERBODEN)
      } else if (!magOpPositie(speelster, positie)) {
        // Noodbezetting: nog steeds de best passende speelster kiezen, dus de
        // gewone score telt mee bovenop de boete.
        regel.push(NOOD_KOSTEN - score1(speelster, positie, ctx))
      } else {
        regel.push(-score1(speelster, positie, ctx))
      }
    }
    kosten.push(regel)
  }

  const toewijzing = hongaars(kosten)
  openPosities.forEach((positie, rij) => {
    const kolom = toewijzing[rij]
    const speelster = kolom >= 0 ? beschikbaar[kolom] : undefined
    if (!speelster || kosten[rij][kolom] >= VERBODEN) {
      leeg.push(positie)
      return
    }
    opstelling[positie] = speelster.id
    if (!magOpPositie(speelster, positie)) nood.push(positie)
  })

  return { opstelling, nood, leeg }
}

/**
 * Wie rust dit blok?
 *
 * Speeltijd wint, en dat is een harde regel: wie de meeste blokken heeft
 * gespeeld gaat naar de bank, ook als dat betekent dat er straks iemand buiten
 * haar linie moet staan. Alleen tussen speelsters die er even veel op hebben
 * zitten is er keuzevrijheid, en die gebruikt de app om het blok netjes rond te
 * krijgen: iedereen in haar eigen linie, en niemand twee blokken op rij op de
 * bank. Lukt dat binnen die groep niet, dan gaat de speeltijd vóór en markeert
 * `bouwBlok` de afwijking.
 */
function kiesRusters(
  beschikbaar: Speelster[],
  aantalRust: number,
  vast: Set<string>,
  blok: number,
  ctx: Context,
): Speelster[] {
  if (aantalRust <= 0) return []

  const gespeeld = (s: Speelster) => ctx.gespeeld.get(s.id) ?? 0
  const kandidaten = beschikbaar
    .filter((s) => !vast.has(s.id))
    .slice()
    .sort((a, b) => {
      const gespeeldVerschil = gespeeld(b) - gespeeld(a)
      if (gespeeldVerschil !== 0) return gespeeldVerschil
      // Wie het langst geleden rustte, is nu aan de beurt.
      const rustVerschil = (ctx.laatsteRust.get(a.id) ?? -1) - (ctx.laatsteRust.get(b.id) ?? -1)
      if (rustVerschil !== 0) return rustVerschil
      return a.id.localeCompare(b.id)
    })

  if (kandidaten.length <= aantalRust) return kandidaten.slice(0, aantalRust)

  // Iedereen die méér gespeeld heeft dan de laatste bankplek waard is, rust
  // sowieso. Binnen de groep die daar precies op zit valt te kiezen.
  const drempel = gespeeld(kandidaten[aantalRust - 1])
  const verplicht = kandidaten.filter((s) => gespeeld(s) > drempel)
  const keuze = kandidaten.filter((s) => gespeeld(s) === drempel)

  const probeer = (streng: boolean, weerVorigBlok: boolean): Speelster[] | null => {
    const gekozen = [...verplicht]
    const gekozenIds = new Set(gekozen.map((s) => s.id))
    for (const kandidaat of keuze) {
      if (gekozen.length === aantalRust) break
      if (weerVorigBlok && ctx.laatsteRust.get(kandidaat.id) === blok - 1) continue
      const overblijvend = beschikbaar.filter(
        (s) => s.id !== kandidaat.id && !gekozenIds.has(s.id),
      )
      if (!isBlokTeBezetten(overblijvend, streng)) continue
      gekozen.push(kandidaat)
      gekozenIds.add(kandidaat.id)
    }
    return gekozen.length === aantalRust ? gekozen : null
  }

  const varianten = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ] as const
  for (const [streng, weerVorigBlok] of varianten) {
    const gekozen = probeer(streng, weerVorigBlok)
    if (gekozen) return gekozen
  }

  return kandidaten.slice(0, aantalRust)
}

function bouwBlok(
  blokIndex: number,
  veldSpeelsters: Speelster[],
  vastgezet: Opstelling,
  ctx: Context,
): Blok {
  const perId = new Map(veldSpeelsters.map((s) => [s.id, s]))
  const waarschuwingen: string[] = []

  // Handmatig vastgezette speelsters staan vast en spelen dus sowieso.
  const vastIds = new Set<string>()
  for (const positie of POSITIE_CODES) {
    const id = vastgezet[positie]
    if (id && perId.has(id)) vastIds.add(id)
  }

  const aantalRust = Math.max(0, veldSpeelsters.length - AANTAL_VELDPOSITIES)
  const rusters = kiesRusters(veldSpeelsters, aantalRust, vastIds, blokIndex, ctx)
  const rustIds = new Set(rusters.map((s) => s.id))
  const veld = veldSpeelsters.filter((s) => !rustIds.has(s.id))

  const { opstelling, nood, leeg } = verdeelPosities(veld, vastgezet, ctx)

  for (const positie of leeg) {
    waarschuwingen.push(`${positieInfo(positie).naam}: niemand beschikbaar, plek blijft leeg.`)
  }
  for (const positie of nood) {
    const naam = perId.get(opstelling[positie]!)?.naam ?? 'Onbekend'
    waarschuwingen.push(
      `Noodbezetting: ${naam} staat op ${positieInfo(positie).naam} terwijl ze daar niet centraal kan staan.`,
    )
  }
  const noodPosities = new Set(nood)

  const bezet = new Set<string>()
  for (const positie of POSITIE_CODES) {
    const id = opstelling[positie]
    if (!id) continue
    bezet.add(id)
    const speelster = perId.get(id)
    if (speelster && !inLinie(speelster, positie) && !noodPosities.has(positie)) {
      waarschuwingen.push(
        `${speelster.naam} staat op ${positieInfo(positie).naam}, buiten haar linie.`,
      )
    }
  }

  const bank = veldSpeelsters.filter((s) => !bezet.has(s.id)).map((s) => s.id)

  // Context bijwerken voor het volgende blok.
  ctx.vorigePositie = new Map()
  for (const positie of POSITIE_CODES) {
    const id = opstelling[positie]
    if (!id) continue
    ctx.vorigePositie.set(id, positie)
    ctx.gespeeld.set(id, (ctx.gespeeld.get(id) ?? 0) + 1)
    const tellers = ctx.positieTeller.get(id) ?? new Map<Positie, number>()
    tellers.set(positie, (tellers.get(positie) ?? 0) + 1)
    ctx.positieTeller.set(id, tellers)
  }
  for (const id of bank) ctx.laatsteRust.set(id, blokIndex)

  return { index: blokIndex, opstelling, bank, waarschuwingen }
}

function maakContext(
  veldSpeelsters: Speelster[],
  invoer: RoosterInvoer,
  eerdereBlokken: Blok[],
): Context {
  const gespeeld = new Map<string, number>()
  const laatsteRust = new Map<string, number>()
  const positieTeller = new Map<string, Map<Positie, number>>()
  const vorigePositie = new Map<string, Positie>()

  for (const speelster of veldSpeelsters) {
    gespeeld.set(speelster.id, invoer.gespeeldVoor?.[speelster.id] ?? 0)
    laatsteRust.set(speelster.id, -1)
    positieTeller.set(speelster.id, new Map())
  }

  for (const blok of eerdereBlokken) {
    for (const positie of POSITIE_CODES) {
      const id = blok.opstelling[positie]
      if (!id || !positieTeller.has(id)) continue
      const tellers = positieTeller.get(id)!
      tellers.set(positie, (tellers.get(positie) ?? 0) + 1)
      vorigePositie.set(id, positie)
    }
    for (const id of blok.bank) {
      if (laatsteRust.has(id)) laatsteRust.set(id, blok.index)
    }
  }
  // Bij een herberekening zijn de gespeelde blokken al meegegeven; anders
  // tellen we ze uit de eerdere blokken.
  if (!invoer.gespeeldVoor) {
    for (const blok of eerdereBlokken) {
      for (const positie of POSITIE_CODES) {
        const id = blok.opstelling[positie]
        if (id && gespeeld.has(id)) gespeeld.set(id, (gespeeld.get(id) ?? 0) + 1)
      }
    }
  }

  const sterkteRang = new Map<Linie, Map<string, number>>()
  const sterkteOmvang = new Map<Linie, number>()
  const zetSterkte = (linie: Linie, ids: string[] | undefined) => {
    const aanwezig = (ids ?? []).filter((id) => gespeeld.has(id))
    const rangen = new Map<string, number>()
    aanwezig.forEach((id, index) => rangen.set(id, index))
    sterkteRang.set(linie, rangen)
    sterkteOmvang.set(linie, aanwezig.length)
  }
  zetSterkte('V', invoer.sterkteAchter)
  zetSterkte('M', invoer.sterkteMidden)

  return { gespeeld, laatsteRust, positieTeller, vorigePositie, sterkteRang, sterkteOmvang }
}

/**
 * Bouwt het wisselschema. Twee stappen per blok: eerst wie rust (dat bepaalt de
 * speeltijd), dan wie waar staat. Die volgorde zorgt ervoor dat de speeltijd
 * altijd klopt en de positiekeuze zich daarbinnen aanpast.
 */
export function maakRooster(invoer: RoosterInvoer): Rooster {
  const vanafBlok = invoer.vanafBlok ?? 0
  const uitgevallen = new Set(invoer.uitgevallen ?? [])
  const veldSpeelsters = invoer.aanwezigen.filter(
    (s) => s.id !== invoer.keeperId && !uitgevallen.has(s.id),
  )

  const eerdereBlokken = (invoer.eerdereBlokken ?? []).filter((b) => b.index < vanafBlok)
  const ctx = maakContext(veldSpeelsters, invoer, eerdereBlokken)

  const blokken: Blok[] = [...eerdereBlokken]
  const waarschuwingen: string[] = []

  if (veldSpeelsters.length === 0) {
    return { keeperId: invoer.keeperId, blokken, gespeeld: {}, waarschuwingen: ['Geen veldspeelsters beschikbaar.'] }
  }

  for (let blok = vanafBlok; blok < AANTAL_BLOKKEN; blok++) {
    blokken.push(bouwBlok(blok, veldSpeelsters, invoer.vastgezet?.[blok] ?? {}, ctx))
  }

  const gespeeld: Record<string, number> = {}
  for (const [id, aantal] of ctx.gespeeld) gespeeld[id] = aantal

  const uniek = new Set<string>()
  for (const blok of blokken) {
    for (const melding of blok.waarschuwingen) {
      const regel = `Blok ${blok.index + 1}: ${melding}`
      if (!uniek.has(regel)) {
        uniek.add(regel)
        waarschuwingen.push(regel)
      }
    }
  }

  return { keeperId: invoer.keeperId, blokken, gespeeld, waarschuwingen }
}

export interface BezettingsCheck {
  ok: boolean
  meldingen: string[]
}

/**
 * Controle vóór de wedstrijd: kunnen de sleutelposities überhaupt gevuld
 * worden met deze opkomst en deze keeperkeuze? Dat wil je op het
 * voorbereidingsscherm weten, niet pas in de derde minuut.
 */
export function controleerBezetting(aanwezigen: Speelster[], keeperId: string | null): BezettingsCheck {
  const meldingen: string[] = []
  const veld = aanwezigen.filter((s) => s.id !== keeperId)

  if (!keeperId) meldingen.push('Kies nog een keeper.')
  if (veld.length < AANTAL_VELDPOSITIES) {
    meldingen.push(
      `Maar ${veld.length} veldspeelsters: er blijven ${AANTAL_VELDPOSITIES - veld.length} plekken leeg.`,
    )
  }

  const achter = veld.filter((s) => magOpPositie(s, 'LV')).length
  const midden = veld.filter((s) => magOpPositie(s, 'CM')).length
  if (achter < 2) {
    meldingen.push(
      `Te weinig speelsters voor laatste vrouw en centrale verdediger: ${achter} van de 2 nodig.`,
    )
  }
  if (midden < 1) meldingen.push('Geen speelster beschikbaar voor centrale middenveld.')
  if (achter >= 2 && midden >= 1 && !heeftGeldigeSleutelbezetting(veld)) {
    meldingen.push('De drie centrale posities zijn niet tegelijk te bezetten met deze opstelling.')
  }

  return { ok: meldingen.length === 0, meldingen }
}

/** Wat verandert er tussen twee blokken? Dat is wat je langs de lijn roept. */
export interface Wissel {
  positie: Positie
  eruit: string | null
  erin: string | null
}

export function wisselsTussen(vorige: Blok | null, volgende: Blok): Wissel[] {
  const wissels: Wissel[] = []
  for (const positie of POSITIE_CODES) {
    const oud = vorige?.opstelling[positie] ?? null
    const nieuw = volgende.opstelling[positie] ?? null
    if (oud !== nieuw) wissels.push({ positie, eruit: oud, erin: nieuw })
  }
  return wissels
}

/** Eén wissel zoals je hem uitspreekt: "jij komt erin voor haar". */
export interface WisselPaar {
  erin: string
  positie: Positie
  /** Wie er voor haar af gaat; null als het veld nog niet vol stond. */
  eruit: string | null
}

export interface WisselOverzicht {
  /** Gekoppeld: wie komt erin voor wie. Dit is wat je langs de lijn roept. */
  paren: WisselPaar[]
  /** Komt van de bank het veld in. */
  erin: { id: string; positie: Positie }[]
  /** Gaat naar de bank. */
  eruit: string[]
  /** Blijft in het veld, maar op een andere plek. */
  verplaatst: { id: string; van: Positie; naar: Positie }[]
}

/**
 * De wissel opgedeeld zoals je hem langs de lijn roept. Wie van positie
 * verandert maar wél blijft staan, is geen wissel: die verschijnt apart, zodat
 * niemand per ongeluk het veld af loopt.
 */
export function wisselOverzicht(vorige: Blok | null, volgende: Blok): WisselOverzicht {
  const plekVan = (blok: Blok) => {
    const kaart = new Map<string, Positie>()
    for (const positie of POSITIE_CODES) {
      const id = blok.opstelling[positie]
      if (id) kaart.set(id, positie)
    }
    return kaart
  }

  const oud = vorige ? plekVan(vorige) : new Map<string, Positie>()
  const nieuw = plekVan(volgende)

  const erin: WisselOverzicht['erin'] = []
  const verplaatst: WisselOverzicht['verplaatst'] = []
  for (const [id, positie] of nieuw) {
    const vorigePositie = oud.get(id)
    if (vorigePositie === undefined) erin.push({ id, positie })
    else if (vorigePositie !== positie) verplaatst.push({ id, van: vorigePositie, naar: positie })
  }

  const eruit = [...oud.keys()].filter((id) => !nieuw.has(id))

  // Koppel elke invaller aan iemand die eraf gaat. Waar het kan aan de
  // speelster die net díe plek verliet -- dan klopt "jij komt erin voor haar"
  // ook echt met de positie. De rest wordt daarna op volgorde gekoppeld.
  const rest = [...eruit]
  const paren: WisselPaar[] = erin.map(({ id, positie }) => {
    const vorigeOpPlek = vorige?.opstelling[positie]
    const index = vorigeOpPlek ? rest.indexOf(vorigeOpPlek) : -1
    return { erin: id, positie, eruit: index >= 0 ? rest.splice(index, 1)[0] : null }
  })
  for (const paar of paren) {
    if (paar.eruit === null && rest.length > 0) paar.eruit = rest.shift()!
  }

  return { paren, erin, eruit, verplaatst }
}
