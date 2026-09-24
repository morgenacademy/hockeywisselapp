import { positieInfo, type Positie } from '../domain/formation'
import { inLinie, magOpPositie, type Speelster } from '../domain/players'

interface Props {
  positie: Positie
  /** Wie er nu staat; `null` als de plek leeg is. */
  huidigeId: string | null
  /** Waaruit je kunt kiezen: alle beschikbare veldspeelsters. */
  kandidaten: Speelster[]
  /** Wie er in dit blok op de bank zit; die krijgen een label, want dat zijn de wissels. */
  bank?: string[]
  onKies: (id: string) => void
  onLeeg?: () => void
  onAnnuleer: () => void
}

/**
 * Kiezen wie er op een plek komt te staan.
 *
 * **Iedereen is te kiezen.** Eerder waren de speelsters die een sleutelpositie
 * niet aankunnen hier grijs: de app wist het beter dan de coach. Langs de lijn
 * klopt dat niet. Er komt een invalster mee die niemand kent, er valt iemand
 * uit, of de coach ziet gewoon iets -- en dan moet je die speelster daar neer
 * kunnen zetten, ook al staat het niet zo in de gegevens. De app blijft wel
 * zeggen wát er afwijkt, want dat is precies waar zij goed in is; ze houdt het
 * alleen niet meer tegen.
 *
 * De volgorde doet het werk dat de grijze knoppen deden: wie de plek gewoon
 * speelt staat vooraan, daarna wie het buiten haar linie kan, en pas onderaan
 * wie er echt niet vandaan komt.
 */
export function Ruilpaneel({
  positie, huidigeId, kandidaten, bank = [], onKies, onLeeg, onAnnuleer,
}: Props) {
  const info = positieInfo(positie)
  const naamVan = (id: string) => kandidaten.find((s) => s.id === id)?.naam ?? '?'

  /** 0 = eigen linie, 1 = buiten haar linie, 2 = kan hier normaal niet centraal staan. */
  const rang = (s: Speelster) => (!magOpPositie(s, positie) ? 2 : inLinie(s, positie) ? 0 : 1)

  return (
    <div className="ruilpaneel">
      <p>
        <strong>{info.naam}</strong>
        {huidigeId ? ` — nu ${naamVan(huidigeId)}` : ' — leeg'}
      </p>
      <p className="tel">
        Kies wie hier komt te staan. Iedereen mag overal staan; de app zet er alleen
        een opmerking bij als het buiten haar linie of buiten haar centrale plek valt.
      </p>
      <div className="chips">
        {kandidaten
          .slice()
          .sort((a, b) => rang(a) - rang(b) || a.naam.localeCompare(b.naam))
          .map((speelster) => {
            const soort = rang(speelster)
            return (
              <button
                key={speelster.id}
                className={`chip ${soort === 0 ? 'eigen' : soort === 1 ? 'anders' : 'buiten'} ${
                  speelster.id === huidigeId ? 'staat-er' : ''
                }`}
                onClick={() => onKies(speelster.id)}
                title={
                  soort === 0
                    ? `${speelster.naam} speelt deze linie.`
                    : soort === 1
                      ? `${speelster.naam} speelt deze linie normaal niet.`
                      : `${speelster.naam} staat hier normaal niet centraal. Kan wel als jij het wilt.`
                }
              >
                {speelster.naam}
                {bank.includes(speelster.id) && <em>bank</em>}
                {soort === 1 && <em>buiten linie</em>}
                {soort === 2 && <em>niet centraal</em>}
              </button>
            )
          })}
      </div>
      <div className="knoppenrij">
        {onLeeg && huidigeId && (
          <button className="knop klein" onClick={onLeeg}>
            Plek leeghalen
          </button>
        )}
        <button className="knop klein" onClick={onAnnuleer}>
          Annuleren
        </button>
      </div>
    </div>
  )
}
