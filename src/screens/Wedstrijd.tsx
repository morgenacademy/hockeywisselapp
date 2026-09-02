import { useEffect, useMemo, useState } from 'react'
import { Clock } from '../components/Clock'
import { Field, type VeldSpeler } from '../components/Field'
import { SubOverlay, Wisselketen } from '../components/SubOverlay'
import { AANTAL_BLOKKEN, blokkenNaarSeconden, formatTijd } from '../domain/clock'
import { LINIE_NAAM, POSITIE_CODES, positieInfo, type Positie } from '../domain/formation'
import { inLinie, korteNaam, magOpPositie, type Speelster } from '../domain/players'
import { wisselKetens, wisselOverzicht, type Rooster } from '../domain/schedule'
import { useAlarm } from '../hooks/useAlarm'
import { useWakeLock } from '../hooks/useWakeLock'

const LINIE_KLEUR: Record<string, string> = {
  V: '#3b82c4',
  M: '#c9a227',
  A: '#c94f3b',
}

interface Props {
  aanwezigen: Speelster[]
  rooster: Rooster
  keeperId: string | null
  uitgevallen: string[]
  kwart: number
  secondenInKwart: number
  loopt: boolean
  kwartVoorbij: boolean
  huidigBlok: number
  alarmTot: number
  onStart: () => void
  onPauze: () => void
  onVolgendKwart: () => void
  onVolgendBlok: () => void
  onUitgevallen: (id: string, uit: boolean) => void
  onZetOpPositie: (blok: number, positie: Positie, id: string | null) => void
  onAlarmGezien: (blok: number) => void
  onOverzicht: () => void
  onOpnieuw: () => void
}

export function Wedstrijd(props: Props) {
  const {
    aanwezigen, rooster, keeperId, uitgevallen, kwart, secondenInKwart, loopt,
    kwartVoorbij, huidigBlok, alarmTot, onZetOpPositie, onAlarmGezien,
  } = props

  const { speel, ontgrendel } = useAlarm()
  useWakeLock(loopt)

  const [gekozenPositie, zetGekozenPositie] = useState<Positie | null>(null)
  const [overlayZichtbaar, zetOverlayZichtbaar] = useState(false)
  const [toonBank, zetToonBank] = useState(true)

  const perId = useMemo(() => new Map(aanwezigen.map((s) => [s.id, s])), [aanwezigen])
  const naam = (id: string) => perId.get(id)?.naam ?? '?'
  const kort = (id: string) => {
    const speelster = perId.get(id)
    return speelster ? korteNaam(speelster, aanwezigen) : '?'
  }

  const blok = rooster.blokken[huidigBlok]
  const vorigBlok = huidigBlok > 0 ? rooster.blokken[huidigBlok - 1] : null
  const volgendBlok = rooster.blokken[huidigBlok + 1] ?? null

  // Vooruitblik op de eerstvolgende wissel: daarmee kun je de speelsters die
  // eraf moeten alvast aanwijzen, in plaats van pas bij het belletje te zoeken.
  const komende = useMemo(
    () => (blok && volgendBlok ? wisselOverzicht(blok, volgendBlok) : null),
    [blok, volgendBlok],
  )
  const komendeKetens = useMemo(
    () => (blok && volgendBlok ? wisselKetens(blok, volgendBlok) : []),
    [blok, volgendBlok],
  )
  const ketens = useMemo(() => (blok ? wisselKetens(vorigBlok, blok) : []), [vorigBlok, blok])

  // Het alarm hoort bij de overgang naar een nieuw blok. `alarmTot` onthoudt
  // welk blok al is aangekondigd, zodat een refresh niet opnieuw belt.
  useEffect(() => {
    if (huidigBlok <= alarmTot) return
    onAlarmGezien(huidigBlok)
    if (huidigBlok === 0) return
    speel()
    zetOverlayZichtbaar(true)
  }, [huidigBlok, alarmTot, onAlarmGezien, speel])

  const spelers: VeldSpeler[] = useMemo(() => {
    if (!blok) return []
    const nieuwErin = new Set(
      POSITIE_CODES.filter((p) => vorigBlok && blok.opstelling[p] !== vorigBlok.opstelling[p]),
    )
    const straksEruit = new Set(komende?.eruit ?? [])
    const straksSchuiven = new Set((komende?.verplaatst ?? []).map((v) => v.id))
    return POSITIE_CODES.flatMap((positie) => {
      const id = blok.opstelling[positie]
      if (!id) return []
      const speelster = perId.get(id)
      if (!speelster) return []
      const markering = !magOpPositie(speelster, positie)
        ? ('nood' as const)
        : !inLinie(speelster, positie)
          ? ('buitenLinie' as const)
          : undefined
      return [{
        positie,
        naam: kort(id),
        linieKleur: LINIE_KLEUR[positieInfo(positie).linie],
        markering,
        gewisseld: nieuwErin.has(positie),
        gaatEruit: straksEruit.has(id),
        schuiftDoor: straksSchuiven.has(id),
      }]
    })
  }, [blok, vorigBlok, komende, perId, aanwezigen])

  const bank = blok?.bank ?? []
  const blokWaarschuwingen = blok?.waarschuwingen ?? []

  const zetSpeelster = (id: string) => {
    if (!gekozenPositie) return
    onZetOpPositie(huidigBlok, gekozenPositie, id)
    zetGekozenPositie(null)
  }

  const gekozenSpeelster = gekozenPositie ? blok?.opstelling[gekozenPositie] : null

  return (
    <div className="scherm wedstrijd">
      <Clock
        kwart={kwart}
        secondenInKwart={secondenInKwart}
        loopt={loopt}
        kwartVoorbij={kwartVoorbij}
        onStart={() => { ontgrendel(); props.onStart() }}
        onPauze={props.onPauze}
        onVolgendKwart={props.onVolgendKwart}
      />

      {blokWaarschuwingen.length > 0 && (
        <div className="melding waarschuwing">
          {blokWaarschuwingen.map((w) => <p key={w}>{w}</p>)}
        </div>
      )}

      <Field
        spelers={spelers}
        keeperNaam={keeperId ? kort(keeperId) : undefined}
        onKies={(positie) => zetGekozenPositie(gekozenPositie === positie ? null : positie)}
        gekozen={gekozenPositie}
      />

      {gekozenPositie && (
        <div className="ruilpaneel">
          <p>
            <strong>{positieInfo(gekozenPositie).naam}</strong>
            {gekozenSpeelster ? ` — nu ${naam(gekozenSpeelster)}` : ' — leeg'}
          </p>
          <p className="tel">Kies wie hier komt te staan:</p>
          <div className="chips">
            {aanwezigen
              .filter((s) => s.id !== keeperId && !uitgevallen.includes(s.id))
              // Eigen linie eerst, daarna wie er ook zou kunnen staan.
              .sort((a, b) => {
                const rang = (s: Speelster) =>
                  !magOpPositie(s, gekozenPositie) ? 2 : inLinie(s, gekozenPositie) ? 0 : 1
                return rang(a) - rang(b) || a.naam.localeCompare(b.naam)
              })
              .map((speelster) => {
                const mag = magOpPositie(speelster, gekozenPositie)
                const eigen = inLinie(speelster, gekozenPositie)
                return (
                  <button
                    key={speelster.id}
                    className={`chip ${mag ? '' : 'verboden'} ${eigen ? 'eigen' : 'anders'}`}
                    onClick={() => zetSpeelster(speelster.id)}
                    disabled={!mag}
                    title={mag ? undefined : 'Kan hier niet centraal staan'}
                  >
                    {speelster.naam}
                  </button>
                )
              })}
          </div>
          <button className="knop klein" onClick={() => zetGekozenPositie(null)}>Annuleren</button>
        </div>
      )}

      {komendeKetens.length > 0 && (
        <section className="vooruitblik">
          <h2>Volgende wissel</h2>
          <ul className="ketens">
            {komendeKetens.map((keten) => (
              <Wisselketen key={keten.eruit} keten={keten} naam={naam} />
            ))}
          </ul>
        </section>
      )}

      <section className="bank">
        <button className="bank-kop" onClick={() => zetToonBank((t) => !t)} aria-expanded={toonBank}>
          <h2>Bank ({bank.length})</h2>
          <span aria-hidden>{toonBank ? '▾' : '▸'}</span>
        </button>
        {toonBank && (
          <ul className="chips">
            {bank.map((id) => {
              const speelster = perId.get(id)
              const paar = komende?.paren.find((p) => p.erin === id)
              return (
                <li key={id}>
                  <span className={`chip bankchip ${paar ? 'volgende' : ''}`}>
                    {speelster?.naam}
                    <em>{speelster?.linies.map((l) => LINIE_NAAM[l][0]).join('')}</em>
                    {paar && (
                      <span className="volgende-vlag">
                        {paar.eruit ? `erin voor ${naam(paar.eruit)}` : 'straks erin'}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
            {bank.length === 0 && <li className="tel">Iedereen speelt.</li>}
          </ul>
        )}
      </section>

      <section className="speeltijd">
        <h2>Speeltijd</h2>
        <ul>
          {aanwezigen
            .filter((s) => s.id !== keeperId)
            .map((speelster) => {
              const blokken = rooster.gespeeld[speelster.id] ?? 0
              const uit = uitgevallen.includes(speelster.id)
              return (
                <li key={speelster.id} className={uit ? 'uitgevallen' : ''}>
                  <span className="rij-naam">{speelster.naam}</span>
                  <span className="balk">
                    <span style={{ width: `${(blokken / AANTAL_BLOKKEN) * 100}%` }} />
                  </span>
                  <span className="minuten">{formatTijd(blokkenNaarSeconden(blokken))}</span>
                  <button
                    className={`knop mini ${uit ? '' : 'gevaar'}`}
                    onClick={() => props.onUitgevallen(speelster.id, !uit)}
                    title={uit ? 'Weer inzetbaar maken' : 'Uit de wedstrijd halen (blessure, kaart, naar huis)'}
                  >
                    {uit ? 'terug' : 'eruit'}
                  </button>
                </li>
              )
            })}
        </ul>
        {keeperId && (
          <p className="tel">
            {naam(keeperId)} keept de hele wedstrijd ({formatTijd(blokkenNaarSeconden(AANTAL_BLOKKEN))}).
          </p>
        )}
      </section>

      <div className="knoppenrij">
        <button className="knop klein" onClick={props.onVolgendBlok}>Volgend blok</button>
        <button className="knop klein" onClick={props.onOverzicht}>Overzicht</button>
        <button className="knop klein gevaar" onClick={props.onOpnieuw}>Opnieuw</button>
      </div>

      {overlayZichtbaar && blok && (
        <SubOverlay
          blokNummer={huidigBlok + 1}
          ketens={ketens}
          naam={naam}
          onKlaar={() => zetOverlayZichtbaar(false)}
        />
      )}
    </div>
  )
}
