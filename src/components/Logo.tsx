import { useState } from 'react'

/**
 * Het clublogo, met een woordmerk als terugval.
 *
 * Zet het bestand als `public/logo.svg` of `public/logo.png` -- de app probeert
 * ze in die volgorde en pakt op wat er staat. Is er niets, dan toont dit het
 * woordmerk HCP in de clubkleuren in plaats van een gebroken plaatje. Er hoeft
 * dus geen code aangepast te worden om het echte logo erin te zetten.
 */
const BESTANDEN = ['logo.svg', 'logo.png']

export function Logo({ formaat = 34 }: { formaat?: number }) {
  const [poging, zetPoging] = useState(0)

  if (poging >= BESTANDEN.length) {
    return (
      <span
        className="logo-woordmerk"
        style={{ width: formaat, height: formaat }}
        aria-label="HC Prinsenbeek"
      >
        HCP
      </span>
    )
  }

  return (
    <img
      className="logo-beeld"
      src={`${import.meta.env.BASE_URL}${BESTANDEN[poging]}`}
      width={formaat}
      height={formaat}
      alt="HC Prinsenbeek"
      onError={() => zetPoging((p) => p + 1)}
    />
  )
}
