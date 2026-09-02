import { POSITIES, type Positie, type PositieInfo } from '../domain/formation'

/**
 * Officieel hockeyveld: 91,40 x 55,00 m, cirkelradius 14,63 m, 23m-lijnen.
 * Staand getekend met de eigen achterlijn onderaan, zodat de opstelling op een
 * telefoon leest zoals je hem vanaf de zijlijn ziet.
 */
const LENGTE = 91.4
const BREEDTE = 55
const CIRKEL_STRAAL = 14.63
const RAND = 3

export interface VeldSpeler {
  positie: Positie
  naam: string
  linieKleur: string
  /** Buiten haar voorkeurslinie of noodbezetting: krijgt een opvallende rand. */
  markering?: 'buitenLinie' | 'nood'
  /** Kwam bij de laatste wissel het veld in. */
  gewisseld?: boolean
  /** Moet er bij de volgende wissel af; krijgt een rode rand en een vlaggetje. */
  gaatEruit?: boolean
  /** Schuift bij de volgende wissel naar een andere plek. */
  schuiftDoor?: boolean
}

interface Props {
  spelers: VeldSpeler[]
  keeperNaam?: string
  onKies?: (positie: Positie) => void
  gekozen?: Positie | null
}

/** Cirkel (D) rond het doel: kwartcirkels vanaf de doelpalen plus een recht stuk. */
function cirkelPad(onder: boolean): string {
  const doelBreedte = 3.66
  const y = onder ? 0 : LENGTE
  const richting = onder ? 1 : -1
  const links = BREEDTE / 2 - doelBreedte / 2
  const rechts = BREEDTE / 2 + doelBreedte / 2
  const boog = onder ? 0 : 1
  return [
    `M ${links - CIRKEL_STRAAL} ${y}`,
    `A ${CIRKEL_STRAAL} ${CIRKEL_STRAAL} 0 0 ${boog} ${links} ${y + CIRKEL_STRAAL * richting}`,
    `L ${rechts} ${y + CIRKEL_STRAAL * richting}`,
    `A ${CIRKEL_STRAAL} ${CIRKEL_STRAAL} 0 0 ${boog} ${rechts + CIRKEL_STRAAL} ${y}`,
  ].join(' ')
}

/**
 * Namen als "Priscilla" zijn breder dan de cirkel. `textLength` perst die
 * netjes samen in plaats van ze te laten overlopen; korte namen blijven
 * ongemoeid.
 */
function Naam({ tekst }: { tekst: string }) {
  const past = tekst.length <= 6
  return (
    <text
      className="veld-naam"
      y={0.9}
      textLength={past ? undefined : 8.4}
      lengthAdjust={past ? undefined : 'spacingAndGlyphs'}
    >
      {tekst}
    </text>
  )
}

/**
 * Vlaggetje boven een speelster. Op een vol veld staat het al snel over het
 * positielabel van de rij erboven, dus het krijgt een eigen ondergrond -- dan
 * blijft het leesbaar waar het ook terechtkomt.
 */
function Vlag({ tekst, soort }: { tekst: string; soort: 'eruit' | 'schuif' }) {
  const breedte = tekst.length * 1.35 + 1.8
  return (
    <g className={`veld-vlag ${soort}-vlag`}>
      <rect x={-breedte / 2} y={-9.3} width={breedte} height={3.1} rx={1.5} />
      <text y={-7.0}>{tekst}</text>
    </g>
  )
}

/**
 * Waar een positie op het veld staat. De eigen achterlijn ligt onderaan;
 * `positie.y` loopt van achterin (0) naar voorin (1) en wordt hier op het
 * speelvlak boven de keeper gelegd.
 */
function plek(positie: PositieInfo): { x: number; y: number } {
  return { x: positie.x * BREEDTE, y: LENGTE * (0.8 - positie.y * 0.7) }
}

export function Field({ spelers, keeperNaam, onKies, gekozen }: Props) {
  const perPositie = new Map(spelers.map((s) => [s.positie, s]))

  return (
    <svg
      className="veld"
      viewBox={`${-RAND} ${-RAND} ${BREEDTE + RAND * 2} ${LENGTE + RAND * 2}`}
      role="img"
      aria-label="Opstelling op het veld"
    >
      <rect x={-RAND} y={-RAND} width={BREEDTE + RAND * 2} height={LENGTE + RAND * 2} className="veld-gras" />
      <g className="veld-lijnen">
        <rect x={0} y={0} width={BREEDTE} height={LENGTE} />
        <line x1={0} y1={LENGTE / 2} x2={BREEDTE} y2={LENGTE / 2} />
        <line x1={0} y1={22.9} x2={BREEDTE} y2={22.9} />
        <line x1={0} y1={LENGTE - 22.9} x2={BREEDTE} y2={LENGTE - 22.9} />
        <path d={cirkelPad(true)} />
        <path d={cirkelPad(false)} />
        <line x1={BREEDTE / 2 - 1.83} y1={-0.6} x2={BREEDTE / 2 + 1.83} y2={-0.6} className="veld-doel" />
        <line x1={BREEDTE / 2 - 1.83} y1={LENGTE + 0.6} x2={BREEDTE / 2 + 1.83} y2={LENGTE + 0.6} className="veld-doel" />
      </g>

      {keeperNaam && (
        <g className="veld-speler keeper" transform={`translate(${BREEDTE / 2} ${LENGTE * 0.93})`}>
          <circle r={4.6} />
          <Naam tekst={keeperNaam} />
          <text className="veld-positie" y={7.1}>KEEPER</text>
        </g>
      )}

      {POSITIES.map((positie) => {
        const speler = perPositie.get(positie.code)
        const { x, y } = plek(positie)
        const klassen = [
          'veld-speler',
          speler?.markering ? `markering-${speler.markering}` : '',
          speler?.gewisseld ? 'gewisseld' : '',
          speler?.gaatEruit ? 'gaat-eruit' : '',
          speler?.schuiftDoor ? 'schuift-door' : '',
          gekozen === positie.code ? 'gekozen' : '',
          onKies ? 'klikbaar' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <g
            key={positie.code}
            className={klassen}
            transform={`translate(${x} ${y})`}
            onClick={onKies ? () => onKies(positie.code) : undefined}
            role={onKies ? 'button' : undefined}
            tabIndex={onKies ? 0 : undefined}
            aria-label={`${positie.naam}: ${speler?.naam ?? 'leeg'}`}
          >
            {speler?.gaatEruit && <circle className="halo" r={6.2} />}
            <circle r={4.6} style={speler ? { fill: speler.linieKleur } : undefined} />
            <Naam tekst={speler?.naam ?? '—'} />
            <text className="veld-positie" y={7.1}>{positie.code}</text>
          </g>
        )
      })}

      {/* Vlaggen als laatste, zodat ze nooit onder het positielabel van de rij
          erboven verdwijnen. */}
      {POSITIES.map((positie) => {
        const speler = perPositie.get(positie.code)
        if (!speler?.gaatEruit && !speler?.schuiftDoor) return null
        const { x, y } = plek(positie)
        return (
          <g key={`vlag-${positie.code}`} transform={`translate(${x} ${y})`}>
            {speler.gaatEruit ? (
              <Vlag tekst="ERUIT" soort="eruit" />
            ) : (
              <Vlag tekst="SCHUIFT" soort="schuif" />
            )}
          </g>
        )
      })}
    </svg>
  )
}
