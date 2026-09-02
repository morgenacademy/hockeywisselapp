/**
 * Opstelling 4-3-3 met 10 veldposities + keeper.
 *
 *           LA        SP        RA        Aanval
 *           LM        CM        RM        Middenveld
 *      LB   LV        CV   RB            Verdediging
 *                KEEPER
 */

export type Linie = 'V' | 'M' | 'A'

export const LINIE_NAAM: Record<Linie, string> = {
  V: 'Verdediging',
  M: 'Middenveld',
  A: 'Aanval',
}

export type Positie =
  | 'LB' | 'LV' | 'CV' | 'RB'
  | 'LM' | 'CM' | 'RM'
  | 'LA' | 'SP' | 'RA'

export type VeldPlek = Positie | 'KEEPER'

export interface PositieInfo {
  code: Positie
  naam: string
  linie: Linie
  /** Sleutelposities (laatste vrouw, centrale verdediger, centrale middenveld). */
  sleutel: boolean
  /** Plek op het veld, 0..1 vanaf de eigen achterlijn (y) en vanaf links (x). */
  x: number
  y: number
}

export const POSITIES: readonly PositieInfo[] = [
  { code: 'LB', naam: 'Linksback',            linie: 'V', sleutel: false, x: 0.16, y: 0.20 },
  { code: 'LV', naam: 'Laatste vrouw',        linie: 'V', sleutel: true,  x: 0.39, y: 0.13 },
  { code: 'CV', naam: 'Centrale verdediger',  linie: 'V', sleutel: true,  x: 0.61, y: 0.22 },
  { code: 'RB', naam: 'Rechtsback',           linie: 'V', sleutel: false, x: 0.84, y: 0.20 },
  { code: 'LM', naam: 'Linksmid',             linie: 'M', sleutel: false, x: 0.18, y: 0.46 },
  { code: 'CM', naam: 'Centrale middenveld',  linie: 'M', sleutel: true,  x: 0.50, y: 0.42 },
  { code: 'RM', naam: 'Rechtsmid',            linie: 'M', sleutel: false, x: 0.82, y: 0.46 },
  { code: 'LA', naam: 'Linksvoor',            linie: 'A', sleutel: false, x: 0.20, y: 0.72 },
  { code: 'SP', naam: 'Spits',                linie: 'A', sleutel: false, x: 0.50, y: 0.80 },
  { code: 'RA', naam: 'Rechtsvoor',           linie: 'A', sleutel: false, x: 0.80, y: 0.72 },
] as const

export const POSITIE_CODES: readonly Positie[] = POSITIES.map((p) => p.code)

const POSITIE_INDEX = new Map<Positie, PositieInfo>(POSITIES.map((p) => [p.code, p]))

export function positieInfo(code: Positie): PositieInfo {
  const info = POSITIE_INDEX.get(code)
  if (!info) throw new Error(`Onbekende positie: ${code}`)
  return info
}

export const SLEUTELPOSITIES: readonly Positie[] = POSITIES.filter((p) => p.sleutel).map((p) => p.code)

/**
 * Vulvolgorde voor de solver: de sleutelposities eerst, want die zijn het
 * schaarst. Daarna de overige plekken per linie.
 */
export const VULVOLGORDE: readonly Positie[] = [
  'LV', 'CV', 'CM',
  'LB', 'RB',
  'LM', 'RM',
  'LA', 'SP', 'RA',
]

export const AANTAL_VELDPOSITIES = POSITIES.length // 10, keeper niet meegerekend
