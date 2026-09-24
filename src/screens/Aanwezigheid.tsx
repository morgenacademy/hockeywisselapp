import { useState } from 'react'
import { bezettingsAdvies, heeftTekort, type GroepAdvies } from '../domain/bezetting'
import type { Linie } from '../domain/formation'
import { LINIES, LINIE_NAAM } from '../domain/formation'
import { centraalLinies, kanCentraal, type Speelster } from '../domain/players'
import { SELECTIE } from '../domain/players'
import { controleerBezetting } from '../domain/schedule'
import { Bevestigknop } from '../components/Bevestigknop'
import { Kop } from '../components/Kop'
import { isVasteSpeelster } from '../state/matchStore'

/** Linies én centraal-vlaggen zoals ze in de selectie staan, om te zien of er iets is aangepast. */
const OORSPRONKELIJK = new Map(
  SELECTIE.map((s) => [s.id, `${s.linies.join(',')}|${s.centraal.join(',')}`]),
)

interface Props {
  selectie: Speelster[]
  aanwezig: string[]
  onWissel: (id: string) => void
  onAlle: (aan: boolean) => void
  onCentraal: (id: string, linie: Linie, aan: boolean) => void
  onLinie: (id: string, linie: Linie, aan: boolean) => void
  onHerstelSelectie: () => void
  /** Zet een invalster in de lijst die niet in de vaste selectie staat. */
  onVoegToe: (naam: string) => void
  /** Haalt zo'n toegevoegde speelster weer weg. */
  onVerwijder: (id: string) => void
  /** Wist de wedstrijd; selectie en centrale posities blijven staan. */
  onNieuweWedstrijd: () => void
  /** Zet werkelijk alles terug, inclusief de centrale posities. */
  onWisAlles: () => void
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
 * de app wie. Bij een linie kan dat niet met één tik -- wie welke linie kan is
 * een keuze over de speelster zelf, niet over deze wedstrijd -- dus daar wijst
 * de app naar de linie-knoppen in de lijst en zegt wat het gevolg is als je
 * niets doet.
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
            <em>
              Zet hieronder in de lijst deze linie aan bij iemand die het aankan,
              of speel door: er komt dan straks iemand buiten haar linie te staan.
            </em>
          )}
        </p>
      ))}
    </section>
  )
}

export function Aanwezigheid({
  selectie, aanwezig, onWissel, onAlle, onCentraal, onLinie, onHerstelSelectie,
  onVoegToe, onVerwijder, onNieuweWedstrijd, onWisAlles, onVerder,
  onTerugNaarWedstrijd,
}: Props) {
  const [nieuweNaam, zetNieuweNaam] = useState('')

  const voegToe = () => {
    if (!nieuweNaam.trim()) return
    onVoegToe(nieuweNaam)
    zetNieuweNaam('')
  }
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
  // Alleen de vaste selectie telt: een toegevoegde invalster is geen aanpassing
  // die je terugzet, en de herstelknop laat haar dan ook staan.
  const gewijzigd = selectie.some(
    (s) =>
      isVasteSpeelster(s.id) &&
      `${s.linies.join(',')}|${s.centraal.join(',')}` !== OORSPRONKELIJK.get(s.id),
  )

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

      {/* Invalsters zijn geen uitzondering: er is altijd wel een weekend waarin
          er drie afzeggen en er twee uit een ander team meekomen. Dit kan ook
          nog als de wedstrijd al loopt -- ze komt dan gewoon met nul gespeelde
          blokken de rotatie in. */}
      <section className="toevoegen">
        <h2>Iemand erbij</h2>
        {/* Geen <form>: in een afgeschermd venster (een voorbeeldweergave, een
            app die de pagina insluit) blokkeert de browser formulieren, en dan
            deed Toevoegen stilletjes niets. Een knop en Enter werken overal. */}
        <div className="toevoegen-rij">
          <input
            type="text"
            value={nieuweNaam}
            onChange={(e) => zetNieuweNaam(e.target.value)}
            placeholder="Naam van de invalster"
            aria-label="Naam van de invalster"
            autoComplete="off"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                voegToe()
              }
            }}
          />
          <button
            className="knop klein"
            type="button"
            onClick={voegToe}
            disabled={!nieuweNaam.trim()}
          >
            Toevoegen
          </button>
        </div>
        <p className="tel">
          Ze komt aanwezig in de lijst, met alle drie de linies en geen centrale
          plek. Ken je haar wel, zet dan hieronder haar linies en centraal goed —
          dan valt ze net zo in het schema als de rest.
        </p>
      </section>

      <ul className="lijst">
        {selectie.map((speelster) => {
          const aan = aanwezig.includes(speelster.id)
          // Eén knop per linie waarin een centrale plek zit én die zij speelt.
          // Voor een aanvalster blijft die lijst leeg: de voorhoede kent geen
          // centrale sleutelplek.
          const centraalKnoppen = centraalLinies(speelster)
          // Haar laatste linie mag er niet af: zonder linie kan ze nergens staan.
          const laatste = speelster.linies.length <= 1
          return (
            <li key={speelster.id} className="speelster-kaart">
              <button
                className={`rij ${aan ? 'aan' : 'uit'}`}
                onClick={() => onWissel(speelster.id)}
                aria-pressed={aan}
              >
                <span className="vink" aria-hidden>{aan ? '✓' : ''}</span>
                <span className="rij-naam">{speelster.naam}</span>
                {!isVasteSpeelster(speelster.id) && <span className="rij-info">erbij</span>}
              </button>

              <div className="instellingen">
                <span className="instel-groep">
                  <span className="instel-label">linie</span>
                  {LINIES.map((linie) => {
                    const speelt = speelster.linies.includes(linie)
                    const vast = speelt && laatste
                    return (
                      <button
                        key={linie}
                        className={`chip-knop linie ${speelt ? 'aan' : 'uit'}`}
                        onClick={() => onLinie(speelster.id, linie, !speelt)}
                        aria-pressed={speelt}
                        disabled={vast}
                        title={
                          vast
                            ? `${speelster.naam} moet minstens één linie houden, anders kan ze nergens staan.`
                            : speelt
                              ? `${speelster.naam} speelt ${LINIE_NAAM[linie].toLowerCase()}. Tik om dat weg te halen.`
                              : `Zet aan als ${speelster.naam} ook ${LINIE_NAAM[linie].toLowerCase()} kan spelen.`
                        }
                      >
                        {LINIE_NAAM[linie]}
                      </button>
                    )
                  })}
                </span>

                {!isVasteSpeelster(speelster.id) && (
                  <button
                    className="knop mini gevaar"
                    onClick={() => onVerwijder(speelster.id)}
                    title={`${speelster.naam} weer uit de lijst halen`}
                  >
                    weghalen
                  </button>
                )}

                {centraalKnoppen.length > 0 && (
                  <span className="instel-groep centraal">
                    <span className="instel-label">centraal</span>
                    {centraalKnoppen.map((linie) => (
                      <button
                        key={linie}
                        className={`chip-knop centraal ${kanCentraal(speelster, linie) ? 'aan' : 'uit'}`}
                        onClick={() => onCentraal(speelster.id, linie, !kanCentraal(speelster, linie))}
                        aria-pressed={kanCentraal(speelster, linie)}
                        title={centraalUitleg(speelster, linie)}
                      >
                        {CENTRAAL_LABEL[linie].kort}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="tel">
        <em>Linie</em> bepaalt waar iemand kan staan; je kunt er een toevoegen of
        weghalen, zolang er één overblijft. <em>Centraal</em> gaat over de plek
        binnen die linie: <em>achterin</em> voor laatste vrouw en centrale
        verdediger, <em>midden</em> voor centrale middenveld. Iemand kan prima
        achterin centraal staan zonder dat ze het middenveld aankan. Haal je een
        linie weg, dan vervalt de centraal-knop die erbij hoort. Alles blijft
        bewaard voor volgende wedstrijden.
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

      {/* Twee soorten opnieuw beginnen, en het verschil zit hem in wat er
          blijft staan. De centrale posities horen bij het team en niet bij deze
          wedstrijd, dus die overleven een nieuwe wedstrijd -- ze per ongeluk
          kwijtraken is werk van een kwartier. */}
      <details className="opnieuw">
        <summary>Opnieuw beginnen</summary>
        <div className="opnieuw-inhoud">
          <Bevestigknop
            label="Nieuwe wedstrijd"
            vraag="Nieuwe wedstrijd beginnen? De keeper, de opstelling en de klok gaan weg. Je selectie en de centrale posities blijven staan."
            bevestig="Ja, nieuwe wedstrijd"
            onBevestig={onNieuweWedstrijd}
          />
          <p className="tel">
            Wist de keeper, de opstelling en de klok. Wie er zijn en wie centraal
            kan, blijft staan.
          </p>

          {gewijzigd && (
            <>
              <Bevestigknop
                label="Linies en centraal terugzetten"
                vraag="Alle aanpassingen aan linies en centrale posities terugzetten naar de oorspronkelijke selectie?"
                bevestig="Ja, terugzetten"
                onBevestig={onHerstelSelectie}
              />
              <p className="tel">
                Alleen de selectie terug naar de standaard; de wedstrijd blijft
                zoals hij is.
              </p>
            </>
          )}

          <Bevestigknop
            className="knop klein gevaar"
            label="Alles wissen"
            vraag="Alles wissen? Ook de centrale posities die je zelf hebt aangezet gaan terug naar de standaard. Dit kun je niet ongedaan maken."
            bevestig="Ja, alles wissen"
            onBevestig={onWisAlles}
          />
          <p className="tel">
            Zet de app helemaal terug naar het begin, inclusief de centrale
            posities. Gebruik dit ook als de app zich raar gedraagt.
          </p>
        </div>
      </details>
    </div>
  )
}
