import type { Linie, Positie } from './formation'
import { POSITIES, positieInfo } from './formation'

export interface Speelster {
  id: string
  naam: string
  /** Voorkeurslinies. */
  linies: Linie[]
  /**
   * In welke van haar linies kan ze de centrale plek aan?
   *
   * Per linie, want dat verschilt: iemand die verdediging en middenveld speelt
   * kan prima laatste vrouw zijn zonder dat ze het centrale middenveld aankan.
   * Alleen linies die ze ook echt speelt tellen mee, en de aanval heeft geen
   * sleutelpositie -- daar levert het dus niets op.
   */
  centraal: Linie[]
}

export const SELECTIE: Speelster[] = [
  { id: 'p01', naam: 'Lily le Blanc',      linies: ['V', 'M'],      centraal: ['V', 'M'] },
  { id: 'p02', naam: 'Kiki van der Feer',  linies: ['M', 'A'],      centraal: ['M'] },
  { id: 'p03', naam: 'Eva Hoevers',        linies: ['V'],           centraal: ['V'] },
  { id: 'p04', naam: 'Liv Hopmans',        linies: ['M', 'A'],      centraal: [] },
  { id: 'p05', naam: 'Kate Janssen',       linies: ['V'],           centraal: [] },
  { id: 'p06', naam: 'Sofie Karremans',    linies: ['V'],           centraal: ['V'] },
  { id: 'p07', naam: 'Cato van Kempen',    linies: ['A'],           centraal: [] },
  { id: 'p08', naam: 'Suus Kimenai',       linies: ['M', 'A'],      centraal: [] },
  { id: 'p09', naam: 'Saffiya Makhlouf',   linies: ['M', 'V'],      centraal: [] },
  { id: 'p10', naam: 'Nora Mol',           linies: ['V', 'M'],      centraal: ['V', 'M'] },
  { id: 'p11', naam: 'Julie van Schendel', linies: ['M', 'A'],      centraal: [] },
  { id: 'p12', naam: 'Priscilla Twigt',    linies: ['M', 'A'],      centraal: [] },
  { id: 'p13', naam: 'Philine Verschuren', linies: ['M', 'A'],      centraal: [] },
  { id: 'p14', naam: 'Romy Vincenten',     linies: ['M', 'A'],      centraal: [] },
  { id: 'p15', naam: 'Lynn Visschers',     linies: ['V', 'M', 'A'], centraal: ['V', 'M'] },
  { id: 'p16', naam: 'Eva van der Zee',    linies: ['V', 'A'],      centraal: [] },
]

/** Roepnaam voor op het veld: voornaam, met achternaam-initiaal als die dubbel is. */
export function korteNaam(speelster: Speelster, allen: Speelster[]): string {
  const voornaam = speelster.naam.split(' ')[0]
  const dubbel = allen.some((a) => a.id !== speelster.id && a.naam.split(' ')[0] === voornaam)
  if (!dubbel) return voornaam
  const rest = speelster.naam.slice(voornaam.length).trim()
  const initiaal = rest.split(' ').filter(Boolean).pop()?.[0] ?? ''
  return initiaal ? `${voornaam} ${initiaal}.` : voornaam
}

/** Speelt deze speelster deze linie het liefst? */
export function inLinie(speelster: Speelster, positie: Positie): boolean {
  return speelster.linies.includes(positieInfo(positie).linie)
}

/**
 * Mag deze speelster op deze positie staan?
 *
 * Sleutelposities (LV, CV, CM) eisen `centraal` EN de juiste linie -- daar
 * wordt nooit van afgeweken. De overige zeven posities zijn open: buiten je
 * voorkeurslinie spelen mag daar bij nood, wat de solver zichtbaar markeert.
 */
export function magOpPositie(speelster: Speelster, positie: Positie): boolean {
  const info = positieInfo(positie)
  if (!info.sleutel) return true
  return kanCentraal(speelster, info.linie)
}

/** Kan zij de centrale plek in deze linie aan? Alleen als ze de linie ook speelt. */
export function kanCentraal(speelster: Speelster, linie: Linie): boolean {
  return speelster.linies.includes(linie) && speelster.centraal.includes(linie)
}

/**
 * In welke linies zou `centraal` iets opleveren?
 *
 * Alleen linies die zij speelt én waarin een sleutelpositie ligt. Voor een
 * aanvalster is dat niets: de voorhoede kent geen centrale sleutelplek.
 */
export function centraalLinies(speelster: Speelster): Linie[] {
  const metSleutel = new Set(POSITIES.filter((p) => p.sleutel).map((p) => p.linie))
  return speelster.linies.filter((l) => metSleutel.has(l))
}

/**
 * Welke sleutelposities kan deze speelster bezetten als `centraal` aan staat?
 *
 * Omdat `centraal` binnen haar eigen linies werkt, levert de vlag niet voor
 * iedereen hetzelfde op: een verdedigster krijgt laatste vrouw en centrale
 * verdediger erbij, een middenvelder de centrale middenveld, en een speelster
 * die alleen aanval speelt helemaal niets -- de voorhoede kent geen
 * sleutelpositie.
 */
export function sleutelPositiesVoor(speelster: Speelster): Positie[] {
  return POSITIES.filter((p) => p.sleutel && speelster.linies.includes(p.linie)).map((p) => p.code)
}

/** De sleutelposities waar ze nu daadwerkelijk mag staan. */
export function actieveSleutelPosities(speelster: Speelster): Positie[] {
  return POSITIES.filter((p) => p.sleutel && kanCentraal(speelster, p.linie)).map((p) => p.code)
}

/** Heeft het zin om `centraal` bij deze speelster aan te zetten? */
export function centraalHeeftZin(speelster: Speelster): boolean {
  return centraalLinies(speelster).length > 0
}

/** Speelsters die een sleutelpositie in deze linie kunnen bezetten. */
export function sleutelPool(speelsters: Speelster[], linie: Linie): Speelster[] {
  return speelsters.filter((s) => kanCentraal(s, linie))
}
