import { useState } from 'react'
import { Field, type VeldSpeler } from '../components/Field'
import { Kop } from '../components/Kop'
import { LINIE_NAAM, POSITIE_CODES, positieInfo, type Positie } from '../domain/formation'
import { inLinie, korteNaam, magOpPositie, type Speelster } from '../domain/players'
import type { Opstelling as OpstellingType } from '../domain/schedule'

const LINIE_KLEUR: Record<string, string> = { V: '#4a9fd4', M: '#c9a227', A: '#c94f3b' }

interface Props {
  aanwezigen: Speelster[]
  keeperId: string | null
  /** Wat de app zelf zou opstellen; het startpunt om aan te passen. */
  voorstel: OpstellingType
  /** Wat de leider heeft vastgezet; leeg betekent: volg het voorstel. */
  vastgezet: OpstellingType
  onZet: (positie: Positie, speelsterId: string | null) => void
  onWis: () => void
  onTerug: () => void
  onVerder: () => void
}

/**
 * De startopstelling zelf maken.
 *
 * Vooraf ingevuld met het voorstel van de app, zodat je alleen hoeft aan te
 * passen wat je anders wilt in plaats van elf plekken te vullen. Wat je hier
 * vastzet geldt voor het eerste blok; de app rekent de rest van de wedstrijd
 * daaromheen, met dezelfde eerlijke speeltijd.
 */
export function Opstelling({
  aanwezigen, keeperId, voorstel, vastgezet, onZet, onWis, onTerug, onVerder,
}: Props) {
  const [gekozen, zetGekozen] = useState<Positie | null>(null)
  const perId = new Map(aanwezigen.map((s) => [s.id, s]))
  const veld = aanwezigen.filter((s) => s.id !== keeperId)
  const naam = (id: string) => perId.get(id)?.naam ?? '?'
  const kort = (id: string) => {
    const s = perId.get(id)
    return s ? korteNaam(s, aanwezigen) : '?'
  }

  const spelers: VeldSpeler[] = POSITIE_CODES.flatMap((positie) => {
    const id = voorstel[positie]
    if (!id) return []
    const speelster = perId.get(id)
    if (!speelster) return []
    return [{
      positie,
      naam: kort(id),
      linieKleur: LINIE_KLEUR[positieInfo(positie).linie],
      markering: !magOpPositie(speelster, positie)
        ? ('nood' as const)
        : !inLinie(speelster, positie)
          ? ('buitenLinie' as const)
          : undefined,
      gewisseld: vastgezet[positie] !== undefined,
    }]
  })

  const aantalVast = POSITIE_CODES.filter((p) => vastgezet[p]).length
  const opVeld = new Set(POSITIE_CODES.map((p) => voorstel[p]).filter(Boolean) as string[])
  const bank = veld.filter((s) => !opVeld.has(s.id))

  return (
    <div className="scherm">
      <Kop />
      <header className="scherm-kop">
        <h1>Startopstelling</h1>
        <p className="tel">
          Dit is het voorstel van de app. Tik op een plek om er iemand anders neer te
          zetten; de rest van de wedstrijd rekent daaromheen.
        </p>
        {aantalVast > 0 && (
          <p className="tel">
            <strong>{aantalVast}</strong> {aantalVast === 1 ? 'plek' : 'plekken'} zelf gezet
            (groen omrand).
          </p>
        )}
      </header>

      <Field
        spelers={spelers}
        keeperNaam={keeperId ? kort(keeperId) : undefined}
        onKies={(positie) => zetGekozen(gekozen === positie ? null : positie)}
        gekozen={gekozen}
      />

      {gekozen && (
        <div className="ruilpaneel">
          <p>
            <strong>{positieInfo(gekozen).naam}</strong>
            {voorstel[gekozen] ? ` — nu ${naam(voorstel[gekozen]!)}` : ' — leeg'}
          </p>
          <p className="tel">Wie zet je hier neer?</p>
          <div className="chips">
            {veld
              .slice()
              .sort((a, b) => {
                const rang = (s: Speelster) =>
                  !magOpPositie(s, gekozen) ? 2 : inLinie(s, gekozen) ? 0 : 1
                return rang(a) - rang(b) || a.naam.localeCompare(b.naam)
              })
              .map((speelster) => {
                const mag = magOpPositie(speelster, gekozen)
                return (
                  <button
                    key={speelster.id}
                    className={`chip ${mag ? '' : 'verboden'} ${inLinie(speelster, gekozen) ? 'eigen' : 'anders'}`}
                    onClick={() => {
                      onZet(gekozen, speelster.id)
                      zetGekozen(null)
                    }}
                    disabled={!mag}
                    title={mag ? undefined : 'Kan hier niet centraal staan'}
                  >
                    {speelster.naam}
                  </button>
                )
              })}
          </div>
          <button className="knop klein" onClick={() => zetGekozen(null)}>Annuleren</button>
        </div>
      )}

      <section className="bank">
        <h2>Start op de bank ({bank.length})</h2>
        <ul className="chips">
          {bank.map((s) => (
            <li key={s.id}>
              <span className="chip bankchip">
                {s.naam}
                <em>{s.linies.map((l) => LINIE_NAAM[l][0]).join('')}</em>
              </span>
            </li>
          ))}
          {bank.length === 0 && <li className="tel">Iedereen start in het veld.</li>}
        </ul>
      </section>

      <div className="knoppenrij">
        <button className="knop klein" onClick={onTerug}>Terug</button>
        {aantalVast > 0 && (
          <button className="knop klein" onClick={onWis}>Voorstel van de app</button>
        )}
        <button className="knop groot" onClick={onVerder}>Wedstrijd starten</button>
      </div>
    </div>
  )
}
