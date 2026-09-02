import { BLOKKEN_PER_KWART, KWART_SECONDEN, blokInKwart, formatTijd, secondenTotWissel } from '../domain/clock'

interface Props {
  kwart: number
  secondenInKwart: number
  loopt: boolean
  kwartVoorbij: boolean
  onStart: () => void
  onPauze: () => void
  onVolgendKwart: () => void
}

export function Clock({ kwart, secondenInKwart, loopt, kwartVoorbij, onStart, onPauze, onVolgendKwart }: Props) {
  const totWissel = secondenTotWissel(secondenInKwart)
  const blok = blokInKwart(secondenInKwart) + 1
  const bijna = totWissel <= 30 && !kwartVoorbij

  return (
    <div className={`klok ${bijna ? 'bijna' : ''} ${loopt ? 'loopt' : 'stil'}`}>
      <div className="klok-kop">
        <span className="kwart">Kwart {kwart}</span>
        <span className="blokje">Blok {blok} van {BLOKKEN_PER_KWART}</span>
      </div>

      <div className="klok-tijd">
        <div className="aftellen">
          <span className="label">{kwartVoorbij ? 'Kwart voorbij' : 'Wissel over'}</span>
          <strong>{kwartVoorbij ? '—' : formatTijd(totWissel)}</strong>
        </div>
        <div className="verstreken">
          <span className="label">Gespeeld</span>
          <strong>{formatTijd(Math.min(secondenInKwart, KWART_SECONDEN))}</strong>
        </div>
      </div>

      {kwartVoorbij ? (
        <button className="knop groot" onClick={onVolgendKwart}>
          {kwart >= 4 ? 'Wedstrijd afgelopen' : `Start kwart ${kwart + 1}`}
        </button>
      ) : (
        <button className={`knop groot ${loopt ? 'pauze' : ''}`} onClick={loopt ? onPauze : onStart}>
          {loopt ? 'Pauze' : secondenInKwart > 0 ? 'Hervat' : 'Start'}
        </button>
      )}
    </div>
  )
}
