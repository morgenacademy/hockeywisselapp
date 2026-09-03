import { bezettingsAdvies, heeftTekort } from '../domain/bezetting'
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
  // Nu de keeper bekend is kloppen de getallen exact: zij telt niet mee als
  // veldspeelster, dus haar keuze kan een positiegroep onder de grens duwen.
  const advies = keeperId ? bezettingsAdvies(aanwezigen, keeperId) : []
  const krap = advies.filter((g) => g.status !== 'goed')

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
          // Wat doet juist deze keeperkeuze met de bezetting? Zij valt weg als
          // veldspeelster, en dat kan een positiegroep net onder de grens duwen.
          const gevolg = bezettingsAdvies(aanwezigen, speelster.id)
          const heeftGeen = heeftTekort(gevolg)
          const wordtKrap = gevolg.some((g) => g.status === 'krap')
          return (
            <li key={speelster.id}>
              <button
                className={`rij ${keeperId === speelster.id ? 'aan' : 'uit'}`}
                onClick={() => onKies(speelster.id)}
                aria-pressed={keeperId === speelster.id}
              >
                <span className="vink" aria-hidden>{keeperId === speelster.id ? '✓' : ''}</span>
                <span className="rij-naam">{speelster.naam}</span>
                {heeftGeen ? (
                  <span className="rij-info let-op">kan niet</span>
                ) : (
                  wordtKrap && <span className="rij-info let-op">krap</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {keeperId &&
        check.meldingen.map((melding) => (
          <p className="melding waarschuwing" key={melding}>{melding}</p>
        ))}
      {keeperId &&
        krap.map((groep) => (
          <p
            key={groep.sleutel}
            className={`melding ${groep.status === 'tekort' ? 'waarschuwing' : 'krap'}`}
          >
            <strong>{groep.naam}:</strong> {groep.aanwezig} van de {groep.advies} die je zou
            willen{groep.status === 'tekort' ? `, en minstens ${groep.minimum} nodig hebt` : ''}.
          </p>
        ))}
      {keeperId && check.ok && krap.length === 0 && (
        <p className="melding goed">
          De bezetting is rond met deze keeper: alle posities zitten op of boven het advies.
        </p>
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
