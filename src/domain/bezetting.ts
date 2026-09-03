import { AANTAL_BLOKKEN } from './clock'
import { AANTAL_VELDPOSITIES, LINIE_NAAM, POSITIES, type Linie } from './formation'
import { centraalLinies, kanCentraal, magOpPositie, type Speelster } from './players'

/**
 * Hoeveel speelsters heb je nodig voor een groep posities?
 *
 * Twee eisen, en het advies is de hoogste van de twee.
 *
 * **1. Genoeg speeltijd om de plekken te vullen.** Bij V veldspeelsters speelt
 * iedereen 120/V van de twaalf blokken. Een groep van k plekken moet samen
 * k × 12 blokken vullen:
 *
 *     P × 120/V ≥ 12k   ⇒   P ≥ k × V / 10
 *
 * Oftewel: een positiegroep moet minstens haar eigen aandeel van de selectie
 * zijn. Vier van de tien plekken achterin? Dan minstens vier tiende van je
 * veldspeelsters.
 *
 * **2. Twee moeten tegelijk kunnen rusten.** Anders ontwijken hun rustbeurten
 * elkaar en staan ze nooit samen in het veld -- precies wat er met Nora en Kiki
 * op het centrale middenveld gebeurde. Na hun rust moeten er nog k overblijven:
 *
 *     P ≥ k + 2
 *
 * Die tweede eis geldt alleen als er überhaupt gerust wordt; bij tien
 * veldspeelsters speelt iedereen alles en volstaat precies k.
 *
 * **Wat dit niet vangt.** Het is een telling per groep, en speelsters kunnen in
 * meerdere groepen zitten -- wie verdediging én middenveld speelt telt twee keer
 * mee maar kan maar op één plek tegelijk staan. Het advies halen is daarom een
 * sterke indicatie, geen garantie: gemeten over alle bezettingen en
 * keeperkeuzes levert het in 62 van de 63 gevallen een schema zonder
 * linieproblemen op. De ene uitzondering zit precies op de grens, zonder
 * speling. Ruim boven het advies zitten is dus beter dan er net aan komen.
 */
export function benodigd(plekken: number, veldSpeelsters: number): { minimum: number; advies: number } {
  const minimum = plekken
  if (veldSpeelsters <= AANTAL_VELDPOSITIES) return { minimum, advies: plekken }
  const aandeel = Math.ceil((plekken * veldSpeelsters) / AANTAL_VELDPOSITIES)
  return { minimum, advies: Math.max(aandeel, plekken + 2) }
}

export type GroepStatus = 'goed' | 'krap' | 'tekort'

export interface GroepAdvies {
  sleutel: string
  naam: string
  /** Waar dit over gaat, kort genoeg voor een tabelregel. */
  toelichting: string
  plekken: number
  aanwezig: number
  minimum: number
  advies: number
  status: GroepStatus
  /** De linie waarvoor je centraal kunt aanzetten; alleen bij de centrale groepen. */
  linie?: Linie
  /**
   * Wie je met de centraal-knop kunt aanvullen. Alleen gevuld voor LV/CV en CM:
   * de linies volgen uit wie er is en zijn niet met een knop op te lossen.
   */
  aanTeVullen: Speelster[]
}

/** De posities per linie, zodat de linie-eis uit dezelfde bron komt als het veld. */
function plekkenInLinie(linie: Linie): number {
  return POSITIES.filter((p) => p.linie === linie).length
}

/**
 * Hoe staat de bezetting ervoor, per positiegroep?
 *
 * Vijf groepen: de twee centrale groepen die je met de centraal-knop kunt
 * bijsturen, en de drie linies die volgen uit wie er is.
 */
export function bezettingsAdvies(aanwezigen: Speelster[], keeperId: string | null): GroepAdvies[] {
  const veld = aanwezigen.filter((s) => s.id !== keeperId)
  // Is de keeper nog niet gekozen, dan telt iedereen nog mee in `veld` -- maar
  // er gaat er straks één keepen. Voor het aantal veldspeelsters rekenen we die
  // er alvast af, anders staat het advies op het aanwezigheidsscherm te hoog.
  // Wie het wordt is nog onbekend, dus de groepstellingen blijven over iedereen
  // gaan; het keeperscherm rekent het daarna exact na.
  const V = keeperId ? veld.length : Math.max(0, veld.length - 1)

  const maak = (
    sleutel: string,
    naam: string,
    toelichting: string,
    plekken: number,
    telt: (s: Speelster) => boolean,
    aanvulLinie?: Linie,
  ): GroepAdvies => {
    const { minimum, advies } = benodigd(plekken, V)
    const aanwezigInGroep = veld.filter(telt).length
    const status: GroepStatus =
      aanwezigInGroep < minimum ? 'tekort' : aanwezigInGroep < advies ? 'krap' : 'goed'
    // Wie zou deze groep aanvullen als je bij haar centraal aanzet voor déze
    // linie? Speelsters die de linie spelen maar er nog niet centraal staan.
    const aanTeVullen = aanvulLinie
      ? veld.filter((s) => centraalLinies(s).includes(aanvulLinie) && !kanCentraal(s, aanvulLinie))
      : []
    return {
      sleutel, naam, toelichting, plekken,
      aanwezig: aanwezigInGroep, minimum, advies, status, aanTeVullen,
      linie: aanvulLinie,
    }
  }

  return [
    maak(
      'centraalAchter',
      'Centraal achterin',
      'laatste vrouw en centrale verdediger',
      2,
      (s) => magOpPositie(s, 'LV'),
      'V',
    ),
    maak(
      'centraalMidden',
      'Centraal middenveld',
      'centrale middenveld',
      1,
      (s) => magOpPositie(s, 'CM'),
      'M',
    ),
    ...(['V', 'M', 'A'] as Linie[]).map((linie) =>
      maak(
        `linie${linie}`,
        LINIE_NAAM[linie],
        `${plekkenInLinie(linie)} plekken per blok`,
        plekkenInLinie(linie),
        (s) => s.linies.includes(linie),
      ),
    ),
  ]
}

/** Blokkeert de bezetting het starten van de wedstrijd? */
export function heeftTekort(advies: GroepAdvies[]): boolean {
  return advies.some((g) => g.status === 'tekort')
}

/** Hoeveel blokken speelt iedereen bij dit aantal veldspeelsters? */
export function blokkenPerSpeelster(veldSpeelsters: number): number {
  if (veldSpeelsters <= 0) return 0
  return (AANTAL_BLOKKEN * AANTAL_VELDPOSITIES) / veldSpeelsters
}
