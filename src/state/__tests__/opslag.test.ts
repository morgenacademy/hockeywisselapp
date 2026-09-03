import { describe, expect, it } from 'vitest'
import { SELECTIE } from '../../domain/players'
import { selectieIsGeldig } from '../matchStore'

/**
 * De opgeslagen wedstrijd mag de app nooit kunnen platleggen.
 *
 * Twee keer misgegaan in deze app: een oude stand die de gebruiker in een
 * onbereikbare wedstrijd zette, en een `centraal` die van ja/nee naar een lijst
 * linies ging zonder dat het versienummer meeging -- witte pagina, niets meer
 * te doen. Het inlezen controleert daarom niet alleen het versienummer maar ook
 * de vorm; deze test bewaakt die tweede controle.
 */
describe('een opgeslagen selectie inlezen', () => {
  it('accepteert de selectie zoals de app hem nu wegschrijft', () => {
    expect(selectieIsGeldig(SELECTIE)).toBe(true)
    // Door opslag en terug: JSON maakt er gewone objecten van.
    expect(selectieIsGeldig(JSON.parse(JSON.stringify(SELECTIE)))).toBe(true)
  })

  it('weigert de oude vorm waarin centraal een ja/nee-waarde was', () => {
    // Precies de stand die de witte pagina veroorzaakte.
    const oud = [{ id: 'p01', naam: 'Lily le Blanc', linies: ['V', 'M'], centraal: true }]
    expect(selectieIsGeldig(oud)).toBe(false)
  })

  it('weigert onvolledige of onzinnige gegevens', () => {
    expect(selectieIsGeldig(undefined)).toBe(false)
    expect(selectieIsGeldig(null)).toBe(false)
    expect(selectieIsGeldig('geen lijst')).toBe(false)
    expect(selectieIsGeldig([{ id: 'p01' }])).toBe(false)
    expect(selectieIsGeldig([{ id: 'p01', naam: 'X', linies: 'V', centraal: [] }])).toBe(false)
  })

  it('accepteert een lege lijst', () => {
    // Geen selectie is geen kapotte selectie.
    expect(selectieIsGeldig([])).toBe(true)
  })

  it('houdt de vaste selectie in de nieuwe vorm', () => {
    for (const speelster of SELECTIE) {
      expect(Array.isArray(speelster.centraal), speelster.naam).toBe(true)
      // Centraal verwijst alleen naar linies die ze ook echt speelt.
      for (const linie of speelster.centraal) {
        expect(speelster.linies, `${speelster.naam} centraal in ${linie}`).toContain(linie)
      }
    }
  })
})
