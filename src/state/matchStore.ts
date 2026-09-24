import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AANTAL_KWARTEN,
  KWART_SECONDEN,
  STANDAARD_BLOKKEN_PER_KWART,
  aantalBlokken,
  blokIndex,
  blokInKwart,
  blokSeconden,
  geldigeBlokkenPerKwart,
  verstrekenMet,
} from '../domain/clock'
import { LINIES, type Linie, type Positie } from '../domain/formation'
import { SELECTIE, UIT_ELKAAR, magOpPositie, type Speelster } from '../domain/players'
import { maakRooster, opstellingMet, type Blok, type Opstelling, type Rooster } from '../domain/schedule'
import { OEFENMODUS, STANDAARD_OEFENSNELHEID } from '../oefenmodus'

export type Fase =
  | 'aanwezigheid'
  | 'keeper'
  | 'wisselmomenten'
  | 'sterkte'
  | 'opstelling'
  | 'wedstrijd'

export interface WedstrijdStand {
  fase: Fase
  selectie: Speelster[]
  aanwezig: string[]
  keeperId: string | null
  sterkteAchter: string[]
  sterkteMidden: string[]
  uitgevallen: string[]
  vastgezet: Record<number, Opstelling>
  /** Blokken per kwart: hoe vaak de coach wisselt. Zie `domain/clock`. */
  blokkenPerKwart: number
  /**
   * Heeft de coach het wisselritme zelf gekozen?
   *
   * Zolang dit uit staat volgt de app haar eigen advies, en schuift dat mee als
   * er nog iemand binnenkomt of afzegt. Zodra de coach een keuze aantikt houdt
   * de app haar mond: hij overrulet niet één keer maar vanaf dan.
   */
  wisselZelfGekozen: boolean
  /** Bevestigde blokken uit een eerdere berekening; blijven onaangetast. */
  bevrorenBlokken: Blok[]
  bevrorenTot: number
  gespeeldVoor: Record<string, number>
  /** 1-based. */
  kwart: number
  /** Verstreken seconden binnen het huidige kwart. */
  secondenInKwart: number
  loopt: boolean
  /** Tijdstip (ms) waarop de klok voor het laatst is gestart. */
  gestartOp: number | null
  /** Laatste blok waarvoor het alarm al is afgegaan. */
  alarmTot: number
  /** Klokversnelling; alleen de oefenversie kan dit anders dan 1 zetten. */
  snelheid: number
  /** Vorm van de opgeslagen stand; zie OPSLAG_VERSIE. */
  versie: number
}

export const OPSLAG_SLEUTEL = 'hockeywissel.wedstrijd.v1'

/**
 * Vorm van de opgeslagen stand. **Ophogen zodra een veld bij komt, verdwijnt of
 * van vorm verandert.**
 *
 * Een oude stand wordt dan genegeerd in plaats van half teruggezet. Dat lijkt
 * hard, maar half terugzetten is erger. Twee keer misgegaan:
 *
 *  - Versie 1 kende geen versienummer. Wie eerder had getest kreeg bij het
 *    openen een oude wedstrijd terug en kwam niet meer bij de voorbereiding.
 *  - Versie 2 bleef staan terwijl `centraal` van een ja/nee-waarde naar een
 *    lijst linies ging. Een opgeslagen selectie van vóór die wijziging liet de
 *    app crashen op `centraal.includes(...)`: witte pagina, niets meer te doen.
 *
 * Vergeten op te hogen is menselijk, dus `lees()` controleert de vorm nu ook
 * echt in plaats van alleen het nummer te vertrouwen.
 *
 * Op "de oude stand gaat weg" is één uitzondering: de selectie zelf, en alleen
 * als die de vormcontrole doorstaat. Zie `standMetOudeSelectie`.
 */
const OPSLAG_VERSIE = 4

/**
 * Eén uitzondering op "een oude stand gaat weg": de selectie zelf.
 *
 * Wie welke linie speelt en wie centraal kan is werk van een kwartier langs de
 * lijn, en het hoort bij het team en niet bij deze wedstrijd. Dat elke keer
 * kwijtraken omdat er een veld aan de wedstrijd is toegevoegd is het middel
 * erger dan de kwaal. De vorm wordt daarom eerst gecontroleerd -- en alleen de
 * selectie komt mee, nooit de halve wedstrijd eromheen.
 */
function standMetOudeSelectie(bewaard: Partial<WedstrijdStand>): WedstrijdStand {
  const vers = standaardStand()
  if (bewaard.selectie === undefined || !selectieIsGeldig(bewaard.selectie)) return vers
  return { ...vers, selectie: bewaard.selectie }
}

/** Een verse wedstrijd, zoals de app hem uit de doos geeft. */
export function standaardStand(): WedstrijdStand {
  return {
    fase: 'aanwezigheid',
    selectie: SELECTIE,
    aanwezig: SELECTIE.map((s) => s.id),
    keeperId: null,
    sterkteAchter: [],
    sterkteMidden: [],
    uitgevallen: [],
    vastgezet: {},
    blokkenPerKwart: STANDAARD_BLOKKEN_PER_KWART,
    wisselZelfGekozen: false,
    bevrorenBlokken: [],
    bevrorenTot: 0,
    gespeeldVoor: {},
    kwart: 1,
    secondenInKwart: 0,
    loopt: false,
    gestartOp: null,
    alarmTot: -1,
    snelheid: OEFENMODUS ? STANDAARD_OEFENSNELHEID : 1,
    versie: OPSLAG_VERSIE,
  }
}

/**
 * Ziet deze opgeslagen selectie eruit zoals de app hem nu verwacht?
 *
 * Het versienummer is de eerste verdediging, maar het ophogen kan vergeten
 * worden -- en dat is precies wat er gebeurde toen `centraal` van een ja/nee
 * naar een lijst linies ging. Een kapotte opslag mag nooit een witte pagina
 * opleveren, dus de vorm wordt hier ook echt nagekeken.
 */
export function selectieIsGeldig(selectie: unknown): boolean {
  return (
    Array.isArray(selectie) &&
    selectie.every((s) => {
      const speelster = s as Partial<Speelster>
      return (
        typeof speelster?.id === 'string' &&
        typeof speelster?.naam === 'string' &&
        Array.isArray(speelster?.linies) &&
        Array.isArray(speelster?.centraal)
      )
    })
  )
}

/**
 * Zet speelsters die later aan de vaste selectie zijn toegevoegd erbij.
 *
 * De opgeslagen selectie wint van `SELECTIE`, want daarin staan de linies en
 * centraal-vlaggen die de coach heeft bijgesteld. Maar komt er een nieuwe
 * speelster in het team, dan zou zij zo nooit verschijnen bij wie de app al
 * eens gebruikt heeft. Wie ontbreekt komt er dus achteraan bij, en is ook
 * aanwezig -- tenzij er al een wedstrijd loopt: daar zet je haar zelf aan.
 */
export function metNieuweVaste(stand: WedstrijdStand): WedstrijdStand {
  const bekend = new Set(stand.selectie.map((s) => s.id))
  const nieuw = SELECTIE.filter((s) => !bekend.has(s.id))
  if (nieuw.length === 0) return stand
  const gestart = stand.kwart > 1 || stand.secondenInKwart > 0
  // Invalsters blijven achteraan, na de vaste selectie.
  const vast = stand.selectie.filter((s) => isVasteSpeelster(s.id))
  const extra = stand.selectie.filter((s) => !isVasteSpeelster(s.id))
  return {
    ...stand,
    selectie: [...vast, ...nieuw, ...extra],
    aanwezig: gestart ? stand.aanwezig : [...stand.aanwezig, ...nieuw.map((s) => s.id)],
  }
}

function lees(): WedstrijdStand {
  const stand = leesOpslag()
  return metNieuweVaste(stand)
}

function leesOpslag(): WedstrijdStand {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL)
    if (!ruw) return standaardStand()
    const bewaard = JSON.parse(ruw) as Partial<WedstrijdStand>
    // Een stand van een oudere versie kan velden missen of anders bedoeld zijn.
    // Hem half terugzetten geeft rare toestanden -- meteen in een oude wedstrijd
    // belanden zonder weg terug, of een crash op een veranderd veld.
    if (bewaard.versie !== OPSLAG_VERSIE) return standMetOudeSelectie(bewaard)
    if (bewaard.selectie !== undefined && !selectieIsGeldig(bewaard.selectie)) {
      return standaardStand()
    }
    return {
      ...standaardStand(),
      ...bewaard,
      blokkenPerKwart: geldigeBlokkenPerKwart(bewaard.blokkenPerKwart),
    }
  } catch {
    return standaardStand()
  }
}

function schrijf(stand: WedstrijdStand) {
  try {
    localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(stand))
  } catch {
    // Opslag kan geweigerd worden (privémodus); de app blijft dan gewoon werken.
  }
}

/** Verstreken seconden, inclusief de tijd sinds de klok laatst startte. */
export function verstrekenSeconden(stand: WedstrijdStand, nu: number): number {
  const basis = stand.secondenInKwart
  if (!stand.loopt || stand.gestartOp === null) return Math.min(basis, KWART_SECONDEN)
  return verstrekenMet(basis, nu - stand.gestartOp, stand.snelheid ?? 1)
}

/**
 * Deelt een lopende wedstrijd opnieuw in als de coach het wisselritme wijzigt.
 *
 * Blokken zijn genummerd, en dat nummer betekent iets anders zodra een kwart
 * uit twee in plaats van drie blokken bestaat. Alles wat aan een bloknummer
 * hangt -- wat er al gespeeld is, wat de coach heeft vastgezet -- moet dus
 * mee verhuizen, anders staat de opstelling van het derde blok ineens in de
 * rust van het tweede kwart.
 *
 * Verhuizen gaat via de klok, want die verandert niet: elk nieuw blok pakt het
 * oude blok dat op datzelfde moment liep. Wat de coach had vastgezet komt
 * daarbij hoogstens één keer terug -- valt een oud blok over twee nieuwe, dan
 * krijgt alleen het eerste de vaste opstelling en is het tweede weer vrij voor
 * de app. Anders zou een extra wisselmoment aanzetten stilletjes niets doen.
 */
export function herindeel(
  stand: WedstrijdStand,
  nieuwAantal: number,
  blokken: Blok[],
  secondenInKwart: number,
): Partial<WedstrijdStand> {
  const oud = stand.blokkenPerKwart
  if (oud === nieuwAantal) return {}

  const oudIndexVoor = (nieuw: number): number => {
    const kwart = Math.floor(nieuw / nieuwAantal)
    const binnen = nieuw % nieuwAantal
    const midden = (binnen + 0.5) * blokSeconden(nieuwAantal)
    const oudBinnen = Math.min(oud - 1, Math.floor(midden / blokSeconden(oud)))
    return kwart * oud + oudBinnen
  }

  const vastgezet: Record<number, Opstelling> = {}
  const gebruikt = new Set<number>()
  for (let nieuw = 0; nieuw < aantalBlokken(nieuwAantal); nieuw++) {
    const oudBlok = oudIndexVoor(nieuw)
    if (gebruikt.has(oudBlok)) continue
    const opstelling = stand.vastgezet[oudBlok]
    if (!opstelling) continue
    gebruikt.add(oudBlok)
    vastgezet[nieuw] = opstelling
  }

  const bevrorenTot = blokIndex(
    stand.kwart,
    blokInKwart(secondenInKwart, nieuwAantal),
    nieuwAantal,
  )
  const bevrorenBlokken: Blok[] = []
  const gespeeldVoor: Record<string, number> = {}
  for (let nieuw = 0; nieuw < bevrorenTot; nieuw++) {
    const bron = blokken[oudIndexVoor(nieuw)]
    const blok: Blok = bron
      ? { ...bron, index: nieuw }
      : { index: nieuw, opstelling: {}, bank: [], waarschuwingen: [] }
    bevrorenBlokken.push(blok)
    for (const id of Object.values(blok.opstelling)) {
      if (id) gespeeldVoor[id] = (gespeeldVoor[id] ?? 0) + 1
    }
  }

  return {
    blokkenPerKwart: nieuwAantal,
    vastgezet,
    bevrorenBlokken,
    bevrorenTot,
    gespeeldVoor,
    // Het blok dat nu loopt is al aangekondigd; anders belt de app meteen.
    alarmTot: Math.max(stand.alarmTot, bevrorenTot),
  }
}

export function useWedstrijd() {
  const [stand, zetStand] = useState<WedstrijdStand>(lees)
  const [nu, zetNu] = useState(() => Date.now())
  const standRef = useRef(stand)
  standRef.current = stand

  useEffect(() => schrijf(stand), [stand])

  // De klok telt uit het verschil met de starttijd, niet door op te tellen.
  // Zo loopt er na 70 minuten niets scheef en klopt de tijd ook als de telefoon
  // tussendoor op slot heeft gestaan.
  useEffect(() => {
    if (!stand.loopt) return
    let animatie = 0
    const tik = () => {
      zetNu(Date.now())
      animatie = window.setTimeout(tik, 200)
    }
    tik()
    return () => window.clearTimeout(animatie)
  }, [stand.loopt])

  const aanwezigen = useMemo(
    () => stand.selectie.filter((s) => stand.aanwezig.includes(s.id)),
    [stand.selectie, stand.aanwezig],
  )

  const rooster: Rooster = useMemo(() => {
    if (!stand.keeperId) {
      return { keeperId: '', blokken: [], gespeeld: {}, waarschuwingen: [] }
    }
    return maakRooster({
      aanwezigen,
      keeperId: stand.keeperId,
      sterkteAchter: stand.sterkteAchter,
      sterkteMidden: stand.sterkteMidden,
      uitgevallen: stand.uitgevallen,
      vastgezet: stand.vastgezet,
      vanafBlok: stand.bevrorenTot,
      gespeeldVoor: stand.bevrorenTot > 0 ? stand.gespeeldVoor : undefined,
      eerdereBlokken: stand.bevrorenBlokken,
      blokkenPerKwart: stand.blokkenPerKwart,
      uitElkaar: UIT_ELKAAR,
    })
  }, [
    aanwezigen,
    stand.keeperId,
    stand.sterkteAchter,
    stand.sterkteMidden,
    stand.uitgevallen,
    stand.vastgezet,
    stand.bevrorenTot,
    stand.bevrorenBlokken,
    stand.gespeeldVoor,
    stand.blokkenPerKwart,
  ])

  const secondenInKwart = verstrekenSeconden(stand, nu)
  const huidigBlok = Math.min(
    aantalBlokken(stand.blokkenPerKwart) - 1,
    blokIndex(stand.kwart, blokInKwart(secondenInKwart, stand.blokkenPerKwart), stand.blokkenPerKwart),
  )
  const kwartVoorbij = secondenInKwart >= KWART_SECONDEN

  const wijzig = useCallback((verandering: Partial<WedstrijdStand>) => {
    zetStand((huidig) => ({ ...huidig, ...verandering }))
  }, [])

  /** Legt alles tot en met het huidige blok vast, zodat herberekenen het verleden niet raakt. */
  const bevries = useCallback(
    (totBlok: number, blokken: Blok[]) => {
      const gespeeld: Record<string, number> = {}
      for (const blok of blokken.slice(0, totBlok)) {
        for (const id of Object.values(blok.opstelling)) {
          if (id) gespeeld[id] = (gespeeld[id] ?? 0) + 1
        }
      }
      return { bevrorenBlokken: blokken.slice(0, totBlok), bevrorenTot: totBlok, gespeeldVoor: gespeeld }
    },
    [],
  )

  /**
   * Legt vast wat er tot nu toe gespeeld is, als de wedstrijd al loopt.
   *
   * Nodig voor alles wat de aanwezigheid verandert terwijl er al gespeeld is:
   * komt er een invalster bij of gaat er iemand naar huis, dan rekent het
   * rooster opnieuw -- en zonder dit ook de blokken die al achter de rug zijn.
   * Dan zou de speeltijd ineens iets anders zeggen dan wat er op het veld
   * gebeurd is.
   *
   * Het blok dat nu loopt gaat mee. Een invalster heeft nul minuten en zou het
   * rooster haar dus meteen het veld in sturen -- midden in een blok, met een
   * andere speelster die zonder belletje of wisselkaart zou moeten vertrekken.
   * Zo komt ze erin bij de volgende wissel, zoals iedereen. Wil de coach haar
   * meteen erin, dan tikt hij haar op het veld.
   */
  const bevriesGespeeld = useCallback(
    (huidig: WedstrijdStand): Partial<WedstrijdStand> => {
      const verstreken = verstrekenSeconden(huidig, Date.now())
      if (huidig.kwart === 1 && verstreken === 0) return {}
      const nu = blokIndex(
        huidig.kwart,
        blokInKwart(verstreken, huidig.blokkenPerKwart),
        huidig.blokkenPerKwart,
      )
      const tot = Math.min(aantalBlokken(huidig.blokkenPerKwart), nu + 1)
      if (tot <= huidig.bevrorenTot) return {}
      return bevries(tot, rooster.blokken)
    },
    [bevries, rooster.blokken],
  )

  const start = useCallback(() => {
    zetStand((huidig) => (huidig.loopt ? huidig : { ...huidig, loopt: true, gestartOp: Date.now() }))
  }, [])

  const pauzeer = useCallback(() => {
    zetStand((huidig) => {
      if (!huidig.loopt) return huidig
      return {
        ...huidig,
        loopt: false,
        secondenInKwart: verstrekenSeconden(huidig, Date.now()),
        gestartOp: null,
      }
    })
  }, [])

  const volgendKwart = useCallback(() => {
    zetStand((huidig) => {
      if (huidig.kwart >= AANTAL_KWARTEN) return { ...huidig, loopt: false, gestartOp: null }
      return {
        ...huidig,
        kwart: huidig.kwart + 1,
        secondenInKwart: 0,
        loopt: false,
        gestartOp: null,
      }
    })
  }, [])

  /** Springt naar het begin van het volgende blok; handig als je te laat wisselt. */
  const volgendBlok = useCallback(() => {
    zetStand((huidig) => {
      const verstreken = verstrekenSeconden(huidig, Date.now())
      const volgende = blokInKwart(verstreken, huidig.blokkenPerKwart) + 1
      if (volgende >= huidig.blokkenPerKwart) {
        if (huidig.kwart >= AANTAL_KWARTEN) {
          return { ...huidig, secondenInKwart: KWART_SECONDEN, loopt: false, gestartOp: null }
        }
        return { ...huidig, kwart: huidig.kwart + 1, secondenInKwart: 0, loopt: false, gestartOp: null }
      }
      return {
        ...huidig,
        secondenInKwart: volgende * blokSeconden(huidig.blokkenPerKwart),
        gestartOp: huidig.loopt ? Date.now() : null,
      }
    })
  }, [])

  const zetUitgevallen = useCallback(
    (id: string, uitgevallen: boolean) => {
      zetStand((huidig) => {
        const blokken = rooster.blokken
        const vanaf = Math.min(
          aantalBlokken(huidig.blokkenPerKwart),
          blokIndex(
            huidig.kwart,
            blokInKwart(verstrekenSeconden(huidig, Date.now()), huidig.blokkenPerKwart),
            huidig.blokkenPerKwart,
          ),
        )
        return {
          ...huidig,
          ...bevries(vanaf, blokken),
          uitgevallen: uitgevallen
            ? [...new Set([...huidig.uitgevallen, id])]
            : huidig.uitgevallen.filter((u) => u !== id),
        }
      })
    },
    [bevries, rooster.blokken],
  )

  /**
   * Zet een speelster handmatig op een positie -- en laat de rest van dit blok
   * exact staan zoals het stond.
   *
   * Eerder werd alleen die ene plek vastgelegd en mocht het rooster de andere
   * negen opnieuw invullen. Dat gaf precies wat je langs de lijn niet kunt
   * gebruiken: je verzet één speelster en er schuiven er drie mee, terwijl je
   * de opstelling al hebt doorgegeven. Daarom wordt nu het hele blok vastgezet:
   * de opstelling zoals hij op het scherm staat, met alleen die ene ruil erin
   * verwerkt (`opstellingMet`). Het rooster heeft er dan geen speelruimte meer
   * en kan er dus ook niets anders in veranderen.
   *
   * De blokken die nog komen worden wél opnieuw berekend -- daar hoort de
   * speeltijd zich juist aan te passen aan wat de coach net heeft gedaan.
   */
  const zetOpPositie = useCallback(
    (blok: number, positie: Positie, speelsterId: string | null) => {
      zetStand((huidig) => {
        const huidigeOpstelling = rooster.blokken[blok]?.opstelling ?? huidig.vastgezet[blok] ?? {}
        // Een wisselmoment verderop in de wedstrijd: dan hoeven de blokken
        // ertussen niet vast. Die mag het rooster juist opnieuw rekenen, zodat
        // de speeltijd rond blijft om wat de coach heeft gekozen. Alleen wat
        // gespeeld is en het blok dat nu loopt liggen vast.
        const nu = blokIndex(
          huidig.kwart,
          blokInKwart(verstrekenSeconden(huidig, Date.now()), huidig.blokkenPerKwart),
          huidig.blokkenPerKwart,
        )
        const vastleggen = blok > nu ? bevriesGespeeld(huidig) : bevries(blok, rooster.blokken)
        // Vóór de aftrap ligt er nog niets vast, dus zou ook de startopstelling
        // meeschuiven met een wissel verderop. Die heeft de coach net gezien en
        // misschien al doorgegeven; die zetten we dus vast zoals hij er staat.
        const nuOpstelling = rooster.blokken[nu]?.opstelling
        const startVast =
          blok > nu && vastleggen.bevrorenTot === undefined && nu >= huidig.bevrorenTot &&
          !huidig.vastgezet[nu] && nuOpstelling
            ? { [nu]: nuOpstelling }
            : {}
        return {
          ...huidig,
          ...vastleggen,
          vastgezet: {
            ...huidig.vastgezet,
            ...startVast,
            [blok]: opstellingMet(huidigeOpstelling, positie, speelsterId),
          },
        }
      })
    },
    [bevries, bevriesGespeeld, rooster.blokken],
  )

  /** Geeft dit blok terug aan de app: het voorstel van het rooster geldt weer. */
  const wisVastgezet = useCallback((blok: number) => {
    zetStand((huidig) => {
      if (!huidig.vastgezet[blok]) return huidig
      const rest = { ...huidig.vastgezet }
      delete rest[blok]
      return { ...huidig, vastgezet: rest }
    })
  }, [])

  /**
   * Kies hoe vaak er per kwart gewisseld wordt.
   *
   * Mag ook midden in de wedstrijd: staan ze te hijgen, dan wil je vaker
   * kunnen wisselen dan je vooraf dacht. Wat er al gespeeld is verhuist dan
   * mee naar de nieuwe indeling, zodat de speeltijd blijft kloppen.
   */
  const zetBlokkenPerKwart = useCallback(
    (aantal: number, zelfGekozen = true) => {
      const nieuw = geldigeBlokkenPerKwart(aantal)
      zetStand((huidig) => {
        if (huidig.blokkenPerKwart === nieuw && huidig.wisselZelfGekozen === zelfGekozen) {
          return huidig
        }
        return {
          ...huidig,
          wisselZelfGekozen: zelfGekozen,
          ...herindeel(huidig, nieuw, rooster.blokken, verstrekenSeconden(huidig, Date.now())),
        }
      })
    },
    [rooster.blokken],
  )

  /** Terug naar het advies van de app, en het blijft het advies volgen. */
  const volgWisselAdvies = useCallback(
    (aantal: number) => zetBlokkenPerKwart(aantal, false),
    [zetBlokkenPerKwart],
  )

  /**
   * Voegt een speelster toe die niet in de vaste selectie staat.
   *
   * Invalsters uit een ander team zijn geen uitzondering maar de regel: er is
   * altijd wel een weekend waarin er drie afzeggen en er twee uit de C2
   * meekomen. Zonder deze knop staat de app dan stil terwijl de wedstrijd
   * begint. Ze krijgt alle drie de linies mee en geen centrale plek -- dat is
   * de veilige aanname voor iemand die je niet kent, en de coach kan het met
   * dezelfde knoppen bijstellen als bij de rest.
   */
  const voegSpeelsterToe = useCallback((naam: string) => {
    const schoon = naam.trim()
    if (!schoon) return
    zetStand((huidig) => {
      const speelster: Speelster = {
        id: `extra-${Date.now().toString(36)}-${huidig.selectie.length}`,
        naam: schoon,
        linies: [...LINIES],
        centraal: [],
      }
      return {
        ...huidig,
        ...bevriesGespeeld(huidig),
        selectie: [...huidig.selectie, speelster],
        aanwezig: [...huidig.aanwezig, speelster.id],
      }
    })
  }, [bevriesGespeeld])

  /** Haalt een zelf toegevoegde speelster weer weg; de vaste selectie blijft. */
  const verwijderSpeelster = useCallback((id: string) => {
    if (isVasteSpeelster(id)) return
    zetStand((huidig) => ({
      ...huidig,
      selectie: huidig.selectie.filter((s) => s.id !== id),
      aanwezig: huidig.aanwezig.filter((a) => a !== id),
      keeperId: huidig.keeperId === id ? null : huidig.keeperId,
      uitgevallen: huidig.uitgevallen.filter((u) => u !== id),
      sterkteAchter: huidig.sterkteAchter.filter((s) => s !== id),
      sterkteMidden: huidig.sterkteMidden.filter((s) => s !== id),
    }))
  }, [])

  /**
   * Zet centraal aan of uit voor één speelster in één linie.
   *
   * Per linie, want dat verschilt echt: iemand kan prima laatste vrouw zijn
   * zonder dat ze het centrale middenveld aankan. Blijft bewaard tussen
   * wedstrijden.
   */
  const zetCentraal = useCallback((id: string, linie: Linie, aan: boolean) => {
    zetStand((huidig) => ({
      ...huidig,
      selectie: huidig.selectie.map((s) =>
        s.id === id
          ? {
              ...s,
              centraal: aan
                ? [...new Set([...s.centraal, linie])]
                : s.centraal.filter((l) => l !== linie),
            }
          : s,
      ),
    }))
  }, [])

  /**
   * Zet een linie aan of uit voor één speelster.
   *
   * Twee dingen zitten eraan vast. Zonder linie kan ze nergens staan, dus haar
   * laatste linie weghalen mag niet -- dat levert een speelster op die het
   * rooster alleen maar in de weg zit. En haalt de leider een linie weg, dan
   * gaat de centraal-vlag voor díe linie mee: "centraal op het middenveld"
   * betekent niets meer zodra ze het middenveld niet meer speelt, en zo'n
   * onzichtbare rest zorgt er alleen maar voor dat de rij iets anders zegt dan
   * er in de gegevens staat.
   */
  const zetLinie = useCallback((id: string, linie: Linie, aan: boolean) => {
    zetStand((huidig) => ({
      ...huidig,
      selectie: huidig.selectie.map((s) => {
        if (s.id !== id) return s
        if (!aan && s.linies.length <= 1) return s
        return {
          ...s,
          // Altijd van achter naar voren, zodat "Verdediging / Aanval" niet
          // ineens als "Aanval / Verdediging" in de rij komt te staan.
          linies: aan
            ? LINIES.filter((l) => l === linie || s.linies.includes(l))
            : s.linies.filter((l) => l !== linie),
          centraal: aan ? s.centraal : s.centraal.filter((l) => l !== linie),
        }
      }),
    }))
  }, [])

  /**
   * Draait de handmatige aanpassingen aan de vaste selectie terug.
   *
   * Zelf toegevoegde speelsters blijven staan: die zijn geen aanpassing van de
   * selectie maar de enige plek waar ze bestaan, en ze weggooien terwijl de
   * invalster naast je staat is geen herstel maar verlies.
   */
  const herstelSelectie = useCallback(() => {
    zetStand((huidig) => ({
      ...huidig,
      selectie: [...SELECTIE, ...huidig.selectie.filter((s) => !isVasteSpeelster(s.id))],
    }))
  }, [])

  /**
   * Klokversnelling voor de oefenwedstrijd. Legt eerst de al verstreken tijd
   * vast, anders zou de nieuwe factor met terugwerkende kracht op de hele
   * lopende periode worden toegepast en springt de klok.
   */
  const zetSnelheid = useCallback((snelheid: number) => {
    if (!OEFENMODUS) return
    zetStand((huidig) => ({
      ...huidig,
      secondenInKwart: verstrekenSeconden(huidig, Date.now()),
      gestartOp: huidig.loopt ? Date.now() : null,
      snelheid,
    }))
  }, [])

  /**
   * Terug naar de voorbereidingsschermen zonder de wedstrijd weg te gooien.
   * Zonder dit zit je vast zodra de wedstrijd eenmaal begonnen is: de enige uitweg
   * was "Opnieuw", en dat wist alles.
   */
  const naarVoorbereiding = useCallback(() => {
    zetStand((huidig) => ({
      ...huidig,
      // Op de voorbereidingsschermen kan de aanwezigheid nog veranderen; wat al
      // gespeeld is mag daar niet door omvallen.
      ...bevriesGespeeld(huidig),
      fase: 'aanwezigheid',
      loopt: false,
      secondenInKwart: verstrekenSeconden(huidig, Date.now()),
      gestartOp: null,
    }))
  }, [bevriesGespeeld])

  /**
   * Wist de wedstrijd, maar niet de selectie.
   *
   * De centrale posities per linie zet de leider bewust in en die horen bij het
   * team, niet bij deze wedstrijd -- die moeten een nieuwe wedstrijd dus
   * overleven. Wie ook die terug wil, gebruikt `wisAlles`.
   */
  const herstart = useCallback(() => {
    const selectie = standRef.current.selectie
    // Ook de invalsters die erbij gezet zijn: die staan niet in `SELECTIE`, dus
    // zonder dit zouden ze wel in de lijst blijven maar niet meer aangevinkt.
    zetStand({ ...standaardStand(), selectie, aanwezig: selectie.map((s) => s.id) })
  }, [])

  /**
   * Alles terug naar hoe de app uit de doos komt: wedstrijd én selectie.
   *
   * Gooit ook de opgeslagen stand weg in plaats van er een verse overheen te
   * schrijven. Dat is de enige uitweg als er ooit iets in de opslag staat waar
   * de app niet mee overweg kan.
   */
  const wisAlles = useCallback(() => {
    try {
      localStorage.removeItem(OPSLAG_SLEUTEL)
    } catch {
      // Opslag kan geweigerd worden; de stand in het geheugen gaat sowieso terug.
    }
    zetStand(standaardStand())
  }, [])

  const markeerAlarm = useCallback((blok: number) => {
    zetStand((huidig) => (huidig.alarmTot >= blok ? huidig : { ...huidig, alarmTot: blok }))
  }, [])

  return {
    stand,
    wijzig,
    aanwezigen,
    rooster,
    secondenInKwart,
    huidigBlok,
    kwartVoorbij,
    start,
    pauzeer,
    volgendKwart,
    volgendBlok,
    zetUitgevallen,
    zetOpPositie,
    wisVastgezet,
    zetBlokkenPerKwart,
    volgWisselAdvies,
    voegSpeelsterToe,
    verwijderSpeelster,
    zetCentraal,
    zetLinie,
    herstelSelectie,
    zetSnelheid,
    naarVoorbereiding,
    herstart,
    wisAlles,
    markeerAlarm,
  }
}

/** Hoort deze speelster bij de vaste selectie, of is ze er deze wedstrijd bij gezet? */
export function isVasteSpeelster(id: string): boolean {
  return SELECTIE.some((s) => s.id === id)
}

/** Standaard sterkte-volgorde: op selectievolgorde, de leider sleept hem daarna goed. */
export function standaardSterkte(aanwezigen: Speelster[], positie: 'LV' | 'CM'): string[] {
  return aanwezigen.filter((s) => magOpPositie(s, positie)).map((s) => s.id)
}
