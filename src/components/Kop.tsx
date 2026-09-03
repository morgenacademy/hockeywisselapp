import { Logo } from './Logo'

/**
 * Kopbalk boven de voorbereidingsschermen. Het wedstrijdscherm heeft hem niet:
 * daar is elke pixel voor de klok en het veld.
 */
export function Kop() {
  return (
    <header className="kop">
      <Logo />
      <span className="kop-naam">
        <strong>HC Prinsenbeek</strong>
        <em>Wissels</em>
      </span>
    </header>
  )
}
