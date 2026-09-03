import { bezettingsAdvies, heeftTekort, type GroepAdvies } from '../domain/bezetting'
import { LINIE_NAAM, positieInfo } from '../domain/formation'
import { centraalHeeftZin, sleutelPositiesVoor, type Speelster } from '../domain/players'
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

/**
 * Hoe staat de bezetting ervoor, per positiegroep?
 *
 * De twee centrale groepen kun je oplossen met de centraal-knop, dus daar noemt
 * de app wie. De linies volgen uit wie er is en zijn niet met een knop te
 * repareren; daar zegt de app alleen wat het gevolg wordt, zodat je niet
 * verrast wordt door een oranje randje tijdens de wedstrijd.
 */
function Bezettingstabel({
  advies,
  onCentraal,
}: {
  advies: GroepAdvies[]
  onCentraal: (id: string, aan: boolean) => void
}) {
  const teKort = advies.filter((g) => g.status !== 'goed')

  return (
    <section className="bezetting">
      <h2>Bezetting</h2>
      <ul className="bezetting-lijst">
        {advies.map((groep) => (
          <li key={groep.sleutel} className={`bezetting-rij ${groep.status}`}>
            <span className="bezetting-naam">
              {groep.naam}
              <em>{groep.toelichting}</em>
            </span>
            <span className="bezetting-cijfers">
              <strong>{groep.aanwezig}</strong>
              <span className="van">van {groep.advies}</span>
            </span>
          </li>
        ))}
      </ul>

      {teKort.map((groep) => (
        <p
          key={groep.sleutel}
          className={`melding ${groep.status === 'tekort' ? 'waarschuwing' : 'krap'}`}
        >
          <strong>{groep.naam}:</strong>{' '}
          {groep.status === 'tekort'
            ? `${groep.aanwezig} van de ${groep.minimum} die je minimaal nodig hebt.`
            : `${groep.aanwezig} van de ${groep.advies}. Werkt wel, maar zij kunnen bijna nooit rusten.`}{' '}
          {groep.aanTeVullen.length > 0 ? (
            <>
              Zet centraal aan bij:{' '}
              <span className="aanvul-knoppen">
                {groep.aanTeVullen.map((s) => (
                  <button key={s.id} className="knop mini" onClick={() => onCentraal(s.id, true)}>
                    {s.naam}
                  </button>
                ))}
              </span>
            </>
          ) : (
            <em>Dit volgt uit wie er is — er komt straks iemand buiten haar linie te staan.</em>
          )}
        </p>
      ))}
    </section>
  )
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
  // De keeper is hier nog niet bekend; het keeperscherm rekent het daarna exact
  // na. Dit geeft alvast het beeld over de hele groep.
  const advies = bezettingsAdvies(aanwezigen, null)
  const tekort = heeftTekort(advies)
  const gewijzigd = selectie.some((s) => s.centraal !== OORSPRONKELIJK.get(s.id))

  return (
    <div className="scherm">
      <Kop />
      <header className="scherm-kop">
        <h1>Wie zijn er?</h1>
        <p className="tel">
          <strong>{aanwezigen.length}</strong> van {selectie.length} aanwezig
        </p>
      </header>

      {!teWeinig && <Bezettingstabel advies={advies} onCentraal={onCentraal} />}

      <header className="scherm-kop">
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

      <button className="knop groot" disabled={teWeinig || tekort} onClick={onVerder}>
        Verder: keeper kiezen
      </button>
      {!teWeinig && tekort && (
        <p className="tel">
          Los eerst het tekort op — met deze bezetting komt het schema niet rond.
        </p>
      )}
    </div>
  )
}
