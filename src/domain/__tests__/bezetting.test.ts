import { describe, expect, it } from 'vitest'
import { benodigd, bezettingsAdvies, heeftTekort } from '../bezetting'
import { POSITIE_CODES } from '../formation'
import { SELECTIE, magOpPositie, type Speelster } from '../players'
import { maakRooster } from '../schedule'

describe('de rekensom', () => {
  it('vraagt van elke groep haar eigen aandeel van de selectie', () => {
    // Bij 15 veldspeelsters: vier van de tien plekken achterin vraagt 4/10 × 15 = 6.
    expect(benodigd(4, 15).advies).toBe(6)
    expect(benodigd(3, 15).advies).toBe(5)
  })

  it('vraagt er twee extra waar dat aandeel klein is, zodat twee tegelijk kunnen rusten', () => {
    // Twee centrale plekken achterin geeft een aandeel van 3, maar dan kan er
    // maar één tegelijk rusten en ontwijken hun rustbeurten elkaar.
    expect(benodigd(2, 15).advies).toBe(4)
    expect(benodigd(1, 15).advies).toBe(3)
  })

  it('vraagt precies de plekken als er niemand rust', () => {
    // Tien veldspeelsters: iedereen speelt alles, dus rustbeurten bestaan niet.
    expect(benodigd(4, 10)).toEqual({ minimum: 4, advies: 4 })
    expect(benodigd(2, 10)).toEqual({ minimum: 2, advies: 2 })
  })

  it('vraagt er minder naarmate er minder speelsters zijn', () => {
    const reeks = [15, 14, 13, 12, 11, 10].map((v) => benodigd(4, v).advies)
    for (let i = 1; i < reeks.length; i++) expect(reeks[i]).toBeLessThanOrEqual(reeks[i - 1])
  })

  it('houdt het minimum op precies de plekken die gevuld moeten worden', () => {
    expect(benodigd(2, 15).minimum).toBe(2)
    expect(benodigd(1, 15).minimum).toBe(1)
  })
})

describe('advies voor de echte selectie', () => {
  it('rekent de keeper alvast af als die nog niet gekozen is', () => {
    // Zestien aanwezig betekent vijftien veldspeelsters, ook al weet je nog niet
    // wie er keept. Anders staat het advies op het aanwezigheidsscherm te hoog.
    const zonderKeeper = bezettingsAdvies(SELECTIE, null)
    const metKeeper = bezettingsAdvies(SELECTIE, 'p16')
    const verdediging = (lijst: typeof zonderKeeper) => lijst.find((g) => g.naam === 'Verdediging')!
    expect(verdediging(zonderKeeper).advies).toBe(verdediging(metKeeper).advies)
    expect(verdediging(zonderKeeper).advies).toBe(6)
  })

  it('haalt met de volle selectie alle vijf de groepen', () => {
    const advies = bezettingsAdvies(SELECTIE, 'p16')
    for (const groep of advies) {
      expect(groep.status, `${groep.naam}: ${groep.aanwezig} van ${groep.advies}`).toBe('goed')
    }
    expect(heeftTekort(advies)).toBe(false)
  })

  it('ziet het verdedigingstekort bij de bezetting waar dat misging', () => {
    // Deze veertien houden maar vijf verdedigers over voor vier plekken; precies
    // de bezetting waarin speelsters buiten hun linie kwamen te staan.
    const advies = bezettingsAdvies(SELECTIE.slice(0, 14), 'p01')
    const verdediging = advies.find((g) => g.naam === 'Verdediging')!
    expect(verdediging.aanwezig).toBe(5)
    expect(verdediging.advies).toBe(6)
    expect(verdediging.status).not.toBe('goed')
  })

  it('noemt wie je kunt aanvullen, en alleen waar dat kan', () => {
    const advies = bezettingsAdvies(SELECTIE, 'p16')
    const achter = advies.find((g) => g.sleutel === 'centraalAchter')!
    const midden = advies.find((g) => g.sleutel === 'centraalMidden')!
    // Kate en Eva van der Zee spelen verdediging maar staan niet op centraal.
    expect(achter.aanTeVullen.map((s) => s.id)).toContain('p05')
    expect(midden.aanTeVullen.map((s) => s.id)).toContain('p04')
    // Cato kan nergens centraal staan, dus zij hoort in geen enkele suggestie.
    for (const groep of advies) expect(groep.aanTeVullen.map((s) => s.id)).not.toContain('p07')
    // De linies zijn niet met een knop op te lossen.
    for (const groep of advies.filter((g) => g.sleutel.startsWith('linie'))) {
      expect(groep.aanTeVullen).toEqual([])
    }
  })
})

describe('het advies voorspelt wat de solver doet', () => {
  const alleBezettingen = () => {
    const gevallen: { aanwezigen: Speelster[]; keeperId: string }[] = []
    for (let n = 11; n <= 16; n++) {
      const aanwezigen = SELECTIE.slice(0, n)
      for (const keeper of aanwezigen) gevallen.push({ aanwezigen, keeperId: keeper.id })
    }
    return gevallen
  }

  const roosterVoor = ({ aanwezigen, keeperId }: { aanwezigen: Speelster[]; keeperId: string }) =>
    maakRooster({
      aanwezigen,
      keeperId,
      sterkteAchter: aanwezigen.filter((s) => s.id !== keeperId && magOpPositie(s, 'LV')).map((s) => s.id),
      sterkteMidden: aanwezigen.filter((s) => s.id !== keeperId && magOpPositie(s, 'CM')).map((s) => s.id),
    })

  it('haalt een bezetting het linie-advies, dan is het schema vrijwel altijd schoon', () => {
    let gehaald = 0
    let schoon = 0
    for (const geval of alleBezettingen()) {
      const advies = bezettingsAdvies(geval.aanwezigen, geval.keeperId)
      const liniesGoed = advies
        .filter((g) => g.sleutel.startsWith('linie'))
        .every((g) => g.status === 'goed')
      if (!liniesGoed) continue
      gehaald++
      const buitenLinie = roosterVoor(geval).waarschuwingen.filter((w) =>
        w.includes('buiten haar linie'),
      )
      if (buitenLinie.length === 0) schoon++
    }
    // Zonder dit zou de test niets bewijzen.
    expect(gehaald).toBeGreaterThan(20)
    // Geen garantie maar een sterke indicatie: het advies telt per groep, en wie
    // twee linies speelt telt twee keer mee terwijl ze maar op één plek tegelijk
    // kan staan. Gemeten: 62 van de 63, en die ene zit exact op de grens.
    expect(schoon / gehaald).toBeGreaterThan(0.95)
  })

  it('haalt een bezetting het linie-advies niet, dan komt dat er ook uit', () => {
    // Andersom moet ook kloppen, anders is het advies te streng gekozen: er moet
    // minstens één bezetting zijn die het advies mist én echt problemen geeft.
    const misgelopen = alleBezettingen().filter((geval) => {
      const advies = bezettingsAdvies(geval.aanwezigen, geval.keeperId)
      return advies.filter((g) => g.sleutel.startsWith('linie')).some((g) => g.status !== 'goed')
    })
    expect(misgelopen.length).toBeGreaterThan(0)

    const metProblemen = misgelopen.filter((geval) =>
      roosterVoor(geval).waarschuwingen.some((w) => w.includes('buiten haar linie')),
    )
    expect(metProblemen.length).toBeGreaterThan(0)
  })

  it('geeft een bezetting die het advies haalt ook een geldig rooster', () => {
    for (const geval of alleBezettingen()) {
      const advies = bezettingsAdvies(geval.aanwezigen, geval.keeperId)
      if (heeftTekort(advies)) continue
      const r = roosterVoor(geval)
      expect(r.waarschuwingen.filter((w) => w.includes('Noodbezetting'))).toEqual([])
      for (const blok of r.blokken) {
        expect(POSITIE_CODES.map((p) => blok.opstelling[p]).filter(Boolean)).toHaveLength(10)
      }
    }
  })
})
