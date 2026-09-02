import type { Linie, Positie } from './formation'
import { POSITIES, positieInfo } from './formation'

export interface Speelster {
  id: string
  naam: string
  /** Voorkeurslinies. */
  linies: Linie[]
  /**
   * Kan de centrale plek *binnen haar eigen linie* aan. Gecombineerd met
   * `linies` bepaalt dit of ze op een sleutelpositie mag staan: een aanvalster
   * met `centraal` komt daarmee niet op CM terecht, want CM ligt op het
   * middenveld.
   */
  centraal: boolean
}

export const SELECTIE: Speelster[] = [
  { id: 'p01', naam: 'Lily le Blanc',      linies: ['V', 'M'],      centraal: true },
  { id: 'p02', naam: 'Kiki van der Feer',  linies: ['M', 'A'],      centraal: true },
  { id: 'p03', naam: 'Eva Hoevers',        linies: ['V'],           centraal: true },
  { id: 'p04', naam: 'Liv Hopmans',        linies: ['M', 'A'],      centraal: false },
  { id: 'p05', naam: 'Kate Janssen',       linies: ['V'],           centraal: false },
  { id: 'p06', naam: 'Sofie Karremans',    linies: ['V'],           centraal: true },
  { id: 'p07', naam: 'Cato van Kempen',    linies: ['A'],           centraal: true },
  { id: 'p08', naam: 'Suus Kimenai',       linies: ['M', 'A'],      centraal: false },
  { id: 'p09', naam: 'Saffiya Makhlouf',   linies: ['M', 'V'],      centraal: false },
  { id: 'p10', naam: 'Nora Mol',           linies: ['V', 'M'],      centraal: true },
  { id: 'p11', naam: 'Julie van Schendel', linies: ['M', 'A'],      centraal: false },
  { id: 'p12', naam: 'Priscilla Twigt',    linies: ['M', 'A'],      centraal: false },
  { id: 'p13', naam: 'Philine Verschuren', linies: ['M', 'A'],      centraal: false },
  { id: 'p14', naam: 'Romy Vincenten',     linies: ['M', 'A'],      centraal: false },
  { id: 'p15', naam: 'Lynn Visschers',     linies: ['V', 'M', 'A'], centraal: true },
  { id: 'p16', naam: 'Eva van der Zee',    linies: ['V', 'A'],      centraal: false },
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
  return speelster.centraal && speelster.linies.includes(info.linie)
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

/** Heeft het zin om `centraal` bij deze speelster aan te zetten? */
export function centraalHeeftZin(speelster: Speelster): boolean {
  return sleutelPositiesVoor(speelster).length > 0
}

/** Speelsters die een sleutelpositie in deze linie kunnen bezetten. */
export function sleutelPool(speelsters: Speelster[], linie: Linie): Speelster[] {
  return speelsters.filter((s) => s.centraal && s.linies.includes(linie))
}
