import { Component, type ErrorInfo, type ReactNode } from 'react'
import { OPSLAG_SLEUTEL } from '../state/matchStore'

interface Props {
  children: ReactNode
}

interface State {
  fout: Error | null
}

/**
 * Vangt een fout in het scherm op, zodat er langs de lijn nooit een witte
 * pagina staat.
 *
 * Het lezen van de opslag was al afgeschermd, maar dat dekt alleen het
 * opstarten. Gaat er tijdens de wedstrijd iets mis in het tekenen van een
 * scherm, dan haalt React de hele boom weg en blijf je met niets achter --
 * midden in een kwart, met een team dat op een wissel wacht.
 *
 * Vandaar dat hier twee uitwegen staan in plaats van alleen een melding.
 * Opnieuw proberen is de zachte: de opgeslagen wedstrijd blijft staan, en bij
 * een eenmalige fout ben je meteen weer waar je was. Helpt dat niet, dan zit
 * de fout in de opgeslagen stand zelf en is alles wissen de enige weg vooruit
 * -- hard, maar je kunt daarna tenminste verder met de wedstrijd.
 */
export class Vangnet extends Component<Props, State> {
  state: State = { fout: null }

  static getDerivedStateFromError(fout: Error): State {
    return { fout }
  }

  componentDidCatch(fout: Error, info: ErrorInfo) {
    // Er is geen server om dit heen te sturen, dus de console is alles wat er
    // is -- maar dat is genoeg om het achteraf na te kunnen zoeken.
    console.error('Onverwachte fout in de app:', fout, info.componentStack)
  }

  render() {
    const { fout } = this.state
    if (!fout) return this.props.children

    return (
      <div className="vangnet">
        <h1>Er ging iets mis</h1>
        <p>
          De app liep vast op een onverwachte fout. Je opgeslagen wedstrijd staat er
          nog; probeer het eerst opnieuw.
        </p>
        <div className="knoppenrij">
          <button className="knop groot" onClick={() => this.setState({ fout: null })}>
            Opnieuw proberen
          </button>
        </div>
        <p>
          Komt dezelfde fout terug, dan zit hij in de opgeslagen wedstrijd. Alles
          wissen zet de app terug zoals hij uit de doos komt: de wedstrijd én de
          aangepaste linies gaan weg.
        </p>
        <div className="knoppenrij">
          <button
            className="knop gevaar"
            onClick={() => {
              try {
                localStorage.removeItem(OPSLAG_SLEUTEL)
              } catch {
                // Opslag kan geweigerd worden; herladen is dan het enige dat rest.
              }
              location.reload()
            }}
          >
            Alles wissen en opnieuw beginnen
          </button>
        </div>
        <pre className="vangnet-fout">{fout.message}</pre>
      </div>
    )
  }
}
