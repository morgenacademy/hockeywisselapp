import { useState } from 'react'

interface Props {
  /** Tekst op de knop zelf. */
  label: string
  /** Wat er verdwijnt; staat bij de tweede stap, vlak boven "Ja". */
  vraag: string
  /** Tekst op de bevestigknop, bijvoorbeeld "Ja, nieuwe wedstrijd". */
  bevestig: string
  onBevestig: () => void
  className?: string
}

/**
 * Een knop die eerst vraagt of je het zeker weet -- in de app zelf.
 *
 * Eerder deed de browser dat met `confirm()`. Maar in een afgeschermd venster
 * (een voorbeeldweergave, een app die de pagina insluit) blokkeert de browser
 * dat venstertje zonder iets te zeggen: `confirm()` geeft dan meteen "nee"
 * terug en de knop doet niets. Zo'n knop is erger dan geen knop. Hier staat de
 * vraag daarom gewoon onder de knop, met een tweede knop om door te zetten.
 */
export function Bevestigknop({ label, vraag, bevestig, onBevestig, className = 'knop klein' }: Props) {
  const [vraagt, zetVraagt] = useState(false)

  if (!vraagt) {
    return (
      <button className={className} onClick={() => zetVraagt(true)}>
        {label}
      </button>
    )
  }

  return (
    <div className="bevestig" role="alertdialog" aria-label={label}>
      <p>{vraag}</p>
      <div className="knoppenrij">
        <button
          className="knop klein gevaar"
          onClick={() => {
            zetVraagt(false)
            onBevestig()
          }}
        >
          {bevestig}
        </button>
        <button className="knop klein" onClick={() => zetVraagt(false)} autoFocus>
          Annuleren
        </button>
      </div>
    </div>
  )
}
