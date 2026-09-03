import { useState } from 'react'

/**
 * Het clublogo, met een woordmerk als terugval.
 *
 * Staat `public/logo.svg` er niet, dan toont dit het woordmerk HCP in de
 * clubkleuren in plaats van een gebroken plaatje. Zodra het echte bestand in
 * `public/` gezet wordt pakt de app het vanzelf op -- daar hoeft geen code voor
 * aangepast te worden.
 */
export function Logo({ formaat = 34 }: { formaat?: number }) {
  const [gelukt, zetGelukt] = useState(true)

  if (!gelukt) {
    return (
      <span className="logo-woordmerk" style={{ width: formaat, height: formaat }} aria-label="HC Prinsenbeek">
        HCP
      </span>
    )
  }

  return (
    <img
      className="logo-beeld"
      src={`${import.meta.env.BASE_URL}logo.svg`}
      width={formaat}
      height={formaat}
      alt="HC Prinsenbeek"
      onError={() => zetGelukt(false)}
    />
  )
}
