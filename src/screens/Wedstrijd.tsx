import { useEffect, useMemo, useRef, useState } from 'react'
import { Bevestigknop } from '../components/Bevestigknop'
import { Clock } from '../components/Clock'
import { Field, type BankSpeler, type VeldSpeler } from '../components/Field'
import { Ruilpaneel } from '../components/Ruilpaneel'
import { SubOverlay, Wisselketen } from '../components/SubOverlay'
import {
  aantalBlokken,
  blokSeconden,
  blokkenNaarSeconden,
  formatTijd,
  kwartVanBlok,
} from '../domain/clock'
import { LINIE_NAAM, POSITIE_CODES, positieInfo, type Positie } from '../domain/formation'
import { inLinie, korteNaam, magOpPositie, type Speelster } from '../domain/players'
import { wisselKetens, wisselOverzicht, type Rooster, type WisselKeten } from '../domain/schedule'
import { OEFENMODUS, SNELHEDEN } from '../oefenmodus'
import { useAlarm } from '../hooks/useAlarm'
import { useWakeLock } from '../hooks/useWakeLock'

const LINIE_KLEUR: Record<string, string> = {
  V: '#4a9fd4',
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
  blokkenPerKwart: number
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
  /** Geeft een blok terug aan de app, zodat het voorstel weer geldt. */
  onLaatAppBepalen: (blok: number) => void
  /** Welke blokken de coach zelf heeft vastgezet. */
  vastgezet: Record<number, unknown>
  onAlarmGezien: (blok: number) => void
  /** Zet een invalster erbij, ook als de wedstrijd al loopt. */
  onVoegToe: (naam: string) => void
  /**
   * Welk wisselmoment de coach vooruit bekijkt (blokindex), of `null` voor
   * het blok dat nu loopt. Staat in App, zodat het Overzicht er ook naartoe
   * kan springen.
   */
  kijkBlok: number | null
  onKijkBlok: (blok: number | null) => void
  onOverzicht: () => void
  onVoorbereiding: () => void
  onOpnieuw: () => void
  /** Alleen de oefenversie gebruikt dit; in de echte app bestaat de balk niet. */
  snelheid: number
  onSnelheid: (snelheid: number) => void
}

export function Wedstrijd(props: Props) {
  const {
    aanwezigen, rooster, keeperId, uitgevallen, kwart, secondenInKwart, blokkenPerKwart,
    loopt, kwartVoorbij, huidigBlok, alarmTot, vastgezet, onZetOpPositie, onAlarmGezien,
  } = props
  const totaalBlokken = aantalBlokken(blokkenPerKwart)

  const { speel, ontgrendel } = useAlarm()
  useWakeLock(loopt)

  const [gekozenPositie, zetGekozenPositie] = useState<Positie | null>(null)
  /** Een wisselspeelster die is aangetikt en wacht op een plek in het veld. */
  const [gekozenBank, zetGekozenBank] = useState<string | null>(null)
  const [overlayZichtbaar, zetOverlayZichtbaar] = useState(false)
  const [toonBank, zetToonBank] = useState(true)
  const [nieuweNaam, zetNieuweNaam] = useState('')
  const { kijkBlok, onKijkBlok } = props

  // Een ander wisselmoment bekijken sluit het ruilpaneel: dat hoorde bij een
  // plek in een andere opstelling. Behalve als je net op een wissel tikte:
  // dan gaat het paneel meteen open op de plek waar die wissel over ging.
  const straksKiezen = useRef<Positie | null>(null)
  useEffect(() => {
    zetGekozenPositie(straksKiezen.current)
    zetGekozenBank(null)
    straksKiezen.current = null
  }, [kijkBlok, huidigBlok])

  const perId = useMemo(() => new Map(aanwezigen.map((s) => [s.id, s])), [aanwezigen])
  const naam = (id: string) => perId.get(id)?.naam ?? '?'
  const kort = (id: string) => {
    const speelster = perId.get(id)
    return speelster ? korteNaam(speelster, aanwezigen) : '?'
  }

  // Welk blok ben je aan het bekijken? Tijdens het spelen is dat het blok dat
  // loopt. In de rust niet: `huidigBlok` is dan nog het blok dat net gespeeld
  // ís, en daar valt niets meer aan te veranderen. Wie in de rust de opstelling
  // wil bijstellen, bedoelt het kwart dat gaat komen -- dus kijkt het scherm
  // daar dan naartoe: het veld, de bank, het ruilpaneel en wat je vastzet.
  //
  // En de coach kan vooruitbladeren langs alle wisselmomenten die nog komen:
  // per moment de opstelling ná die wissel, en wie eruit en erin gaat. Daar
  // tik je een plek aan om het voorstel te veranderen ("niet Kiki erin, maar
  // Nora"). Een moment dat inmiddels geweest is valt vanzelf af.
  const heeftVolgende = rooster.blokken[huidigBlok + 1] !== undefined
  const rust = kwartVoorbij && heeftVolgende
  const eersteKijk = huidigBlok + 1
  const laatsteKijk = rooster.blokken.length - 1
  const kijk =
    kijkBlok !== null && kijkBlok >= eersteKijk && kijkBlok <= laatsteKijk ? kijkBlok : null
  const kijktVooruit = kijk !== null
  const bewerkBlok = kijk ?? (rust ? huidigBlok + 1 : huidigBlok)

  const blok = rooster.blokken[bewerkBlok]
  const vorigBlok = bewerkBlok > 0 ? rooster.blokken[bewerkBlok - 1] : null
  const volgendBlok = rooster.blokken[bewerkBlok + 1] ?? null

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

  // Valt het volgende wisselmoment op een kwartgrens? Dan is het een rustwissel:
  // de klok staat stil en iedereen staat bij elkaar, dus dat is het rustigste
  // moment om te wisselen. Dat verdient een eigen kop.
  const komendeIsRust =
    volgendBlok !== null &&
    kwartVanBlok(bewerkBlok + 1, blokkenPerKwart) !== kwartVanBlok(bewerkBlok, blokkenPerKwart)
  const huidigeIsRust =
    vorigBlok !== null &&
    kwartVanBlok(huidigBlok, blokkenPerKwart) !== kwartVanBlok(huidigBlok - 1, blokkenPerKwart)

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
    // Bij vooruitkijken gaan de markeringen over de wissel die je aanpast, niet
    // over de wissel daarna: groen is wie er dan in komt.
    const straksEruit = new Set(kijktVooruit ? [] : komende?.eruit ?? [])
    const straksSchuiven = new Set(
      kijktVooruit ? [] : (komende?.verplaatst ?? []).map((v) => v.id),
    )
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
  }, [blok, vorigBlok, komende, perId, aanwezigen, kijktVooruit])

  // Wie niet in het veld staat zit op de bank -- afgeleid uit wie er is, niet
  // alleen uit het blok. Een invalster die midden in een blok binnenkomt staat
  // namelijk nog niet in dat (vastgelegde) blok, en zou anders nergens te zien
  // zijn tot de volgende wissel.
  const bank = useMemo(() => {
    if (!blok) return []
    const opVeld = new Set(Object.values(blok.opstelling))
    const beschikbaar = aanwezigen
      .filter((s) => s.id !== keeperId && !uitgevallen.includes(s.id))
      .map((s) => s.id)
    const inBlok = blok.bank.filter((id) => beschikbaar.includes(id))
    return [...inBlok, ...beschikbaar.filter((id) => !opVeld.has(id) && !inBlok.includes(id))]
  }, [blok, aanwezigen, keeperId, uitgevallen])
  const blokWaarschuwingen = blok?.waarschuwingen ?? []

  const zetSpeelster = (id: string) => {
    if (!gekozenPositie) return
    onZetOpPositie(bewerkBlok, gekozenPositie, id)
    zetGekozenPositie(null)
  }

  const gekozenSpeelster = gekozenPositie ? blok?.opstelling[gekozenPositie] : null

  /**
   * Ruilen met twee tikken. Bij een blessure heb je geen tijd voor een lijst:
   * tik de speelster die eraf moet, tik wie erin komt, klaar. Werkt veld-veld
   * (die twee ruilen van plek), veld-bank en bank-veld (de een gaat eruit, de
   * ander erin). Het geldt voor het blok dat je voor je hebt; de vaste
   * wisselmomenten blijven waar ze waren, alleen de blokken daarna rekent de
   * app opnieuw.
   */
  const tikVeld = (positie: Positie) => {
    const hier = blok?.opstelling[positie] ?? null
    if (gekozenBank) {
      onZetOpPositie(bewerkBlok, positie, gekozenBank)
      zetGekozenBank(null)
      return
    }
    if (gekozenPositie && gekozenPositie !== positie) {
      if (hier) onZetOpPositie(bewerkBlok, gekozenPositie, hier)
      else if (gekozenSpeelster) onZetOpPositie(bewerkBlok, positie, gekozenSpeelster)
      zetGekozenPositie(null)
      return
    }
    zetGekozenPositie(gekozenPositie === positie ? null : positie)
  }

  const tikBank = (id: string) => {
    if (gekozenPositie) {
      onZetOpPositie(bewerkBlok, gekozenPositie, id)
      zetGekozenPositie(null)
      return
    }
    zetGekozenBank(gekozenBank === id ? null : id)
  }

  const bankOpVeld: BankSpeler[] = bank.map((id) => ({
    id,
    naam: kort(id),
    straksErin: !kijktVooruit && Boolean(komende?.paren.some((p) => p.erin === id)),
  }))

  const voegToe = () => {
    if (!nieuweNaam.trim()) return
    props.onVoegToe(nieuweNaam)
    zetNieuweNaam('')
  }

  return (
    <div className="scherm wedstrijd">
      {OEFENMODUS && (
        <div className="oefenbalk" role="status">
          <span className="oefenbalk-tekst">
            <strong>Oefenwedstrijd</strong>
            <em>
              {props.snelheid === 1
                ? 'klok loopt op echte snelheid'
                : `klok loopt ${props.snelheid}× sneller`}
            </em>
          </span>
          <span className="oefenbalk-knoppen">
            {SNELHEDEN.map((s) => (
              <button
                key={s}
                className={`knop mini ${props.snelheid === s ? 'aan' : ''}`}
                onClick={() => props.onSnelheid(s)}
                aria-pressed={props.snelheid === s}
              >
                {s}×
              </button>
            ))}
          </span>
        </div>
      )}

      <Clock
        kwart={kwart}
        secondenInKwart={secondenInKwart}
        blokkenPerKwart={blokkenPerKwart}
        loopt={loopt}
        kwartVoorbij={kwartVoorbij}
        onStart={() => { ontgrendel(); props.onStart() }}
        onPauze={props.onPauze}
        onVolgendKwart={props.onVolgendKwart}
      />

      <p className="tel wisselritme">
        Wisselmoment elke {formatTijd(blokSeconden(blokkenPerKwart))}
        {blokkenPerKwart > 1
          ? ` — ${blokkenPerKwart - 1}× per kwart plus de rust`
          : ' — alleen in de rust'}
      </p>

      {blokWaarschuwingen.length > 0 && (
        <div className="melding waarschuwing">
          {blokWaarschuwingen.map((w) => <p key={w}>{w}</p>)}
        </div>
      )}

      {rust && !kijktVooruit && (
        <p className="bewerkkop">
          Opstelling voor kwart {kwartVanBlok(bewerkBlok, blokkenPerKwart)} — tik op een plek om te
          wijzigen
        </p>
      )}

      {kijk !== null && (
        <div className="bewerkkop vooruitkop">
          <div className="bladeren">
            <button
              className="knop mini"
              onClick={() => onKijkBlok(kijk - 1)}
              disabled={kijk <= eersteKijk}
              aria-label="Vorig wisselmoment"
            >
              ‹
            </button>
            <p>
              <strong>
                Wisselmoment {kijk - huidigBlok} van {laatsteKijk - huidigBlok}
              </strong>
              <span>{momentOmschrijving(kijk, blokkenPerKwart)}</span>
            </p>
            <button
              className="knop mini"
              onClick={() => onKijkBlok(kijk + 1)}
              disabled={kijk >= laatsteKijk}
              aria-label="Volgend wisselmoment"
            >
              ›
            </button>
          </div>
          <p className="tel">
            Opstelling ná deze wissel. Tik op een plek en kies wie daar moet komen; de app
            rekent de rest van de wedstrijd daaromheen. Groen omrand komt erin.
          </p>
          <button className="knop klein" onClick={() => onKijkBlok(null)}>
            Klaar
          </button>
        </div>
      )}

      {/* De wissels staan bovenaan, in een eigen kleur: dat is waar je tijdens
          een kwart naar kijkt. Elke wissel is aan te tikken -- dan zie je de
          opstelling na die wissel en kies je wie er op die plek komt. */}
      {kijktVooruit && (
        <section className="wisselpaneel">
          <h2 className="wisselpaneel-kop">Zo gaat deze wissel</h2>
          {ketens.length === 0 ? (
            <p className="tel">Geen wissels: iedereen blijft staan.</p>
          ) : (
            <ul className="ketens">
              {ketens.map((keten) => (
                <Wisselketen
                  key={keten.eruit}
                  keten={keten}
                  naam={naam}
                  onKies={() => zetGekozenPositie(plekVanErin(keten))}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {!kijktVooruit && komendeKetens.length > 0 && (
        <section className={`wisselpaneel ${komendeIsRust ? 'rust' : ''}`}>
          <h2 className="wisselpaneel-kop">
            {komendeIsRust ? 'Rustwissel — na dit kwart' : 'Volgende wissel'}
          </h2>
          <p className="tel">
            {komendeIsRust ? 'De klok staat dan stil. ' : ''}Tik op een wissel om hem aan te passen.
          </p>
          <ul className="ketens">
            {komendeKetens.map((keten) => (
              <Wisselketen
                key={keten.eruit}
                keten={keten}
                naam={naam}
                onKies={() => {
                  straksKiezen.current = plekVanErin(keten)
                  onKijkBlok(bewerkBlok + 1)
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {/* De vooropstelling: alle wisselmomenten die nog komen, één voor één.
          Ook vóór de aftrap, zodat je het hele plan kunt doorlopen. */}
      {!kijktVooruit && rooster.blokken[bewerkBlok + 1] !== undefined && (
        <button className="knop klein" onClick={() => onKijkBlok(bewerkBlok + 1)}>
          Alle wisselmomenten bekijken
        </button>
      )}

      <Field
        spelers={spelers}
        keeperNaam={keeperId ? kort(keeperId) : undefined}
        onKies={tikVeld}
        gekozen={gekozenPositie}
        bank={bankOpVeld}
        onKiesBank={tikBank}
        gekozenBank={gekozenBank}
      />

      {gekozenPositie && (
        <p className="ruilhint" role="status">
          <strong>{gekozenSpeelster ? naam(gekozenSpeelster) : 'Lege plek'}</strong> gekozen — tik
          op een andere speelster in het veld of op de bank om direct te ruilen.
        </p>
      )}
      {gekozenBank && (
        <p className="ruilhint" role="status">
          <strong>{naam(gekozenBank)}</strong> van de bank gekozen — tik op de speelster in het
          veld die eruit moet.{' '}
          <button className="knop mini" onClick={() => zetGekozenBank(null)}>Annuleren</button>
        </p>
      )}

      {gekozenPositie && (
        <Ruilpaneel
          positie={gekozenPositie}
          huidigeId={gekozenSpeelster ?? null}
          kandidaten={aanwezigen.filter((s) => s.id !== keeperId && !uitgevallen.includes(s.id))}
          bank={bank}
          onKies={zetSpeelster}
          onLeeg={() => {
            onZetOpPositie(bewerkBlok, gekozenPositie, null)
            zetGekozenPositie(null)
          }}
          onAnnuleer={() => zetGekozenPositie(null)}
        />
      )}

      {/* Zelf ingrijpen legt dit blok vast: de app rekent er wel omheen voor de
          blokken die nog komen, maar verandert er zelf niets meer aan. Deze knop
          is de weg terug. */}
      {Boolean(vastgezet[bewerkBlok]) && (
        <p className="melding vastgezet">
          Deze opstelling heb je zelf gezet; de app laat hem staan.{' '}
          <button className="knop mini" onClick={() => props.onLaatAppBepalen(bewerkBlok)}>
            Laat de app dit blok bepalen
          </button>
        </p>
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
              // Bij vooruitkijken zou dit over de wissel daarna gaan; weglaten.
              const paar = kijktVooruit ? undefined : komende?.paren.find((p) => p.erin === id)
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

      {/* Ook tijdens de wedstrijd: er komt een invalster aanlopen, of je ziet
          pas bij de warming-up dat er eentje mee is. Wat al gespeeld is blijft
          staan; zij begint met nul minuten en komt dus snel aan de beurt. */}
      <section className="toevoegen">
        <h2>Invalster erbij</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            voegToe()
          }}
        >
          <input
            type="text"
            value={nieuweNaam}
            onChange={(e) => zetNieuweNaam(e.target.value)}
            placeholder="Naam van de invalster"
            aria-label="Naam van de invalster"
            autoComplete="off"
          />
          <button className="knop klein" type="submit" disabled={!nieuweNaam.trim()}>
            Toevoegen
          </button>
        </form>
        <p className="tel">
          Ze kan in elke linie staan en gaat op de bank; de app zet haar bij de volgende
          wissel erin. Wil je haar meteen in het veld, tik dan op een plek op het veld.
        </p>
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
                    <span style={{ width: `${(blokken / totaalBlokken) * 100}%` }} />
                  </span>
                  <span className="minuten">
                    {formatTijd(blokkenNaarSeconden(blokken, blokkenPerKwart))}
                  </span>
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
            {naam(keeperId)} keept de hele wedstrijd (
            {formatTijd(blokkenNaarSeconden(totaalBlokken, blokkenPerKwart))}).
          </p>
        )}
      </section>

      <div className="knoppenrij">
        <button className="knop klein" onClick={props.onVolgendBlok}>Volgend blok</button>
        <button className="knop klein" onClick={props.onOverzicht}>Overzicht</button>
        <button className="knop klein" onClick={props.onVoorbereiding}>Wijzig opstelling</button>
        <Bevestigknop
          className="knop klein gevaar"
          label="Nieuwe wedstrijd"
          vraag="Nieuwe wedstrijd beginnen? De keeper, de opstelling en de klok gaan weg. Je selectie en de centrale posities blijven staan."
          bevestig="Ja, nieuwe wedstrijd"
          onBevestig={props.onOpnieuw}
        />
      </div>

      {overlayZichtbaar && blok && (
        <SubOverlay
          blokNummer={huidigBlok + 1}
          kwart={kwart}
          rustwissel={huidigeIsRust}
          ketens={ketens}
          naam={naam}
          onKlaar={() => zetOverlayZichtbaar(false)}
        />
      )}
    </div>
  )
}

/** "Kwart 2, na 8:45" of "Rust voor kwart 3": wanneer valt dit wisselmoment? */
function momentOmschrijving(blok: number, blokkenPerKwart: number): string {
  const kwart = kwartVanBlok(blok, blokkenPerKwart)
  if (blok % blokkenPerKwart === 0) return `Rustwissel, begin kwart ${kwart}`
  const na = (blok % blokkenPerKwart) * blokSeconden(blokkenPerKwart)
  return `Kwart ${kwart}, na ${formatTijd(na)}`
}

/** De plek waar de speelster van de bank terechtkomt: daar kies je iemand anders. */
function plekVanErin(keten: WisselKeten): Positie {
  return keten.stappen[keten.stappen.length - 1]?.naar ?? keten.vanPositie
}
