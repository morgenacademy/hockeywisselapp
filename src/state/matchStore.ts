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
import type { Positie } from '../domain/formation'
import { SELECTIE, magOpPositie, type Speelster } from '../domain/players'
import { maakRooster, type Blok, type Opstelling, type Rooster } from '../domain/schedule'
import { OEFENMODUS, STANDAARD_OEFENSNELHEID } from '../oefenmodus'

export type Fase = 'aanwezigheid' | 'keeper' | 'sterkte' | 'wedstrijd'

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
}

const OPSLAG_SLEUTEL = 'hockeywissel.wedstrijd.v1'

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
  }
}

function lees(): WedstrijdStand {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL)
    if (!ruw) return standaardStand()
    const bewaard = JSON.parse(ruw) as Partial<WedstrijdStand>
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

  /** Zet `centraal` aan of uit voor één speelster; blijft bewaard tussen wedstrijden. */
  const zetCentraal = useCallback((id: string, centraal: boolean) => {
    zetStand((huidig) => ({
      ...huidig,
      selectie: huidig.selectie.map((s) => (s.id === id ? { ...s, centraal } : s)),
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

  const herstart = useCallback(() => {
    zetStand({ ...standaardStand(), selectie: standRef.current.selectie })
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
    herstelSelectie,
    zetSnelheid,
    herstart,
    markeerAlarm,
  }
}

/** Standaard sterkte-volgorde: op selectievolgorde, de leider sleept hem daarna goed. */
export function standaardSterkte(aanwezigen: Speelster[], positie: 'LV' | 'CM'): string[] {
  return aanwezigen.filter((s) => magOpPositie(s, positie)).map((s) => s.id)
}
