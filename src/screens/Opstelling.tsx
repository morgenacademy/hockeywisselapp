import { useState } from 'react'
import { Field, type VeldSpeler } from '../components/Field'
import { Kop } from '../components/Kop'
import { Ruilpaneel } from '../components/Ruilpaneel'
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
  const [gekozenBank, zetGekozenBank] = useState<string | null>(null)
  const perId = new Map(aanwezigen.map((s) => [s.id, s]))
  const veld = aanwezigen.filter((s) => s.id !== keeperId)
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
    }]
  })

  // Zodra de coach één plek verzet wordt de hele opstelling vastgelegd, zodat
  // er verder niets meer verschuift. Dat is dus een ja/nee, geen telling.
  const zelfGezet = POSITIE_CODES.some((p) => vastgezet[p])
  const opVeld = new Set(POSITIE_CODES.map((p) => voorstel[p]).filter(Boolean) as string[])
  const bank = veld.filter((s) => !opVeld.has(s.id))

  // Ruilen met twee tikken, net als op het wedstrijdscherm.
  const tikVeld = (positie: Positie) => {
    const hier = voorstel[positie] ?? null
    const daar = gekozen ? voorstel[gekozen] ?? null : null
    if (gekozenBank) {
      onZet(positie, gekozenBank)
      zetGekozenBank(null)
    } else if (gekozen && gekozen !== positie) {
      if (hier) onZet(gekozen, hier)
      else if (daar) onZet(positie, daar)
      zetGekozen(null)
    } else {
      zetGekozen(gekozen === positie ? null : positie)
    }
  }
  const tikBank = (id: string) => {
    if (gekozen) {
      onZet(gekozen, id)
      zetGekozen(null)
    } else {
      zetGekozenBank(gekozenBank === id ? null : id)
    }
  }

  return (
    <div className="scherm">
      <Kop />
      <header className="scherm-kop">
        <h1>Startopstelling</h1>
        <p className="tel">
          Dit is het voorstel van de app. Tik op een plek om er iemand anders neer te
          zetten; de rest van de wedstrijd rekent daaromheen.
        </p>
        {zelfGezet && (
          <p className="tel">
            Je hebt deze opstelling zelf gezet. De app laat hem precies zo staan en
            rekent de rest van de wedstrijd eromheen.
          </p>
        )}
      </header>

      <Field
        spelers={spelers}
        keeperNaam={keeperId ? kort(keeperId) : undefined}
        onKies={tikVeld}
        gekozen={gekozen}
        bank={bank.map((s) => ({ id: s.id, naam: kort(s.id) }))}
        onKiesBank={tikBank}
        gekozenBank={gekozenBank}
      />

      {(gekozen || gekozenBank) && (
        <p className="ruilhint" role="status">
          {gekozen
            ? 'Tik op een andere speelster in het veld of op de bank om direct te ruilen.'
            : 'Tik op de speelster in het veld die op de bank moet beginnen.'}
        </p>
      )}

      {gekozen && (
        <Ruilpaneel
          positie={gekozen}
          huidigeId={voorstel[gekozen] ?? null}
          kandidaten={veld}
          onKies={(id) => {
            onZet(gekozen, id)
            zetGekozen(null)
          }}
          onAnnuleer={() => zetGekozen(null)}
        />
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
        {zelfGezet && (
          <button className="knop klein" onClick={onWis}>Voorstel van de app</button>
        )}
        <button className="knop groot" onClick={onVerder}>Wedstrijd starten</button>
      </div>
    </div>
  )
}
