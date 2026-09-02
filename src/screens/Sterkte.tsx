import { magOpPositie, type Speelster } from '../domain/players'

interface Props {
  aanwezigen: Speelster[]
  keeperId: string | null
  achter: string[]
  midden: string[]
  onZet: (achter: string[], midden: string[]) => void
  onTerug: () => void
  onVerder: () => void
}

function verplaats(volgorde: string[], id: string, richting: -1 | 1): string[] {
  const index = volgorde.indexOf(id)
  const doel = index + richting
  if (index < 0 || doel < 0 || doel >= volgorde.length) return volgorde
  const kopie = [...volgorde]
  ;[kopie[index], kopie[doel]] = [kopie[doel], kopie[index]]
  return kopie
}

function Lijst({
  titel,
  uitleg,
  volgorde,
  namen,
  onOmhoog,
  onOmlaag,
}: {
  titel: string
  uitleg: string
  volgorde: string[]
  namen: Map<string, string>
  onOmhoog: (id: string) => void
  onOmlaag: (id: string) => void
}) {
  return (
    <section className="sterkte-blok">
      <h2>{titel}</h2>
      <p className="tel">{uitleg}</p>
      {volgorde.length === 0 ? (
        <p className="melding waarschuwing">Niemand aanwezig die hier centraal kan staan.</p>
      ) : (
        <ol className="lijst genummerd">
          {volgorde.map((id, index) => (
            <li key={id}>
              <span className="rang">{index + 1}</span>
              <span className="rij-naam">{namen.get(id)}</span>
              <span className="pijlen">
                <button
                  className="knop mini"
                  onClick={() => onOmhoog(id)}
                  disabled={index === 0}
                  aria-label={`${namen.get(id)} omhoog`}
                >
                  ▲
                </button>
                <button
                  className="knop mini"
                  onClick={() => onOmlaag(id)}
                  disabled={index === volgorde.length - 1}
                  aria-label={`${namen.get(id)} omlaag`}
                >
                  ▼
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function Sterkte({ aanwezigen, keeperId, achter, midden, onZet, onTerug, onVerder }: Props) {
  const veld = aanwezigen.filter((s) => s.id !== keeperId)
  const namen = new Map(veld.map((s) => [s.id, s.naam]))

  // Alleen wie er nu is en de plek ook echt kan bezetten.
  const geldigAchter = achter.filter((id) => veld.some((s) => s.id === id && magOpPositie(s, 'LV')))
  const geldigMidden = midden.filter((id) => veld.some((s) => s.id === id && magOpPositie(s, 'CM')))

  return (
    <div className="scherm">
      <header className="scherm-kop">
        <h1>Centrale posities</h1>
        <p className="tel">
          Bovenaan staat het vaakst centraal. Speeltijd blijft leidend, dus iedereen
          in de lijst komt aan de beurt.
        </p>
      </header>

      <Lijst
        titel="Laatste vrouw &amp; centrale verdediger"
        uitleg="Twee plekken per blok."
        volgorde={geldigAchter}
        namen={namen}
        onOmhoog={(id) => onZet(verplaats(geldigAchter, id, -1), geldigMidden)}
        onOmlaag={(id) => onZet(verplaats(geldigAchter, id, 1), geldigMidden)}
      />

      <Lijst
        titel="Centrale middenveld"
        uitleg="Eén plek per blok."
        volgorde={geldigMidden}
        namen={namen}
        onOmhoog={(id) => onZet(geldigAchter, verplaats(geldigMidden, id, -1))}
        onOmlaag={(id) => onZet(geldigAchter, verplaats(geldigMidden, id, 1))}
      />

      <div className="knoppenrij">
        <button className="knop klein" onClick={onTerug}>Terug</button>
        <button className="knop groot" onClick={onVerder}>Wedstrijd starten</button>
      </div>
    </div>
  )
}
