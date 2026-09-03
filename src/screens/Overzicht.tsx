import { AANTAL_BLOKKEN, blokkenNaarSeconden, formatTijd, kwartVanBlok } from '../domain/clock'
import { POSITIE_CODES } from '../domain/formation'
import type { Speelster } from '../domain/players'
import type { Rooster } from '../domain/schedule'
import { Kop } from '../components/Kop'

interface Props {
  aanwezigen: Speelster[]
  rooster: Rooster
  keeperId: string | null
  huidigBlok: number
  onTerug: () => void
}

export function Overzicht({ aanwezigen, rooster, keeperId, huidigBlok, onTerug }: Props) {
  const perId = new Map(aanwezigen.map((s) => [s.id, s]))
  const veld = aanwezigen.filter((s) => s.id !== keeperId)

  const positieVan = (blokIndex: number, speelsterId: string) => {
    const blok = rooster.blokken[blokIndex]
    if (!blok) return null
    return POSITIE_CODES.find((p) => blok.opstelling[p] === speelsterId) ?? null
  }

  const gesorteerd = [...veld].sort(
    (a, b) => (rooster.gespeeld[b.id] ?? 0) - (rooster.gespeeld[a.id] ?? 0) || a.naam.localeCompare(b.naam),
  )

  return (
    <div className="scherm">
      <Kop />
      <header className="scherm-kop">
        <h1>Overzicht</h1>
        <p className="tel">Speeltijd en positie per blok. Blok {huidigBlok + 1} loopt nu.</p>
      </header>

      <div className="tabelwikkel">
        <table className="rooster">
          <thead>
            <tr>
              <th className="naamkolom">Speelster</th>
              {Array.from({ length: AANTAL_BLOKKEN }, (_, i) => (
                <th key={i} className={i === huidigBlok ? 'nu' : ''}>
                  <span className="blokkop">{i + 1}</span>
                  <span className="kwartkop">K{kwartVanBlok(i)}</span>
                </th>
              ))}
              <th>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {gesorteerd.map((speelster) => (
              <tr key={speelster.id}>
                <th className="naamkolom">{speelster.naam}</th>
                {Array.from({ length: AANTAL_BLOKKEN }, (_, i) => {
                  const positie = positieVan(i, speelster.id)
                  return (
                    <td
                      key={i}
                      className={`${positie ? 'speelt' : 'bank'} ${i === huidigBlok ? 'nu' : ''}`}
                    >
                      {positie ?? '·'}
                    </td>
                  )
                })}
                <td className="totaal">{formatTijd(blokkenNaarSeconden(rooster.gespeeld[speelster.id] ?? 0))}</td>
              </tr>
            ))}
            {keeperId && (
              <tr className="keeperrij">
                <th className="naamkolom">{perId.get(keeperId)?.naam}</th>
                {Array.from({ length: AANTAL_BLOKKEN }, (_, i) => (
                  <td key={i} className="speelt">GK</td>
                ))}
                <td className="totaal">{formatTijd(blokkenNaarSeconden(AANTAL_BLOKKEN))}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rooster.waarschuwingen.length > 0 && (
        <div className="melding waarschuwing">
          <h2>Let op</h2>
          {rooster.waarschuwingen.map((w) => <p key={w}>{w}</p>)}
        </div>
      )}

      <button className="knop groot" onClick={onTerug}>Terug naar de wedstrijd</button>
    </div>
  )
}
