import { LINIE_NAAM, positieInfo } from '../domain/formation'
import { centraalHeeftZin, magOpPositie, sleutelPositiesVoor, type Speelster } from '../domain/players'
import { SELECTIE } from '../domain/players'
import { controleerBezetting } from '../domain/schedule'
import { Kop } from '../components/Kop'

/** De centraal-vlaggen zoals ze in de selectie staan, om te zien of er iets is aangepast. */
const OORSPRONKELIJK = new Map(SELECTIE.map((s) => [s.id, s.centraal]))

interface Props {
  selectie: Speelster[]
  aanwezig: string[]
  onWissel: (id: string) => void
  onAlle: (aan: boolean) => void
  onCentraal: (id: string, aan: boolean) => void
  onHerstelSelectie: () => void
  onVerder: () => void
}

/** Wat levert de centraal-knop bij deze speelster op? */
function centraalUitleg(speelster: Speelster): string {
  const posities = sleutelPositiesVoor(speelster)
  if (posities.length === 0) {
    return `${speelster.naam} speelt alleen aanval, en daar is geen centrale sleutelpositie.`
  }
  const namen = posities.map((p) => positieInfo(p).naam.toLowerCase()).join(' en ')
  return speelster.centraal
    ? `${speelster.naam} kan nu op ${namen}. Tik om dat uit te zetten.`
    : `Zet aan als ${speelster.naam} ook op ${namen} kan staan.`
}

export function Aanwezigheid({
  selectie, aanwezig, onWissel, onAlle, onCentraal, onHerstelSelectie, onVerder,
}: Props) {
  const aanwezigen = selectie.filter((s) => aanwezig.includes(s.id))
  const teWeinig = aanwezigen.length < 11
  const check = controleerBezetting(aanwezigen, null)
  // De keeperwaarschuwing komt op het volgende scherm; hier gaat het om de groep.
  const meldingen = check.meldingen.filter((m) => !m.startsWith('Kies nog een keeper'))

  // Wie kan er straks centraal? De keeper is nog niet bekend, dus dit telt over
  // alle aanwezigen -- op het keeperscherm wordt het opnieuw nagerekend.
  const achterin = aanwezigen.filter((s) => magOpPositie(s, 'LV')).length
  const middenveld = aanwezigen.filter((s) => magOpPositie(s, 'CM')).length
  // Twee plekken achterin, één op het middenveld. Zit je daar precies op, dan
  // kan er niemand van hen ooit rusten -- dat is nog geen fout, maar wel het
  // moment om er iemand bij te zetten.
  const teWeinigCentraal = achterin < 2 || middenveld < 1
  const krapCentraal = achterin === 2 || middenveld === 1
  const gewijzigd = selectie.some((s) => s.centraal !== OORSPRONKELIJK.get(s.id))

  return (
    <div className="scherm">
      <Kop />
      <header className="scherm-kop">
        <h1>Wie zijn er?</h1>
        <p className="tel">
          <strong>{aanwezigen.length}</strong> van {selectie.length} aanwezig
        </p>
        <p
          className={`centraal-tel ${teWeinigCentraal ? 'tekort' : krapCentraal ? 'krap' : ''}`}
        >
          Centraal inzetbaar: <strong>achterin {achterin}</strong> ·{' '}
          <strong>middenveld {middenveld}</strong>
          {teWeinigCentraal && <em> — te weinig, zet er iemand bij</em>}
          {!teWeinigCentraal && krapCentraal && (
            <em> — precies genoeg, zij kunnen dan nooit rusten</em>
          )}
        </p>
      </header>

      <div className="knoppenrij">
        <button className="knop klein" onClick={() => onAlle(true)}>Alles aan</button>
        <button className="knop klein" onClick={() => onAlle(false)}>Alles uit</button>
      </div>

      <ul className="lijst">
        {selectie.map((speelster) => {
          const aan = aanwezig.includes(speelster.id)
          const kanCentraal = centraalHeeftZin(speelster)
          return (
            <li key={speelster.id} className="rij-groep">
              <button
                className={`rij ${aan ? 'aan' : 'uit'}`}
                onClick={() => onWissel(speelster.id)}
                aria-pressed={aan}
              >
                <span className="vink" aria-hidden>{aan ? '✓' : ''}</span>
                <span className="rij-naam">{speelster.naam}</span>
                <span className="rij-info">
                  {speelster.linies.map((l) => LINIE_NAAM[l]).join(' / ')}
                </span>
              </button>
              <button
                className={`centraal-knop ${speelster.centraal ? 'aan' : 'uit'}`}
                onClick={() => onCentraal(speelster.id, !speelster.centraal)}
                disabled={!kanCentraal}
                aria-pressed={kanCentraal ? speelster.centraal : undefined}
                title={centraalUitleg(speelster)}
              >
                centraal
              </button>
            </li>
          )
        })}
      </ul>

      <p className="tel">
        Tik op <em>centraal</em> om iemand ook op laatste vrouw, centrale verdediger of
        centrale middenveld te kunnen zetten. Dat blijft bewaard voor volgende wedstrijden.
      </p>

      {teWeinig && (
        <p className="melding waarschuwing">
          Met {aanwezigen.length} speelsters kun je geen 11 opstellen. Je hebt er minstens 11 nodig.
        </p>
      )}
      {!teWeinig &&
        meldingen.map((melding) => (
          <p className="melding waarschuwing" key={melding}>{melding}</p>
        ))}

      {gewijzigd && (
        <button
          className="knop klein"
          onClick={() => {
            if (confirm('Alle centraal-aanpassingen terugzetten naar de oorspronkelijke selectie?')) {
              onHerstelSelectie()
            }
          }}
        >
          Terug naar de standaardselectie
        </button>
      )}

      <button className="knop groot" disabled={teWeinig} onClick={onVerder}>
        Verder: keeper kiezen
      </button>
    </div>
  )
}
