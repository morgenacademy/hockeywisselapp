import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AANTAL_BLOKKEN,
  BLOKKEN_PER_KWART,
  BLOK_SECONDEN,
  KWART_SECONDEN,
  blokIndex,
  blokInKwart,
  verstrekenMet,
} from '../domain/clock'
import { LINIES, type Linie, type Positie } from '../domain/formation'
import { SELECTIE, magOpPositie, type Speelster } from '../domain/players'
import { maakRooster, type Blok, type Opstelling, type Rooster } from '../domain/schedule'
import { OEFENMODUS, STANDAARD_OEFENSNELHEID } from '../oefenmodus'

export type Fase = 'aanwezigheid' | 'keeper' | 'sterkte' | 'opstelling' | 'wedstrijd'

export interface WedstrijdStand {
  fase: Fase
  selectie: Speelster[]
  aanwezig: string[]
  keeperId: string | null
  sterkteAchter: string[]
  sterkteMidden: string[]
  uitgevallen: string[]
  vastgezet: Record<number, Opstelling>
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
 */
const OPSLAG_VERSIE = 3

function standaardStand(): WedstrijdStand {
  return {
    fase: 'aanwezigheid',
    selectie: SELECTIE,
    aanwezig: SELECTIE.map((s) => s.id),
    keeperId: null,
    sterkteAchter: [],
    sterkteMidden: [],
    uitgevallen: [],
    vastgezet: {},
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

function lees(): WedstrijdStand {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL)
    if (!ruw) return standaardStand()
    const bewaard = JSON.parse(ruw) as Partial<WedstrijdStand>
    // Een stand van een oudere versie kan velden missen of anders bedoeld zijn.
    // Hem half terugzetten geeft rare toestanden -- meteen in een oude wedstrijd
    // belanden zonder weg terug, of een crash op een veranderd veld.
    if (bewaard.versie !== OPSLAG_VERSIE) return standaardStand()
    if (bewaard.selectie !== undefined && !selectieIsGeldig(bewaard.selectie)) {
      return standaardStand()
    }
    return { ...standaardStand(), ...bewaard }
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
  ])

  const secondenInKwart = verstrekenSeconden(stand, nu)
  const huidigBlok = Math.min(
    AANTAL_BLOKKEN - 1,
    blokIndex(stand.kwart, blokInKwart(secondenInKwart)),
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
      if (huidig.kwart >= 4) return { ...huidig, loopt: false, gestartOp: null }
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
      const volgende = blokInKwart(verstreken) + 1
      if (volgende >= BLOKKEN_PER_KWART) {
        if (huidig.kwart >= 4) return { ...huidig, secondenInKwart: KWART_SECONDEN, loopt: false, gestartOp: null }
        return { ...huidig, kwart: huidig.kwart + 1, secondenInKwart: 0, loopt: false, gestartOp: null }
      }
      return {
        ...huidig,
        secondenInKwart: volgende * BLOK_SECONDEN,
        gestartOp: huidig.loopt ? Date.now() : null,
      }
    })
  }, [])

  const zetUitgevallen = useCallback(
    (id: string, uitgevallen: boolean) => {
      zetStand((huidig) => {
        const blokken = rooster.blokken
        const vanaf = Math.min(
          AANTAL_BLOKKEN,
          blokIndex(huidig.kwart, blokInKwart(verstrekenSeconden(huidig, Date.now()))),
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

  /** Zet een speelster handmatig op een positie, vanaf het huidige blok. */
  const zetOpPositie = useCallback(
    (blok: number, positie: Positie, speelsterId: string | null) => {
      zetStand((huidig) => {
        const bestaand = { ...(huidig.vastgezet[blok] ?? {}) }
        // Stond ze al ergens anders vastgezet in dit blok? Dan die plek vrijgeven.
        for (const [plek, id] of Object.entries(bestaand)) {
          if (id === speelsterId) delete bestaand[plek as Positie]
        }
        if (speelsterId) bestaand[positie] = speelsterId
        else delete bestaand[positie]
        return {
          ...huidig,
          ...bevries(blok, rooster.blokken),
          vastgezet: { ...huidig.vastgezet, [blok]: bestaand },
        }
      })
    },
    [bevries, rooster.blokken],
  )

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

  /** Draait alle handmatige aanpassingen aan de selectie terug. */
  const herstelSelectie = useCallback(() => {
    zetStand((huidig) => ({ ...huidig, selectie: SELECTIE }))
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
      fase: 'aanwezigheid',
      loopt: false,
      secondenInKwart: verstrekenSeconden(huidig, Date.now()),
      gestartOp: null,
    }))
  }, [])

  /**
   * Wist de wedstrijd, maar niet de selectie.
   *
   * De centrale posities per linie zet de leider bewust in en die horen bij het
   * team, niet bij deze wedstrijd -- die moeten een nieuwe wedstrijd dus
   * overleven. Wie ook die terug wil, gebruikt `wisAlles`.
   */
  const herstart = useCallback(() => {
    zetStand({ ...standaardStand(), selectie: standRef.current.selectie })
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

/** Standaard sterkte-volgorde: op selectievolgorde, de leider sleept hem daarna goed. */
export function standaardSterkte(aanwezigen: Speelster[], positie: 'LV' | 'CM'): string[] {
  return aanwezigen.filter((s) => magOpPositie(s, positie)).map((s) => s.id)
}
