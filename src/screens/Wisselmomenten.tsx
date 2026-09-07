import { Kop } from '../components/Kop'
import { aanbevolenBlokkenPerKwart, blokkenPerSpeelster } from '../domain/bezetting'
import {
  AANTAL_KWARTEN,
  BLOKKEN_PER_KWART_KEUZES,
  aantalBlokken,
  blokSeconden,
  formatTijd,
  wisselsPerKwart,
} from '../domain/clock'
import { AANTAL_VELDPOSITIES } from '../domain/formation'
import type { Speelster } from '../domain/players'

interface Props {
  aanwezigen: Speelster[]
  keeperId: string | null
  blokkenPerKwart: number
  onZet: (blokkenPerKwart: number) => void
  /** Terug naar het advies, en het advies blijven volgen als de opkomst wijzigt. */
  onVolgAdvies: (blokkenPerKwart: number) => void
  onTerug: () => void
  onVerder: () => void
  /** Loopt de wedstrijd al? Dan verandert er iets aan een schema dat al draait. */
  gestart: boolean
}

/** Hoe je dit voorleest: "2× per kwart", of "alleen in de rust". */
export function wisselLabel(blokkenPerKwart: number): string {
  const aantal = wisselsPerKwart(blokkenPerKwart)
  return aantal === 0 ? 'Alleen in de rust' : `${aantal}× per kwart`
}

/**
 * Hoe vaak wisselen we?
 *
 * Het advies komt uit de opkomst: met één wisselspeelster moet je vaak
 * wisselen om haar aan spelen te krijgen, met vijf hoeft dat veel minder. Maar
 * het blijft een advies. De coach kent de tegenstander, het weer en de benen
 * van zijn ploeg, dus elke keuze is gewoon aan te tikken -- met erbij hoeveel
 * minuten er dan tussen twee wissels zit, want dát is het getal waar je langs
 * de lijn iets aan hebt.
 */
export function Wisselmomenten({
  aanwezigen, keeperId, blokkenPerKwart, onZet, onVolgAdvies, onTerug, onVerder, gestart,
}: Props) {
  const veld = aanwezigen.filter((s) => s.id !== keeperId).length
  const advies = aanbevolenBlokkenPerKwart(veld)
  const wisselspeelsters = Math.max(0, veld - AANTAL_VELDPOSITIES)

  return (
    <div className="scherm">
      <Kop />
      <header className="scherm-kop">
        <h1>Hoe vaak wisselen?</h1>
        <p className="tel">
          {veld} veldspeelsters, dus {wisselspeelsters}{' '}
          {wisselspeelsters === 1 ? 'wisselspeelster' : 'wisselspeelsters'} per blok op de
          bank.{' '}
          {wisselspeelsters === 0
            ? 'Iedereen speelt de hele wedstrijd; wisselen hoeft alleen als je zelf iets wilt veranderen.'
            : `De app adviseert ${wisselLabel(advies).toLowerCase()}.`}
        </p>
      </header>

      <ul className="keuzelijst">
        {BLOKKEN_PER_KWART_KEUZES.map((keuze) => {
          const gekozen = keuze === blokkenPerKwart
          return (
            <li key={keuze}>
              <button
                className={`rij keuze ${gekozen ? 'aan' : 'uit'}`}
                onClick={() => onZet(keuze)}
                aria-pressed={gekozen}
              >
                <span className="vink" aria-hidden>{gekozen ? '✓' : ''}</span>
                <span className="keuze-tekst">
                  <strong>{wisselLabel(keuze)}</strong>
                  <em>
                    blokken van {formatTijd(blokSeconden(keuze))} — {aantalBlokken(keuze)} blokken
                    in de wedstrijd
                  </em>
                </span>
                {keuze === advies && <span className="rij-info advies">advies</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {veld > 0 && (
        <p className="tel">
          De totale speeltijd verandert hier niet van: met {veld} veldspeelsters speelt
          iedereen ongeveer {formatTijd(blokkenPerSpeelster(veld, blokkenPerKwart) * blokSeconden(blokkenPerKwart))}
          , welke keuze je ook maakt. Wat verandert is hoe lang één beurt duurt — en dus
          hoe lang iemand achter elkaar aan de kant staat.
        </p>
      )}

      <p className="tel">
        Het getal telt de wissels <em>binnen</em> een kwart. In de rust wissel je
        sowieso: de klok staat dan stil, en dat is het rustigste moment om het te
        doen. Bij {wisselLabel(blokkenPerKwart).toLowerCase()} zijn dat over de hele
        wedstrijd {aantalBlokken(blokkenPerKwart) - 1} wisselmomenten, waarvan{' '}
        {AANTAL_KWARTEN - 1} in de rust.
      </p>

      {gestart && (
        <p className="melding krap">
          De wedstrijd loopt al. Wat er gespeeld is telt gewoon mee, maar de blokken
          die nog komen worden opnieuw ingedeeld — het schema ziet er daarna dus
          anders uit.
        </p>
      )}

      <div className="knoppenrij">
        <button className="knop klein" onClick={onTerug}>Terug</button>
        {blokkenPerKwart !== advies && (
          <button className="knop klein" onClick={() => onVolgAdvies(advies)}>
            Advies van de app
          </button>
        )}
        <button className="knop groot" onClick={onVerder}>Verder: centrale posities</button>
      </div>
    </div>
  )
}
