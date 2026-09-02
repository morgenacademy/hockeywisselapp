import { positieInfo } from '../domain/formation'
import type { WisselKeten } from '../domain/schedule'

interface Props {
  blokNummer: number
  ketens: WisselKeten[]
  naam: (id: string) => string
  onKlaar: () => void
}

/**
 * Eén kaart per wissel, verteld als de ketting die je uitspreekt. Losse regels
 * ("X eruit", "Y schuift", "Z erin") laten de leider zelf uitzoeken hoe ze
 * samenhangen -- en dan loopt de verkeerde speelster het veld af.
 */
export function Wisselketen({ keten, naam }: { keten: WisselKeten; naam: (id: string) => string }) {
  const eenvoudig = keten.stappen.length === 1
  const laatste = keten.stappen[keten.stappen.length - 1]

  if (eenvoudig) {
    return (
      <li className="keten enkel">
        <span className="paar-regel">
          <strong className="erin">{naam(laatste.speelsterId)}</strong>
          <span className="voor">komt erin voor</span>
          <strong className="eruit">{naam(keten.eruit)}</strong>
        </span>
        <span className="plek">{positieInfo(keten.vanPositie).naam}</span>
      </li>
    )
  }

  return (
    <li className="keten meervoudig">
      <div className="stap">
        <span className="rol eruit">Eruit</span>
        <span className="wie eruit">{naam(keten.eruit)}</span>
        <span className="plek">stond op {positieInfo(keten.vanPositie).naam}</span>
      </div>
      {keten.stappen.map((stap) => (
        <div className="stap" key={stap.speelsterId}>
          <span className={`rol ${stap.van ? 'schuift' : 'erin'}`}>
            {stap.van ? 'Schuift' : 'Erin'}
          </span>
          <span className={`wie ${stap.van ? 'schuift' : 'erin'}`}>{naam(stap.speelsterId)}</span>
          <span className="plek">
            {stap.van
              ? `van ${positieInfo(stap.van).naam} naar ${positieInfo(stap.naar).naam}`
              : `op ${positieInfo(stap.naar).naam}`}
          </span>
        </div>
      ))}
    </li>
  )
}

export function SubOverlay({ blokNummer, ketens, naam, onKlaar }: Props) {
  return (
    <div className="overlay" role="dialog" aria-label="Wisselmoment">
      <div className="overlay-kaart">
        <h2>Wisselen — blok {blokNummer}</h2>

        {ketens.length === 0 ? (
          <p className="tel">Geen wissels: iedereen blijft staan.</p>
        ) : (
          <ul className="ketens">
            {ketens.map((keten) => (
              <Wisselketen key={keten.eruit} keten={keten} naam={naam} />
            ))}
          </ul>
        )}

        <button className="knop groot" onClick={onKlaar}>Gewisseld</button>
      </div>
    </div>
  )
}
