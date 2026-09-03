import { bezettingsAdvies, heeftTekort, type GroepAdvies } from '../domain/bezetting'
import type { Linie } from '../domain/formation'
import { LINIE_NAAM } from '../domain/formation'
import { centraalLinies, kanCentraal, type Speelster } from '../domain/players'
import { SELECTIE } from '../domain/players'
import { controleerBezetting } from '../domain/schedule'
import { Kop } from '../components/Kop'

/** De centraal-vlaggen zoals ze in de selectie staan, om te zien of er iets is aangepast. */
const OORSPRONKELIJK = new Map(SELECTIE.map((s) => [s.id, s.centraal.join(',')]))

interface Props {
  selectie: Speelster[]
  aanwezig: string[]
  onWissel: (id: string) => void
  onAlle: (aan: boolean) => void
  onCentraal: (id: string, linie: Linie, aan: boolean) => void
  onHerstelSelectie: () => void
  onVerder: () => void
  /** Alleen aanwezig als er al een wedstrijd loopt: dan kun je terug zonder wissen. */
  onTerugNaarWedstrijd?: () => void
}

/** Welke centrale plek zit er in deze linie? */
const CENTRAAL_LABEL: Record<string, { kort: string; lang: string }> = {
  V: { kort: 'achterin', lang: 'laatste vrouw en centrale verdediger' },
  M: { kort: 'midden', lang: 'centrale middenveld' },
}

/** Wat levert deze knop op? */
function centraalUitleg(speelster: Speelster, linie: Linie): string {
  const wat = CENTRAAL_LABEL[linie].lang
  return kanCentraal(speelster, linie)
    ? `${speelster.naam} kan nu op ${wat}. Tik om dat uit te zetten.`
    : `Zet aan als ${speelster.naam} deze wedstrijd op ${wat} kan staan.`
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
  onCentraal: (id: string, linie: Linie, aan: boolean) => void
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
                  <button
                    key={s.id}
                    className="knop mini"
                    onClick={() => onCentraal(s.id, groep.linie!, true)}
                  >
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
  onTerugNaarWedstrijd,
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
  const gewijzigd = selectie.some((s) => s.centraal.join(',') !== OORSPRONKELIJK.get(s.id))

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
          // Eén knop per linie waarin een centrale plek zit én die zij speelt.
          // Voor een aanvalster blijft die lijst leeg: de voorhoede kent geen
          // centrale sleutelplek.
          const linies = centraalLinies(speelster)
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
              <span className="centraal-knoppen">
                {linies.length === 0 ? (
                  <span
                    className="centraal-knop niet"
                    title={`${speelster.naam} speelt alleen aanval, en daar is geen centrale plek.`}
                  >
                    —
                  </span>
                ) : (
                  linies.map((linie) => (
                    <button
                      key={linie}
                      className={`centraal-knop ${kanCentraal(speelster, linie) ? 'aan' : 'uit'}`}
                      onClick={() => onCentraal(speelster.id, linie, !kanCentraal(speelster, linie))}
                      aria-pressed={kanCentraal(speelster, linie)}
                      title={centraalUitleg(speelster, linie)}
                    >
                      {CENTRAAL_LABEL[linie].kort}
                    </button>
                  ))
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="tel">
        Per linie aan te zetten: <em>achterin</em> voor laatste vrouw en centrale verdediger,
        <em>midden</em> voor centrale middenveld. Iemand kan prima achterin centraal staan
        zonder dat ze het middenveld aankan. Blijft bewaard voor volgende wedstrijden.
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

      {onTerugNaarWedstrijd && (
        <button className="knop klein" onClick={onTerugNaarWedstrijd}>
          Terug naar de lopende wedstrijd
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
