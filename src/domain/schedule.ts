import { AANTAL_BLOKKEN } from './clock'
import {
  AANTAL_VELDPOSITIES,
  POSITIE_CODES,
  positieInfo,
  type Linie,
  type Positie,
} from './formation'
import { inLinie, magOpPositie, type Speelster } from './players'
import { VERBODEN, hongaars, isVolledigTeBezetten, maximaleKoppeling } from './assignment'

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
  continuiteit: 8,
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
      // Bewust klein gehouden. Wie al in het veld staat wint op continuïteit
      // (8), zodat de sterkte-volgorde nooit een schuif veroorzaakt; hij geeft
      // de doorslag op het moment dat iemand invalt en er een centrale plek
      // vrij is. Hoger zetten leverde in de praktijk geen betere verdeling op,
      // wel meer doorschuiven.
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
 * Lost één blok op als koppeling met maximale score, met een deel van de
 * speelsters vastgepind op hun plek. `vastePlek` bepaalt wie er niet mag
 * bewegen; dat is de knop waarmee `verdeelPosities` het schuiven beperkt.
 */
function losOp(
  veld: Speelster[],
  vast: Opstelling,
  vastePlek: Map<string, Positie>,
  niveau: Niveau,
  ctx: Context,
): { opstelling: Opstelling; score: number } | null {
  const opstelling: Opstelling = {}
  const bezetteIds = new Set<string>()
  const openPosities: Positie[] = []

  const pin = (positie: Positie, id: string) => {
    opstelling[positie] = id
    bezetteIds.add(id)
  }

  // Eerst álle handmatige keuzes van de leider vastzetten. Dat moet in een
  // eigen doorloop: zou je het per positie afwisselen met de blijvers, dan kan
  // een speelster eerder als blijver op haar oude plek belanden en verliest de
  // handmatige keuze het van het rooster.
  for (const positie of POSITIE_CODES) {
    const handmatig = vast[positie]
    if (handmatig && veld.some((s) => s.id === handmatig) && !bezetteIds.has(handmatig)) {
      pin(positie, handmatig)
    }
  }
  for (const positie of POSITIE_CODES) {
    if (opstelling[positie]) continue
    const blijver = [...vastePlek].find(([id, plek]) => plek === positie && !bezetteIds.has(id))
    const speelster = blijver && veld.find((s) => s.id === blijver[0])
    // Alleen vastpinnen als ze daar op dit niveau ook mág staan. Anders zou
    // iemand die één blok noodgedwongen buiten haar linie stond daar blijven
    // hangen zolang ze in het veld is, ook als er wél een kloppende opstelling
    // bestaat.
    if (speelster && toegestaan(speelster, positie, niveau)) {
      pin(positie, speelster.id)
      continue
    }
    openPosities.push(positie)
  }

  const beschikbaar = veld.filter((s) => !bezetteIds.has(s.id))
  if (openPosities.length === 0) return { opstelling, score: 0 }

  const kandidaten = openPosities.map((positie) => {
    const rij: number[] = []
    beschikbaar.forEach((s, i) => {
      if (toegestaan(s, positie, niveau)) rij.push(i)
    })
    return rij
  })
  const compleet = openPosities.length <= beschikbaar.length
  if (compleet && !isVolledigTeBezetten(openPosities.length, kandidaten, beschikbaar.length)) {
    return null
  }

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
  let score = 0
  for (const [rij, positie] of openPosities.entries()) {
    const kolom = toewijzing[rij]
    const speelster = kolom >= 0 ? beschikbaar[kolom] : undefined
    if (!speelster || kosten[rij][kolom] >= VERBODEN) {
      if (compleet) return null
      continue
    }
    opstelling[positie] = speelster.id
    score -= kosten[rij][kolom]
  }
  return { opstelling, score }
}

/** Hoeveel speelsters die in het veld bleven staan nu op een andere plek? */
function telSchuiven(opstelling: Opstelling, blijvers: Map<string, Positie>): number {
  let aantal = 0
  for (const [id, oudePlek] of blijvers) {
    const nieuwePlek = POSITIE_CODES.find((p) => opstelling[p] === id)
    if (nieuwePlek && nieuwePlek !== oudePlek) aantal++
  }
  return aantal
}

/**
 * Verdeelt de posities over het veld, en houdt daarbij het schuiven zo klein
 * mogelijk.
 *
 * Schuiven -- een speelster die in het veld blijft maar naar een andere plek
 * gaat -- is de duurste instructie langs de lijn: je moet drie mensen tegelijk
 * iets vertellen. Daarom wordt het niet aan een weging overgelaten maar in
 * stappen afgedwongen:
 *
 *  A. iedereen die blijft, blijft staan waar ze stond    -> 0 schuiven
 *  B. alle blijvers vast op één na, elk apart geprobeerd -> 1 schuif
 *  C. niets vast                                         -> meer, met melding
 *
 * Binnen elke stap gelden nog steeds drie niveaus van streng naar soepel:
 *  - `streng`  iedereen binnen haar eigen linie;
 *  - `soepel`  buiten je linie mag, behalve op LV, CV en CM;
 *  - `nood`    ook een sleutelpositie wordt gevuld, met een luide markering.
 *
 * De linie gaat vóór het schuiven: op een verkeerde linie staan is een echt
 * speltechnisch nadeel, een schuif kost alleen uitleg.
 */
function verdeelPosities(
  veld: Speelster[],
  vast: Opstelling,
  ctx: Context,
): { opstelling: Opstelling; nood: Positie[]; leeg: Positie[]; schuiven: number } {
  const blijvers = new Map<string, Positie>()
  for (const speelster of veld) {
    const vorige = ctx.vorigePositie.get(speelster.id)
    if (vorige) blijvers.set(speelster.id, vorige)
  }

  const zoek = (niveau: Niveau): { opstelling: Opstelling; schuiven: number } | null => {
    // A: iedereen die blijft, blijft staan.
    const geen = losOp(veld, vast, blijvers, niveau, ctx)
    // Tellen in plaats van aannemen: een blijver die op haar oude plek niet
    // mág staan wordt niet vastgepind, dus ook stap A kan een schuif opleveren.
    if (geen) return { opstelling: geen.opstelling, schuiven: telSchuiven(geen.opstelling, blijvers) }

    // B: één blijver mag bewegen. Alle kandidaten aflopen en de beste pakken --
    // dat zijn hooguit tien kleine koppelingen.
    let beste: { opstelling: Opstelling; score: number } | null = null
    for (const id of blijvers.keys()) {
      const rest = new Map(blijvers)
      rest.delete(id)
      const poging = losOp(veld, vast, rest, niveau, ctx)
      if (poging && (!beste || poging.score > beste.score)) beste = poging
    }
    if (beste) return { opstelling: beste.opstelling, schuiven: telSchuiven(beste.opstelling, blijvers) }

    return null
  }

  // Per niveau eerst A en B (nul of één schuif) en dan pas C. De linie gaat dus
  // vóór het schuiven: liever twee speelsters die doorschuiven dan iemand op een
  // plek die ze niet speelt.
  for (const niveau of ['streng', 'soepel', 'nood'] as Niveau[]) {
    const beperkt = zoek(niveau)
    if (beperkt) return { ...beperkt, ...meldingen(beperkt.opstelling, veld) }

    const vrij = losOp(veld, vast, new Map(), niveau, ctx)
    if (!vrij) continue
    return {
      ...vrij,
      schuiven: telSchuiven(vrij.opstelling, blijvers),
      ...meldingen(vrij.opstelling, veld),
    }
  }

  // Laatste redmiddel: onvolledige opstelling, met lege plekken gemeld.
  const rest = losOp(veld, vast, new Map(), 'nood', ctx) ?? { opstelling: {} }
  return { opstelling: rest.opstelling, schuiven: 0, ...meldingen(rest.opstelling, veld) }
}

/** Welke posities zijn een noodbezetting, en welke bleven leeg? */
function meldingen(opstelling: Opstelling, veld: Speelster[]): { nood: Positie[]; leeg: Positie[] } {
  const perId = new Map(veld.map((s) => [s.id, s]))
  const nood: Positie[] = []
  const leeg: Positie[] = []
  for (const positie of POSITIE_CODES) {
    const id = opstelling[positie]
    if (!id) {
      leeg.push(positie)
      continue
    }
    const speelster = perId.get(id)
    if (speelster && !magOpPositie(speelster, positie)) nood.push(positie)
  }
  return { nood, leeg }
}

/**
 * Kan dit tiental worden opgesteld zonder dat iemand doorschuift? Dus: iedereen
 * die blijft staat op haar eigen plek, en de invallers vullen precies de plekken
 * die zijn vrijgekomen. Dit is de vooruitblik waarmee de rustrotatie schuiven
 * kan voorkomen in plaats van het achteraf te moeten oplossen.
 *
 * Met `losId` telt die ene speelster mee als invaller: haar plek komt vrij en
 * ze mag ergens anders gaan staan. Dat is precies "hoogstens één schuif".
 */
function kanZonderSchuiven(
  veld: Speelster[],
  niveau: Niveau,
  ctx: Context,
  losId?: string,
): boolean {
  const bezet = new Set<Positie>()
  const invallers: Speelster[] = []
  for (const speelster of veld) {
    const vorige = ctx.vorigePositie.get(speelster.id)
    if (vorige && speelster.id !== losId) bezet.add(vorige)
    else invallers.push(speelster)
  }
  const open = POSITIE_CODES.filter((p) => !bezet.has(p))
  if (open.length !== invallers.length) return false

  const kandidaten = open.map((positie) => {
    const rij: number[] = []
    invallers.forEach((s, i) => {
      if (toegestaan(s, positie, niveau)) rij.push(i)
    })
    return rij
  })
  return isVolledigTeBezetten(open.length, kandidaten, invallers.length)
}

/**
 * Hoeveel vrijgekomen plekken kan niemand van de bank overnemen?
 *
 * Elke plek die overblijft dwingt iemand uit het veld om door te schuiven, dus
 * dit is meteen de ondergrens van het aantal schuiven. Anders dan een simpel
 * ja/nee geeft dit een helling om op af te dalen: de rustrotatie kan er
 * gericht bankplekken mee omruilen tot het tekort weg is.
 */
function schuifTekort(veld: Speelster[], niveau: Niveau, ctx: Context): number {
  const bezet = new Set<Positie>()
  const invallers: Speelster[] = []
  for (const speelster of veld) {
    const vorige = ctx.vorigePositie.get(speelster.id)
    if (vorige) bezet.add(vorige)
    else invallers.push(speelster)
  }
  const open = POSITIE_CODES.filter((p) => !bezet.has(p))
  if (invallers.length === 0) return 0

  const kandidaten = open.map((positie) => {
    const rij: number[] = []
    invallers.forEach((s, i) => {
      if (toegestaan(s, positie, niveau)) rij.push(i)
    })
    return rij
  })
  const koppeling = maximaleKoppeling(open.length, kandidaten, invallers.length)
  return koppeling.filter((x) => x === -1).length
}

/** Kan het met hoogstens één speelster die doorschuift? */
function kanMetEenSchuif(veld: Speelster[], niveau: Niveau, ctx: Context): boolean {
  if (kanZonderSchuiven(veld, niveau, ctx)) return true
  return veld.some(
    (s) => ctx.vorigePositie.has(s.id) && kanZonderSchuiven(veld, niveau, ctx, s.id),
  )
}

/** In welke linies kan deze speelster een sleutelpositie bezetten? */
function sleutelLinies(speelster: Speelster): Linie[] {
  if (!speelster.centraal) return []
  return (['V', 'M'] as Linie[]).filter((l) => speelster.linies.includes(l))
}

/**
 * Hoe schaars is deze speelster voor de sleutelposities? Hoort ze bij een kleine
 * pool, dan kan er per blok maar één van hen op de bank -- dus moet ze haar
 * rustbeurten pakken zodra ze langskomen. Doet ze dat niet, dan stapelen ze
 * zich op tegen het eind van de wedstrijd, waar ze niet meer passen.
 *
 * Hoger betekent schaarser: 2 plekken uit een pool van 3 geeft 0,67.
 */
function rustDruk(speelster: Speelster, veld: Speelster[]): number {
  const pools: [Linie, number][] = [
    ['V', 2], // laatste vrouw + centrale verdediger
    ['M', 1], // centrale middenveld
  ]
  let druk = 0
  for (const [linie, nodig] of pools) {
    if (!speelster.centraal || !speelster.linies.includes(linie)) continue
    const omvang = veld.filter((s) => s.centraal && s.linies.includes(linie)).length
    if (omvang > 0) druk = Math.max(druk, nodig / omvang)
  }
  return druk
}

/**
 * Wie rust dit blok?
 *
 * Er zijn vier dingen die tellen, in deze volgorde:
 *
 *  0. **Een geldige opstelling.** Nooit zoveel centrale speelsters op de bank
 *     dat laatste vrouw of centrale middenveld leeg blijft. Dit is de enige
 *     harde eis; alles hieronder is een afweging.
 *  1. **Speeltijd.** Wie de meeste blokken heeft gespeeld gaat naar de bank.
 *  2. **De eigen linie.** Iedereen op een plek die ze speelt.
 *  3. **Niet doorschuiven**, en niemand twee blokken op rij op de bank.
 *
 * Elke combinatie van 2 en 3 levert een kandidaat-bezetting op. Daarvan wordt
 * niet simpelweg de eerste gekozen die lukt, maar die met de minste speeltijd-
 * schade -- anders zou linie-correctheid stiekem de minutenverdeling gaan
 * sturen. Bij gelijke schade wint de variant die het hoogst in de lijst staat.
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
      // Bij gelijke speeltijd eerst de schaarse centrale speelsters, want zij
      // kunnen maar met één tegelijk op de bank.
      const drukVerschil = rustDruk(b, beschikbaar) - rustDruk(a, beschikbaar)
      if (drukVerschil !== 0) return drukVerschil
      // Wie het langst geleden rustte, is nu aan de beurt.
      const rustVerschil = (ctx.laatsteRust.get(a.id) ?? -1) - (ctx.laatsteRust.get(b.id) ?? -1)
      if (rustVerschil !== 0) return rustVerschil
      return a.id.localeCompare(b.id)
    })

  if (kandidaten.length <= aantalRust) return kandidaten.slice(0, aantalRust)

  const veldNa = (rusters: Speelster[]): Speelster[] => {
    const uit = new Set(rusters.map((s) => s.id))
    return beschikbaar.filter((s) => !uit.has(s.id))
  }

  const greedy = (niveau: Niveau, weerVorigBlok: boolean): Speelster[] | null => {
    const gekozen: Speelster[] = []
    const gekozenIds = new Set<string>()
    for (const kandidaat of kandidaten) {
      if (gekozen.length === aantalRust) break
      if (weerVorigBlok && ctx.laatsteRust.get(kandidaat.id) === blok - 1) continue
      const overblijvend = beschikbaar.filter(
        (s) => s.id !== kandidaat.id && !gekozenIds.has(s.id),
      )
      // Harde eis: wat overblijft moet het blok nog rond kunnen zetten. Wie je
      // daarna nog wegneemt kan altijd iemand zijn die buiten de koppeling
      // valt, dus deze controle per stap is voldoende.
      if (!isBlokTeBezetten(overblijvend, false)) continue
      if (niveau === 'streng' && !isBlokTeBezetten(overblijvend, true)) continue
      gekozen.push(kandidaat)
      gekozenIds.add(kandidaat.id)
    }
    return gekozen.length === aantalRust ? gekozen : null
  }

  /** Hoeveel speelsters moeten er minstens doorschuiven bij dit tiental? 0, 1 of "meer". */
  const nodigeSchuiven = (veld: Speelster[], niveau: Niveau): number => {
    if (kanZonderSchuiven(veld, niveau, ctx)) return 0
    if (kanMetEenSchuif(veld, niveau, ctx)) return 1
    return 2
  }

  const probeer = (niveau: Niveau, weerVorigBlok: boolean, maxSchuif: number) => {
    let basis = greedy(niveau, weerVorigBlok)
    if (!basis) return null

    // Ruil bankplekken om tegen speelsters met exact dezelfde speeltijd. Dat
    // verandert niets aan de minutenverdeling, maar kan wel schuiven schelen.
    // Eén ruil is vaak niet genoeg -- als drie centrale speelsters tegelijk
    // afgelost worden, moet er meer verschuiven -- dus dit daalt stap voor stap
    // af zolang elke ruil het aantal schuiven verlaagt.
    // Ook de terugvalvariant (waar meer schuiven mag) daalt af: er is geen reden
    // om drie speelsters te laten schuiven als twee genoeg is.
    for (let ronde = 0; ronde < 8; ronde++) {
      if (nodigeSchuiven(veldNa(basis), niveau) <= maxSchuif && maxSchuif < 2) return basis
      const tekort = schuifTekort(veldNa(basis), niveau, ctx)
      if (tekort === 0) break

      const huidigeBasis: Speelster[] = basis
      const vrij = kandidaten.filter((k) => !huidigeBasis.some((b) => b.id === k.id))
      let beter: Speelster[] | null = null
      for (const eruit of huidigeBasis) {
        for (const erin of vrij) {
          if (gespeeld(erin) !== gespeeld(eruit)) continue
          const alternatief: Speelster[] = huidigeBasis.map((s) =>
            s.id === eruit.id ? erin : s,
          )
          const veld = veldNa(alternatief)
          if (!isBlokTeBezetten(veld, false)) continue
          if (niveau === 'streng' && !isBlokTeBezetten(veld, true)) continue
          if (schuifTekort(veld, niveau, ctx) < tekort) {
            beter = alternatief
            break
          }
        }
        if (beter) break
      }
      if (!beter) break
      basis = beter
    }
    if (maxSchuif >= 2) return basis
    return nodigeSchuiven(veldNa(basis), niveau) <= maxSchuif ? basis : null
  }

  // Van streng naar soepel, en binnen elk niveau van geen schuif via hoogstens
  // één naar onbeperkt.
  const varianten = [
    ['streng', true, 0],
    ['streng', false, 0],
    ['streng', true, 1],
    ['streng', false, 1],
    ['streng', true, 2],
    ['streng', false, 2],
    ['soepel', true, 0],
    ['soepel', false, 0],
    ['soepel', true, 1],
    ['soepel', false, 1],
    ['soepel', true, 2],
    ['soepel', false, 2],
  ] as const

  // Speeltijdschade: hoeveel blokken lopen de gekozen rusters achter op de
  // ideale keuze (simpelweg de zwaarst belaste speelsters). Nul is perfect.
  const ideaal = kandidaten.slice(0, aantalRust).reduce((t, s) => t + gespeeld(s), 0)
  let beste: { rusters: Speelster[]; schade: number } | null = null

  for (const [niveau, weerVorigBlok, maxSchuif] of varianten) {
    const rusters = probeer(niveau, weerVorigBlok, maxSchuif)
    if (!rusters) continue
    const schade = ideaal - rusters.reduce((t, s) => t + gespeeld(s), 0)
    // Alleen bij strikt minder schade vervangen, zodat bij gelijke speeltijd de
    // variant met de mooiste eigenschappen wint.
    if (!beste || schade < beste.schade) beste = { rusters, schade }
    if (schade === 0) break
  }
  if (beste) return beste.rusters

  // Niets voldeed: het blok is sowieso niet rond te krijgen. `bouwBlok` maakt
  // dat zichtbaar met een waarschuwing.
  return kandidaten.slice(0, aantalRust)
}

/** Wie speelt dit blok? De rest zit op de bank. */
function kiesVeld(
  blokIndex: number,
  veldSpeelsters: Speelster[],
  vastgezet: Opstelling,
  ctx: Context,
): Speelster[] {
  const perId = new Map(veldSpeelsters.map((s) => [s.id, s]))

  // Handmatig vastgezette speelsters staan vast en spelen dus sowieso.
  const vastIds = new Set<string>()
  for (const positie of POSITIE_CODES) {
    const id = vastgezet[positie]
    if (id && perId.has(id)) vastIds.add(id)
  }

  const aantalRust = Math.max(0, veldSpeelsters.length - AANTAL_VELDPOSITIES)
  const rustIds = new Set(kiesRusters(veldSpeelsters, aantalRust, vastIds, blokIndex, ctx).map((s) => s.id))
  return veldSpeelsters.filter((s) => !rustIds.has(s.id))
}

function bouwBlok(
  blokIndex: number,
  veldSpeelsters: Speelster[],
  veld: Speelster[],
  vastgezet: Opstelling,
  ctx: Context,
): Blok {
  const perId = new Map(veldSpeelsters.map((s) => [s.id, s]))
  const waarschuwingen: string[] = []

  const { opstelling, nood, leeg, schuiven } = verdeelPosities(veld, vastgezet, ctx)

  if (schuiven > 1) {
    waarschuwingen.push(
      `${schuiven} speelsters schuiven tegelijk door; dat was niet te vermijden met deze bezetting.`,
    )
  }

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

/** Zou deze speelster hierdoor twee blokken op rij op de bank belanden? */
function dubbeleBank(velden: Speelster[][], blok: number, speelsterId: string): boolean {
  const opBank = (index: number) =>
    index >= 0 && index < velden.length && !velden[index].some((s) => s.id === speelsterId)
  return opBank(blok - 1) || opBank(blok + 1)
}

/**
 * Trekt de speeltijd recht door bank- en veldplekken om te ruilen.
 *
 * De blokkeuze is greedy: hij kiest per blok wie er rust en kijkt niet verder.
 * Bij een kleine centrale pool loopt dat scheef -- als er maar drie speelsters
 * laatste vrouw of centrale verdediger kunnen, mag er per blok maar één van hen
 * op de bank, en aan het eind van de wedstrijd passen hun resterende
 * rustbeurten niet meer. Deze stap zoekt daarvoor achteraf de ruil op die het
 * wél laat kloppen.
 *
 * Geeft `null` terug als er niets te verbeteren viel.
 */
function repareerSpeeltijd(
  velden: Speelster[][],
  veldSpeelsters: Speelster[],
  startStand: Map<string, number>,
): Speelster[][] | null {
  const huidig = velden.map((veld) => [...veld])
  let aangepast = false

  const tel = () => {
    const totaal = new Map(startStand)
    for (const veld of huidig) {
      for (const speelster of veld) {
        totaal.set(speelster.id, (totaal.get(speelster.id) ?? 0) + 1)
      }
    }
    return totaal
  }

  // Elke ronde verplaatst hoogstens één blok-plek, dus een ruime bovengrens op
  // het aantal rondes is genoeg om zeker te stoppen.
  const maxRondes = huidig.length * veldSpeelsters.length + 1
  for (let ronde = 0; ronde < maxRondes; ronde++) {
    const totaal = tel()
    const waarden = [...totaal.values()]
    const meeste = Math.max(...waarden)
    const minste = Math.min(...waarden)
    if (meeste - minste <= 1) break

    const zwaar = veldSpeelsters.filter((s) => totaal.get(s.id) === meeste)
    const licht = veldSpeelsters.filter((s) => totaal.get(s.id) === minste)

    // Eerst zoeken naar een ruil die niemand twee blokken op rij op de bank
    // zet; lukt dat niet, dan telt de speeltijd zwaarder dan die voorkeur.
    let geruild = false
    for (const vermijdDubbel of [true, false]) {
      for (let blok = 0; blok < huidig.length && !geruild; blok++) {
        const veld = huidig[blok]
        const opVeld = new Set(veld.map((s) => s.id))
        for (const eruit of zwaar) {
          if (!opVeld.has(eruit.id)) continue
          if (vermijdDubbel && dubbeleBank(huidig, blok, eruit.id)) continue
          for (const erin of licht) {
            if (opVeld.has(erin.id)) continue
            const nieuw = veld.map((s) => (s.id === eruit.id ? erin : s))
            // De ruil mag het blok niet onspeelbaar maken.
            if (!isBlokTeBezetten(nieuw, false)) continue
            if (isBlokTeBezetten(veld, true) && !isBlokTeBezetten(nieuw, true)) continue
            huidig[blok] = nieuw
            aangepast = true
            geruild = true
            break
          }
          if (geruild) break
        }
      }
      if (geruild) break
    }
    if (!geruild) break
  }

  return aangepast ? huidig : null
}

/** Verschil tussen de meest- en minstspelende speelster. */
function spreiding(velden: Speelster[][], veldSpeelsters: Speelster[], startStand: Map<string, number>): number {
  const totaal = new Map(startStand)
  for (const veld of velden) {
    for (const speelster of veld) totaal.set(speelster.id, (totaal.get(speelster.id) ?? 0) + 1)
  }
  const waarden = veldSpeelsters.map((s) => totaal.get(s.id) ?? 0)
  return Math.max(...waarden) - Math.min(...waarden)
}

/**
 * Trekt de linies recht zonder de speeltijd te verslechteren.
 *
 * Blijft er een blok over waarin niet iedereen in haar eigen linie past, dan
 * ruilt deze stap iemand van het veld tegen iemand van de bank. Liefst in een
 * paar -- A het veld in bij blok i, B eruit, en bij blok j precies andersom --
 * want dan blijft ieders speeltijd exact gelijk. Bestaat dat tegenblok niet
 * (iemand die elk blok speelt heeft er geen), dan mag ook een losse ruil, zolang
 * de speeltijdspreiding daar niet groter van wordt.
 */
function repareerLinies(
  velden: Speelster[][],
  veldSpeelsters: Speelster[],
  startStand: Map<string, number>,
): Speelster[][] | null {
  const huidig = velden.map((veld) => [...veld])
  const grens = Math.max(1, spreiding(huidig, veldSpeelsters, startStand))
  let aangepast = false

  const blijftGeldig = (blok: number, nieuw: Speelster[]) =>
    isBlokTeBezetten(nieuw, false) &&
    (!isBlokTeBezetten(huidig[blok], true) || isBlokTeBezetten(nieuw, true))

  for (let i = 0; i < huidig.length; i++) {
    if (isBlokTeBezetten(huidig[i], true)) continue
    const veldI = new Set(huidig[i].map((s) => s.id))
    const bankI = veldSpeelsters.filter((s) => !veldI.has(s.id))

    let opgelost = false
    for (const eruit of huidig[i]) {
      for (const erin of bankI) {
        const nieuwI = huidig[i].map((s) => (s.id === eruit.id ? erin : s))
        if (!isBlokTeBezetten(nieuwI, true)) continue

        // Eerst het tegenblok zoeken: daar staat `erin` in het veld en `eruit`
        // op de bank, zodat de omgekeerde ruil hun speeltijd rechttrekt.
        for (let j = 0; j < huidig.length && !opgelost; j++) {
          if (j === i) continue
          const veldJ = new Set(huidig[j].map((s) => s.id))
          if (!veldJ.has(erin.id) || veldJ.has(eruit.id)) continue
          const nieuwJ = huidig[j].map((s) => (s.id === erin.id ? eruit : s))
          if (!blijftGeldig(j, nieuwJ)) continue
          if (dubbeleBank(huidig, j, erin.id)) continue
          huidig[i] = nieuwI
          huidig[j] = nieuwJ
          aangepast = true
          opgelost = true
        }
        if (opgelost) break

        // Geen tegenblok: dan een losse ruil, mits de speeltijd niet scheefloopt.
        const proef = huidig.map((veld, index) => (index === i ? nieuwI : veld))
        if (spreiding(proef, veldSpeelsters, startStand) > grens) continue
        if (dubbeleBank(proef, i, eruit.id)) continue
        huidig[i] = nieuwI
        aangepast = true
        opgelost = true
        break
      }
      if (opgelost) break
    }
  }

  return aangepast ? huidig : null
}

/**
 * Haalt speelsters die elkaar ontwijken van het dieptepunt af.
 *
 * Nora en Kiki kunnen allebei op het centrale middenveld, maar er is één plek.
 * De rustrotatie zet ze daardoor om en om op de bank: precies in de blokken
 * waarin de een speelt, rust de ander. Bij acht van de twaalf blokken elk staan
 * ze dan maar vier blokken samen in het veld -- het rekenkundige minimum.
 * Vallen hun rustbeurten samen, dan worden dat er acht, en speelt degene die
 * niet centraal staat gewoon op links- of rechtsmid.
 *
 * Bewust zuinig: alleen paren die écht op hun minimum staan, en hoogstens een
 * handvol ruilen. Elke ruil verandert de bezetting van twee blokken en kost
 * daardoor al snel extra doorschuiven, en dat weegt zwaarder dan een paar
 * blokken samenspel erbij.
 *
 * Ruilt in paren, net als `repareerLinies`: A gaat er in blok i in en in blok j
 * uit, de ander precies andersom. Ieders speeltijd blijft exact gelijk.
 */
const MAX_SAMENSPEL_RUILEN = 4

function repareerSamenspel(velden: Speelster[][], veldSpeelsters: Speelster[]): Speelster[][] | null {
  const huidig = velden.map((veld) => [...veld])

  const paren: [Speelster, Speelster][] = []
  for (let a = 0; a < veldSpeelsters.length; a++) {
    for (let b = a + 1; b < veldSpeelsters.length; b++) {
      const linies = sleutelLinies(veldSpeelsters[b])
      if (sleutelLinies(veldSpeelsters[a]).some((l) => linies.includes(l))) {
        paren.push([veldSpeelsters[a], veldSpeelsters[b]])
      }
    }
  }
  if (paren.length === 0) return null

  const speelt = (blok: number, id: string) => huidig[blok].some((s) => s.id === id)

  /**
   * Totaal aantal blokken dat concurrerende speelsters samen in het veld staan.
   * Hoger is beter. Bewust de som en niet "hoeveel paren staan op hun minimum":
   * dat laatste stopt zodra een paar er nét boven zit, en dan speelt Nora nog
   * steeds maar vijf van de twaalf blokken met Kiki samen.
   */
  const samenTotaal = () =>
    paren.reduce(
      (som, [a, b]) => som + huidig.filter((_, i) => speelt(i, a.id) && speelt(i, b.id)).length,
      0,
    )

  let aangepast = false
  let score = samenTotaal()

  for (let ronde = 0; ronde < MAX_SAMENSPEL_RUILEN; ronde++) {
    let beste: {
      i: number
      j: number
      heen: Speelster
      terug: Speelster
      waarde: number
      onrust: number
    } | null = null

    for (let i = 0; i < huidig.length; i++) {
      for (let j = 0; j < huidig.length; j++) {
        if (i === j) continue
        const opI = new Set(huidig[i].map((s) => s.id))
        const opJ = new Set(huidig[j].map((s) => s.id))
        for (const heen of veldSpeelsters) {
          if (opI.has(heen.id) || !opJ.has(heen.id)) continue
          for (const terug of veldSpeelsters) {
            if (terug.id === heen.id || !opI.has(terug.id) || opJ.has(terug.id)) continue

            const nieuwI = huidig[i].map((s) => (s.id === terug.id ? heen : s))
            const nieuwJ = huidig[j].map((s) => (s.id === heen.id ? terug : s))
            if (!isBlokTeBezetten(nieuwI, false) || !isBlokTeBezetten(nieuwJ, false)) continue
            if (isBlokTeBezetten(huidig[i], true) && !isBlokTeBezetten(nieuwI, true)) continue
            if (isBlokTeBezetten(huidig[j], true) && !isBlokTeBezetten(nieuwJ, true)) continue

            const oudI = huidig[i]
            const oudJ = huidig[j]
            huidig[i] = nieuwI
            huidig[j] = nieuwJ
            // `terug` gaat in blok i naar de bank en `heen` in blok j: geen van
            // beide mag daardoor twee blokken op rij bank krijgen.
            if (dubbeleBank(huidig, i, terug.id) || dubbeleBank(huidig, j, heen.id)) {
              huidig[i] = oudI
              huidig[j] = oudJ
              continue
            }
            const na = samenTotaal()
            huidig[i] = oudI
            huidig[j] = oudJ

            if (na <= score) continue
            // Twee speelsters uit dezelfde linie ruilen kost het minst: de
            // invaller past dan op de plek die vrijkomt en de rest van het veld
            // hoeft niet door te schuiven. Bij gelijke winst wint de rustigste
            // ruil.
            const gedeeld = heen.linies.filter((l) => terug.linies.includes(l)).length
            const onrust = (gedeeld > 0 ? 0 : 2) + Math.abs(i - j) / huidig.length
            if (!beste || na > beste.waarde || (na === beste.waarde && onrust < beste.onrust)) {
              beste = { i, j, heen, terug, waarde: na, onrust }
            }
          }
        }
      }
    }

    if (!beste) break
    const { i, j, heen, terug } = beste
    huidig[i] = huidig[i].map((s) => (s.id === terug.id ? heen : s))
    huidig[j] = huidig[j].map((s) => (s.id === heen.id ? terug : s))
    score = beste.waarde
    aangepast = true
  }

  return aangepast ? huidig : null
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

  if (veldSpeelsters.length === 0) {
    return {
      keeperId: invoer.keeperId,
      blokken: [...eerdereBlokken],
      gespeeld: {},
      waarschuwingen: ['Geen veldspeelsters beschikbaar.'],
    }
  }

  /** Bouwt de resterende blokken; met `vasteVelden` liggen de bezettingen al vast. */
  const bouw = (vasteVelden?: Speelster[][]) => {
    const ctx = maakContext(veldSpeelsters, invoer, eerdereBlokken)
    const blokken: Blok[] = [...eerdereBlokken]
    const velden: Speelster[][] = []
    for (let blok = vanafBlok; blok < AANTAL_BLOKKEN; blok++) {
      const vastgezet = invoer.vastgezet?.[blok] ?? {}
      const veld =
        vasteVelden?.[blok - vanafBlok] ?? kiesVeld(blok, veldSpeelsters, vastgezet, ctx)
      velden.push(veld)
      blokken.push(bouwBlok(blok, veldSpeelsters, veld, vastgezet, ctx))
    }
    return { blokken, velden, ctx }
  }

  let uitkomst = bouw()

  // De blokkeuze is greedy en kijkt maar één blok vooruit. Bij een kleine
  // centrale pool kan dat scheef aflopen: dezelfde twee speelsters moeten
  // steeds achterin blijven, en aan het eind past hun rustbeurt niet meer.
  // Deze reparatie ruilt achteraf bank- en veldplekken om tot de speeltijd
  // weer klopt -- een garantie in plaats van een hoop.
  const startStand = new Map<string, number>()
  for (const speelster of veldSpeelsters) {
    startStand.set(speelster.id, invoer.gespeeldVoor?.[speelster.id] ?? 0)
  }
  if (!invoer.gespeeldVoor) {
    for (const blok of eerdereBlokken) {
      for (const id of Object.values(blok.opstelling)) {
        if (id && startStand.has(id)) startStand.set(id, (startStand.get(id) ?? 0) + 1)
      }
    }
  }
  let velden = uitkomst.velden
  const naSpeeltijd = repareerSpeeltijd(velden, veldSpeelsters, startStand)
  if (naSpeeltijd) velden = naSpeeltijd
  const naLinies = repareerLinies(velden, veldSpeelsters, startStand)
  if (naLinies) velden = naLinies
  const naSamenspel = repareerSamenspel(velden, veldSpeelsters)
  if (naSamenspel) velden = naSamenspel
  if (naSpeeltijd || naLinies || naSamenspel) uitkomst = bouw(velden)

  const { blokken, ctx } = uitkomst
  const waarschuwingen: string[] = []

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

/** Eén stap in een wisselketting: wie neemt deze plek over, en waar kwam ze vandaan? */
export interface KetenStap {
  speelsterId: string
  naar: Positie
  /** `null` betekent: rechtstreeks van de bank. */
  van: Positie | null
}

/**
 * Eén wissel, verteld als de ketting die je langs de lijn uitspreekt: er gaat
 * iemand af, iemand neemt die plek over, en als dat een speelster uit het veld
 * was komt er weer iemand op háár plek.
 */
export interface WisselKeten {
  eruit: string
  vanPositie: Positie
  stappen: KetenStap[]
}

/**
 * Bouwt de wisselkettingen tussen twee blokken.
 *
 * Losse regels ("X eruit", "Y schuift", "Z erin") laten de leider zelf puzzelen
 * hoe ze samenhangen. Door de ketting te volgen wordt het één zin: Eva gaat
 * eraf, Nora neemt de laatste vrouw over, en Kiki komt op het middenveld.
 */
export function wisselKetens(vorige: Blok | null, volgende: Blok): WisselKeten[] {
  if (!vorige) return []

  const plekVan = (blok: Blok) => {
    const kaart = new Map<string, Positie>()
    for (const positie of POSITIE_CODES) {
      const id = blok.opstelling[positie]
      if (id) kaart.set(id, positie)
    }
    return kaart
  }
  const oud = plekVan(vorige)
  const nieuw = plekVan(volgende)

  const ketens: WisselKeten[] = []
  const gebruikt = new Set<string>()

  for (const positie of POSITIE_CODES) {
    const vertrekker = vorige.opstelling[positie]
    if (!vertrekker || nieuw.has(vertrekker)) continue // zij blijft, dus geen keten

    const stappen: KetenStap[] = []
    let plek: Positie | undefined = positie
    // Volg de ketting door tot iemand van de bank hem sluit.
    while (plek !== undefined) {
      const opvolger: string | undefined = volgende.opstelling[plek]
      if (opvolger === undefined || gebruikt.has(opvolger)) break
      gebruikt.add(opvolger)
      const vandaan: Positie | null = oud.get(opvolger) ?? null
      stappen.push({ speelsterId: opvolger, naar: plek, van: vandaan })
      // Kwam ze van de bank, dan is de ketting rond. Kwam ze uit het veld, dan
      // is háár oude plek nu vrij en gaat het verhaal daar verder.
      plek = vandaan ?? undefined
    }

    ketens.push({ eruit: vertrekker, vanPositie: positie, stappen })
  }

  return ketens
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
