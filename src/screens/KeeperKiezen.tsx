import { controleerBezetting } from '../domain/schedule'
import type { Speelster } from '../domain/players'
import { Kop } from '../components/Kop'

interface Props {
  aanwezigen: Speelster[]
  keeperId: string | null
  onKies: (id: string) => void
  onTerug: () => void
  onVerder: () => void
}

export function KeeperKiezen({ aanwezigen, keeperId, onKies, onTerug, onVerder }: Props) {
  const check = controleerBezetting(aanwezigen, keeperId)

  return (
    <div className="scherm">
      <Kop />
      <header className="scherm-kop">
        <h1>Wie keept?</h1>
        <p className="tel">Zij speelt de hele wedstrijd en wisselt niet mee.</p>
      </header>

      <ul className="lijst">
        {aanwezigen.map((speelster) => {
          // Wat gebeurt er met de centrale posities als juist zij gaat keepen?
          const gevolg = controleerBezetting(aanwezigen, speelster.id)
          return (
            <li key={speelster.id}>
              <button
                className={`rij ${keeperId === speelster.id ? 'aan' : 'uit'}`}
                onClick={() => onKies(speelster.id)}
                aria-pressed={keeperId === speelster.id}
              >
                <span className="vink" aria-hidden>{keeperId === speelster.id ? '✓' : ''}</span>
                <span className="rij-naam">{speelster.naam}</span>
                {!gevolg.ok && <span className="rij-info let-op">let op</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {keeperId &&
        check.meldingen.map((melding) => (
          <p className="melding waarschuwing" key={melding}>{melding}</p>
        ))}
      {keeperId && check.ok && (
        <p className="melding goed">De opstelling komt rond met deze keeper.</p>
      )}

      <div className="knoppenrij">
        <button className="knop klein" onClick={onTerug}>Terug</button>
        <button className="knop groot" disabled={!keeperId} onClick={onVerder}>
          Verder: centrale posities
        </button>
      </div>
    </div>
  )
}
