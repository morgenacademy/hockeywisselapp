import { controleerBezetting } from '../domain/schedule'
import type { Speelster } from '../domain/players'
import { LINIE_NAAM } from '../domain/formation'

interface Props {
  selectie: Speelster[]
  aanwezig: string[]
  onWissel: (id: string) => void
  onAlle: (aan: boolean) => void
  onVerder: () => void
}

export function Aanwezigheid({ selectie, aanwezig, onWissel, onAlle, onVerder }: Props) {
  const aanwezigen = selectie.filter((s) => aanwezig.includes(s.id))
  const check = controleerBezetting(aanwezigen, null)
  const teWeinig = aanwezigen.length < 11
  // De keeperwaarschuwing komt op het volgende scherm; hier gaat het om de groep.
  const meldingen = check.meldingen.filter((m) => !m.startsWith('Kies nog een keeper'))

  return (
    <div className="scherm">
      <header className="scherm-kop">
        <h1>Wie zijn er?</h1>
        <p className="tel">
          <strong>{aanwezigen.length}</strong> van {selectie.length} aanwezig
        </p>
      </header>

      <div className="knoppenrij">
        <button className="knop klein" onClick={() => onAlle(true)}>Alles aan</button>
        <button className="knop klein" onClick={() => onAlle(false)}>Alles uit</button>
      </div>

      <ul className="lijst">
        {selectie.map((speelster) => {
          const aan = aanwezig.includes(speelster.id)
          return (
            <li key={speelster.id}>
              <button
                className={`rij ${aan ? 'aan' : 'uit'}`}
                onClick={() => onWissel(speelster.id)}
                aria-pressed={aan}
              >
                <span className="vink" aria-hidden>{aan ? '✓' : ''}</span>
                <span className="rij-naam">{speelster.naam}</span>
                <span className="rij-info">
                  {speelster.linies.map((l) => LINIE_NAAM[l]).join(' / ')}
                  {speelster.centraal && <em> · centraal</em>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {teWeinig && (
        <p className="melding waarschuwing">
          Met {aanwezigen.length} speelsters kun je geen 11 opstellen. Je hebt er minstens 11 nodig.
        </p>
      )}
      {!teWeinig &&
        meldingen.map((melding) => (
          <p className="melding waarschuwing" key={melding}>{melding}</p>
        ))}

      <button className="knop groot" disabled={teWeinig} onClick={onVerder}>
        Verder: keeper kiezen
      </button>
    </div>
  )
}
