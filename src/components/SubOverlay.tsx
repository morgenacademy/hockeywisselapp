import { positieInfo } from '../domain/formation'
import type { WisselOverzicht } from '../domain/schedule'

interface Props {
  blokNummer: number
  overzicht: WisselOverzicht
  naam: (id: string) => string
  onKlaar: () => void
}

/**
 * Wat er langs de lijn geroepen moet worden, in de vorm waarin je het zegt:
 * "Nora, jij komt erin voor Eva Hoevers."
 *
 * Wie van positie verandert maar blijft staan, staat apart -- als die in
 * dezelfde lijst zou staan als de echte wissels, loopt ze zo het veld af.
 */
export function SubOverlay({ blokNummer, overzicht, naam, onKlaar }: Props) {
  const { paren, eruit, verplaatst } = overzicht
  const gekoppeld = new Set(paren.map((p) => p.eruit).filter(Boolean) as string[])
  const zonderVervanger = eruit.filter((id) => !gekoppeld.has(id))
  const leeg = paren.length === 0 && verplaatst.length === 0 && zonderVervanger.length === 0

  return (
    <div className="overlay" role="dialog" aria-label="Wisselmoment">
      <div className="overlay-kaart">
        <h2>Wisselen — blok {blokNummer}</h2>

        {leeg && <p className="tel">Geen wissels: iedereen blijft staan.</p>}

        {paren.length > 0 && (
          <ul className="wisselparen">
            {paren.map((paar) => (
              <li key={paar.erin}>
                <span className="paar-regel">
                  <strong className="erin">{naam(paar.erin)}</strong>
                  {paar.eruit ? (
                    <>
                      <span className="voor">komt erin voor</span>
                      <strong className="eruit">{naam(paar.eruit)}</strong>
                    </>
                  ) : (
                    <span className="voor">komt erin</span>
                  )}
                </span>
                <span className="plek">{positieInfo(paar.positie).naam}</span>
              </li>
            ))}
          </ul>
        )}

        {zonderVervanger.length > 0 && (
          <section className="wisselgroep eruit-groep">
            <h3>Gaat eruit</h3>
            <ul>
              {zonderVervanger.map((id) => <li key={id}>{naam(id)}</li>)}
            </ul>
          </section>
        )}

        {verplaatst.length > 0 && (
          <section className="wisselgroep schuif-groep">
            <h3>Schuift door <em>(blijft in het veld)</em></h3>
            <ul>
              {verplaatst.map(({ id, van, naar }) => (
                <li key={id}>
                  {naam(id)}{' '}
                  <span className="plek">{van} → {positieInfo(naar).naam}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button className="knop groot" onClick={onKlaar}>Gewisseld</button>
      </div>
    </div>
  )
}
