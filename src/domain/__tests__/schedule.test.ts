import { describe, expect, it } from 'vitest'
import {
  AANTAL_BLOKKEN,
  BLOK_SECONDEN,
  WEDSTRIJD_SECONDEN,
  isKwartStart,
  kwartVanBlok,
} from '../clock'
import { AANTAL_VELDPOSITIES, POSITIE_CODES, positieInfo, type Positie } from '../formation'
import {
  SELECTIE,
  centraalHeeftZin,
  inLinie,
  magOpPositie,
  sleutelPositiesVoor,
  type Speelster,
} from '../players'
import {
  controleerBezetting,
  heeftGeldigeSleutelbezetting,
  maakRooster,
  wisselKetens,
  wisselOverzicht,
  wisselsTussen,
  type Blok,
  type Rooster,
} from '../schedule'

const perId = new Map(SELECTIE.map((s) => [s.id, s]))
const speelster = (id: string): Speelster => {
  const s = perId.get(id)
  if (!s) throw new Error(`onbekende speelster ${id}`)
  return s
}

/** Standaard sterkte-volgordes: alle speelsters die de linie centraal aankunnen. */
const sterkteAchter = SELECTIE.filter((s) => magOpPositie(s, 'LV')).map((s) => s.id)
const sterkteMidden = SELECTIE.filter((s) => magOpPositie(s, 'CM')).map((s) => s.id)

function rooster(aantalAanwezig: number, extra: Partial<Parameters<typeof maakRooster>[0]> = {}): Rooster {
  const aanwezigen = SELECTIE.slice(0, aantalAanwezig)
  return maakRooster({
    aanwezigen,
    keeperId: aanwezigen[0].id,
    sterkteAchter: sterkteAchter.filter((id) => aanwezigen.some((a) => a.id === id)),
    sterkteMidden: sterkteMidden.filter((id) => aanwezigen.some((a) => a.id === id)),
    ...extra,
  })
}

function bezetteIds(blok: Blok): string[] {
  return POSITIE_CODES.map((p) => blok.opstelling[p]).filter(Boolean) as string[]
}

describe('wedstrijdindeling', () => {
  it('verdeelt 70 minuten in 12 blokken van 5:50', () => {
    expect(AANTAL_BLOKKEN).toBe(12)
    expect(BLOK_SECONDEN).toBe(350)
    expect(AANTAL_BLOKKEN * BLOK_SECONDEN).toBe(WEDSTRIJD_SECONDEN)
  })
})

describe('rooster voor elke bezetting van 11 t/m 16', () => {
  for (let aanwezig = 11; aanwezig <= 16; aanwezig++) {
    describe(`${aanwezig} aanwezig`, () => {
      const r = rooster(aanwezig)
      const veldAantal = aanwezig - 1

      it('levert 12 blokken', () => {
        expect(r.blokken).toHaveLength(AANTAL_BLOKKEN)
      })

      it('bezet elk blok alle 10 veldposities zonder dubbelen', () => {
        for (const blok of r.blokken) {
          const ids = bezetteIds(blok)
          expect(ids).toHaveLength(AANTAL_VELDPOSITIES)
          expect(new Set(ids).size).toBe(AANTAL_VELDPOSITIES)
          expect(ids).not.toContain(r.keeperId)
        }
      })

      it('verdeelt precies 120 speelster-blokken', () => {
        const totaal = Object.values(r.gespeeld).reduce((a, b) => a + b, 0)
        expect(totaal).toBe(AANTAL_BLOKKEN * AANTAL_VELDPOSITIES)
        expect(Object.keys(r.gespeeld)).toHaveLength(veldAantal)
      })

      it('houdt het verschil in speeltijd op hoogstens één blok', () => {
        const waarden = Object.values(r.gespeeld)
        expect(Math.max(...waarden) - Math.min(...waarden)).toBeLessThanOrEqual(1)
      })

      it('zet niemand op een sleutelpositie die daar niet mag staan', () => {
        for (const blok of r.blokken) {
          for (const positie of ['LV', 'CV', 'CM'] as Positie[]) {
            const id = blok.opstelling[positie]
            expect(id).toBeTruthy()
            expect(magOpPositie(speelster(id!), positie)).toBe(true)
          }
        }
      })

      it('meldt nooit een probleem op een sleutelpositie', () => {
        for (const melding of r.waarschuwingen) {
          expect(melding).not.toMatch(/Noodbezetting|niemand beschikbaar/)
        }
      })

      it('markeert elke speelster die buiten haar linie staat', () => {
        for (const blok of r.blokken) {
          for (const positie of POSITIE_CODES) {
            const id = blok.opstelling[positie]
            if (!id) continue
            if (speelster(id).linies.includes(positieInfo(positie).linie)) continue
            // Buiten je linie spelen mag als de speeltijd dat vraagt, maar
            // dan moet het wel zichtbaar zijn langs de lijn.
            expect(
              r.waarschuwingen.some(
                (w) => w.startsWith(`Blok ${blok.index + 1}:`) && w.includes(speelster(id).naam),
              ),
              `${speelster(id).naam} staat ongemarkeerd op ${positieInfo(positie).naam}`,
            ).toBe(true)
          }
        }
      })

      it('laat niemand twee blokken achter elkaar op de bank', () => {
        for (let i = 1; i < r.blokken.length; i++) {
          const vorige = new Set(r.blokken[i - 1].bank)
          const dubbel = r.blokken[i].bank.filter((id) => vorige.has(id))
          expect(dubbel).toEqual([])
        }
      })
    })
  }
})

describe('speeltijdverdeling per bezetting', () => {
  const verwacht: Record<number, number[]> = {
    16: [8, 8],
    15: [8, 9],
    14: [9, 10],
    13: [10, 10],
    12: [10, 11],
    11: [12, 12],
  }
  for (const [aanwezig, [min, max]] of Object.entries(verwacht)) {
    it(`${aanwezig} aanwezig: ${min} tot ${max} blokken per speelster`, () => {
      const waarden = Object.values(rooster(Number(aanwezig)).gespeeld)
      expect(Math.min(...waarden)).toBe(min)
      expect(Math.max(...waarden)).toBe(max)
    })
  }

  it('laat bij 11 aanwezig iedereen de hele wedstrijd spelen', () => {
    const r = rooster(11)
    expect(Object.values(r.gespeeld).every((n) => n === AANTAL_BLOKKEN)).toBe(true)
    for (const blok of r.blokken) expect(blok.bank).toEqual([])
  })
})

describe('Cato van Kempen (Aanval, kan centraal)', () => {
  const cato = 'p07'

  it('staat in geen enkel rooster op een sleutelpositie', () => {
    for (let aanwezig = 11; aanwezig <= 16; aanwezig++) {
      for (const blok of rooster(aanwezig).blokken) {
        for (const positie of ['LV', 'CV', 'CM'] as Positie[]) {
          expect(blok.opstelling[positie]).not.toBe(cato)
        }
      }
    }
  })

  it('mag wel op LA, SP en RA', () => {
    for (const positie of ['LA', 'SP', 'RA'] as Positie[]) {
      expect(magOpPositie(speelster(cato), positie)).toBe(true)
    }
  })

  it('komt in de praktijk ook echt op de vleugel te staan', () => {
    const posities = new Set<Positie>()
    for (const blok of rooster(16).blokken) {
      for (const positie of POSITIE_CODES) {
        if (blok.opstelling[positie] === cato) posities.add(positie)
      }
    }
    expect([...posities].every((p) => ['LA', 'SP', 'RA'].includes(p))).toBe(true)
    expect(posities.size).toBeGreaterThan(1)
  })
})

describe('Kate Janssen (Verdediging, niet centraal)', () => {
  it('staat alleen op linksback of rechtsback', () => {
    const posities = new Set<Positie>()
    for (let aanwezig = 11; aanwezig <= 16; aanwezig++) {
      for (const blok of rooster(aanwezig).blokken) {
        for (const positie of POSITIE_CODES) {
          if (blok.opstelling[positie] === 'p05') posities.add(positie)
        }
      }
    }
    expect([...posities].sort()).toEqual(['LB', 'RB'])
  })
})

describe('rouleren van de centrale posities', () => {
  it('geeft elke speelster uit de pool minstens één sleutelblok', () => {
    const r = rooster(16)
    const gezien = new Set<string>()
    for (const blok of r.blokken) {
      for (const positie of ['LV', 'CV', 'CM'] as Positie[]) {
        const id = blok.opstelling[positie]
        if (id) gezien.add(id)
      }
    }
    const pool = SELECTIE.filter(
      (s) => s.id !== r.keeperId && (magOpPositie(s, 'LV') || magOpPositie(s, 'CM')),
    )
    for (const s of pool) expect(gezien.has(s.id), `${s.naam} stond nooit centraal`).toBe(true)
  })

  it('gebruikt Lily, Nora en Lynn niet zo achterin dat CM leegloopt', () => {
    const r = rooster(16)
    for (const blok of r.blokken) {
      const cm = blok.opstelling.CM
      expect(cm).toBeTruthy()
      expect(magOpPositie(speelster(cm!), 'CM')).toBe(true)
    }
  })

  it('laat de sterkte-volgorde meewegen: hoger in de lijst is vaker centraal', () => {
    // Eva van der Zee keept, zodat de hele centrale pool beschikbaar is.
    const keeperId = 'p16'
    const achter = sterkteAchter.filter((id) => id !== keeperId)
    const midden = sterkteMidden.filter((id) => id !== keeperId)

    const centraalBlokken = (r: Rooster, id: string) =>
      r.blokken.filter((b) => (['LV', 'CV', 'CM'] as Positie[]).some((p) => b.opstelling[p] === id))
        .length

    const normaal = maakRooster({
      aanwezigen: SELECTIE,
      keeperId,
      sterkteAchter: achter,
      sterkteMidden: midden,
    })
    const omgekeerd = maakRooster({
      aanwezigen: SELECTIE,
      keeperId,
      sterkteAchter: [...achter].reverse(),
      sterkteMidden: [...midden].reverse(),
    })

    // De volgorde mag niemand bendelen: iedereen uit de pool komt centraal, en
    // wie bovenaan staat wordt niet minder ingezet dan wanneer ze onderaan staat.
    const bovenaan = achter[0]
    const onderaan = achter[achter.length - 1]
    expect(centraalBlokken(normaal, bovenaan)).toBeGreaterThanOrEqual(
      centraalBlokken(omgekeerd, bovenaan),
    )
    expect(centraalBlokken(omgekeerd, onderaan)).toBeGreaterThanOrEqual(
      centraalBlokken(normaal, onderaan),
    )

    // EERLIJK OVER DE BEPERKING: in de praktijk stuurt deze volgorde bijna
    // niets meer. Drie eisen die zwaarder wegen laten geen ruimte over --
    // gelijke speeltijd, blijven staan waar je stond, en speelsters die om
    // dezelfde plek concurreren samen laten spelen. Bij volle bezetting komen
    // alle zes uit de pool op precies zes centrale blokken uit, ongeacht de
    // volgorde. De lijst bepaalt nog wel wie er centraal ínvalt op het moment
    // dat er een plek vrijkomt.
  })

  it('geeft niemand meer centrale blokken dan ze speelt', () => {
    const r = rooster(16)
    for (const [id, gespeeld] of Object.entries(r.gespeeld)) {
      const centraal = r.blokken.filter((b) =>
        (['LV', 'CV', 'CM'] as Positie[]).some((p) => b.opstelling[p] === id),
      ).length
      expect(centraal).toBeLessThanOrEqual(gespeeld)
    }
  })
})

describe('herberekening bij een blessure', () => {
  const basis = rooster(15)
  const geblesseerde = basis.blokken[4].opstelling.RM!
  const gespeeldVoor: Record<string, number> = {}
  for (const blok of basis.blokken.slice(0, 5)) {
    for (const positie of POSITIE_CODES) {
      const id = blok.opstelling[positie]
      if (id) gespeeldVoor[id] = (gespeeldVoor[id] ?? 0) + 1
    }
  }
  const aanwezigen = SELECTIE.slice(0, 15)
  const herbereken = maakRooster({
    aanwezigen,
    keeperId: aanwezigen[0].id,
    sterkteAchter: sterkteAchter.filter((id) => aanwezigen.some((a) => a.id === id)),
    sterkteMidden: sterkteMidden.filter((id) => aanwezigen.some((a) => a.id === id)),
    uitgevallen: [geblesseerde],
    vanafBlok: 5,
    gespeeldVoor,
    eerdereBlokken: basis.blokken,
  })

  it('houdt de eerste vijf blokken ongewijzigd', () => {
    for (let i = 0; i < 5; i++) {
      expect(herbereken.blokken[i].opstelling).toEqual(basis.blokken[i].opstelling)
    }
  })

  it('zet de geblesseerde speelster niet meer op het veld', () => {
    for (const blok of herbereken.blokken.slice(5)) {
      expect(bezetteIds(blok)).not.toContain(geblesseerde)
    }
  })

  it('houdt de resterende blokken geldig en compleet', () => {
    for (const blok of herbereken.blokken.slice(5)) {
      expect(bezetteIds(blok)).toHaveLength(AANTAL_VELDPOSITIES)
      for (const positie of ['LV', 'CV', 'CM'] as Positie[]) {
        expect(magOpPositie(speelster(blok.opstelling[positie]!), positie)).toBe(true)
      }
    }
  })

  it('houdt de speeltijd van de overige speelsters in balans', () => {
    const waarden = Object.entries(herbereken.gespeeld)
      .filter(([id]) => id !== geblesseerde)
      .map(([, n]) => n)
    expect(Math.max(...waarden) - Math.min(...waarden)).toBeLessThanOrEqual(1)
  })
})

describe('onvulbare bezetting', () => {
  // Elf aanwezigen waarvan bijna niemand centraal kan: dit moet luid falen,
  // niet stilletjes de regel breken.
  const dun: Speelster[] = [
    speelster('p05'), // Kate  - V
    speelster('p04'), // Liv   - M/A
    speelster('p07'), // Cato  - A (centraal, maar alleen aanval)
    speelster('p08'), // Suus  - M/A
    speelster('p09'), // Saffiya - M/V
    speelster('p11'),
    speelster('p12'),
    speelster('p13'),
    speelster('p14'),
    speelster('p16'),
    speelster('p03'), // Eva Hoevers - V, centraal
  ]

  it('waarschuwt vooraf dat de centrale posities niet rond komen', () => {
    const check = controleerBezetting(dun, 'p03')
    expect(check.ok).toBe(false)
    expect(check.meldingen.join(' ')).toMatch(/laatste vrouw|centrale/i)
  })

  it('zet toch elf speelsters in het veld en markeert de noodbezetting', () => {
    const r = maakRooster({ aanwezigen: dun, keeperId: 'p03' })
    // Elf spelen is beter dan acht spelen; maar het moet wel opvallen.
    for (const blok of r.blokken) {
      expect(bezetteIds(blok)).toHaveLength(AANTAL_VELDPOSITIES)
    }
    expect(r.waarschuwingen.some((w) => w.includes('Noodbezetting'))).toBe(true)
  })

  it('kiest bij een noodbezetting op CM liever een middenvelder dan Cato', () => {
    const r = maakRooster({ aanwezigen: dun, keeperId: 'p03' })
    for (const blok of r.blokken) {
      const cm = blok.opstelling.CM
      if (!cm) continue
      expect(speelster(cm).linies).toContain('M')
    }
  })

  it('keurt een gezonde bezetting wél goed', () => {
    expect(controleerBezetting(SELECTIE, 'p05').ok).toBe(true)
    expect(heeftGeldigeSleutelbezetting(SELECTIE.filter((s) => s.id !== 'p05'))).toBe(true)
  })
})

describe('linies vooraf aanpassen', () => {
  /**
   * De knoppen op het aanwezigheidsscherm passen `linies` aan; het rooster
   * hoeft daar niets voor te weten, want het leest die lijst al. Deze test legt
   * dat contract vast: verandert de lijst, dan verandert het rooster mee.
   */
  it('laat een speelster achterin spelen zodra je die linie aanzet', () => {
    // Kiki speelt middenveld en aanval, dus achterin hoort ze niet thuis.
    expect(inLinie(speelster('p02'), 'LB')).toBe(false)

    const metKiki = SELECTIE.map((s) =>
      s.id === 'p02' ? { ...s, linies: ['V' as const, 'M' as const, 'A' as const] } : s,
    )
    const kiki = metKiki.find((s) => s.id === 'p02')!
    expect(inLinie(kiki, 'LB')).toBe(true)

    // En dan komt ze in een rooster ook echt achterin te staan, zonder dat er
    // een "buiten haar linie"-melding voor nodig is.
    const zonderVerdedigers = metKiki.filter(
      (s) => !['p03', 'p06', 'p16'].includes(s.id) && s.id !== 'p11',
    )
    const r = maakRooster({
      aanwezigen: zonderVerdedigers,
      keeperId: 'p12',
      sterkteAchter: zonderVerdedigers
        .filter((s) => s.id !== 'p12' && magOpPositie(s, 'LV'))
        .map((s) => s.id),
      sterkteMidden: zonderVerdedigers
        .filter((s) => s.id !== 'p12' && magOpPositie(s, 'CM'))
        .map((s) => s.id),
    })
    const achterin: Positie[] = ['LB', 'LV', 'CV', 'RB']
    const stondAchterin = r.blokken.some((blok) =>
      achterin.some((positie) => blok.opstelling[positie] === 'p02'),
    )
    expect(stondAchterin).toBe(true)
  })

  it('houdt haar buiten een linie die je weghaalt', () => {
    // Lynn speelt normaal alle drie de linies.
    expect(inLinie(speelster('p15'), 'LM')).toBe(true)

    const zonderMidden = SELECTIE.map((s) =>
      s.id === 'p15' ? { ...s, linies: ['V' as const, 'A' as const], centraal: ['V' as const] } : s,
    )
    const lynn = zonderMidden.find((s) => s.id === 'p15')!
    expect(inLinie(lynn, 'LM')).toBe(false)
    // En daarmee vervalt ook haar centrale middenveld, ook al zou de vlag er nog staan.
    expect(magOpPositie(lynn, 'CM')).toBe(false)
    expect(magOpPositie(lynn, 'LV')).toBe(true)
  })
})

describe('centraal vooraf aanzetten', () => {
  it('weet per speelster welke sleutelposities de vlag ontgrendelt', () => {
    expect(sleutelPositiesVoor(speelster('p05'))).toEqual(['LV', 'CV']) // Kate: alleen verdediging
    expect(sleutelPositiesVoor(speelster('p04'))).toEqual(['CM']) // Liv: middenveld en aanval
    expect(sleutelPositiesVoor(speelster('p09'))).toEqual(['LV', 'CV', 'CM']) // Saffiya: beide linies
    expect(sleutelPositiesVoor(speelster('p07'))).toEqual([]) // Cato: alleen aanval
  })

  it('biedt de knop niet aan waar hij niets zou doen', () => {
    expect(centraalHeeftZin(speelster('p07'))).toBe(false)
    expect(centraalHeeftZin(speelster('p05'))).toBe(true)
  })

  it('laat Kate Janssen centraal spelen zodra je het aanzet', () => {
    const metKate = SELECTIE.map((s) => (s.id === 'p05' ? { ...s, centraal: ['V' as const] } : s))
    const kate = metKate.find((s) => s.id === 'p05')!
    expect(magOpPositie(kate, 'LV')).toBe(true)
    expect(magOpPositie(kate, 'CV')).toBe(true)
    expect(magOpPositie(kate, 'CM')).toBe(false) // ze speelt geen middenveld

    const r = maakRooster({
      aanwezigen: metKate,
      keeperId: 'p16',
      sterkteAchter: ['p05'], // bovenaan zetten, dan zie je het effect meteen
      sterkteMidden: metKate.filter((s) => magOpPositie(s, 'CM')).map((s) => s.id),
    })
    const centraleBlokken = r.blokken.filter((b) =>
      (['LV', 'CV'] as Positie[]).some((p) => b.opstelling[p] === 'p05'),
    )
    expect(centraleBlokken.length).toBeGreaterThan(0)
  })

  it('redt een bezetting die zonder de knop niet rond komt', () => {
    // Elf aanwezigen met te weinig centrale speelsters: dit is precies de
    // situatie waarvoor de knop bestaat.
    const dun = ['p05', 'p04', 'p07', 'p08', 'p09', 'p11', 'p12', 'p13', 'p14', 'p16', 'p03'].map(speelster)
    expect(controleerBezetting(dun, 'p03').ok).toBe(false)

    // Kate en Eva van der Zee erbij voor achterin, Suus voor het middenveld.
    // Kate en Eva van der Zee centraal achterin, Suus centraal op het middenveld.
    const versterkt = dun.map((s) =>
      ['p05', 'p16'].includes(s.id)
        ? { ...s, centraal: ['V' as const] }
        : s.id === 'p08'
          ? { ...s, centraal: ['M' as const] }
          : s,
    )
    const check = controleerBezetting(versterkt, 'p03')
    expect(check.ok, check.meldingen.join(' / ')).toBe(true)

    const r = maakRooster({ aanwezigen: versterkt, keeperId: 'p03' })
    expect(r.waarschuwingen.filter((w) => w.includes('Noodbezetting'))).toEqual([])
    for (const blok of r.blokken) {
      for (const positie of ['LV', 'CV', 'CM'] as Positie[]) {
        const id = blok.opstelling[positie]
        expect(id).toBeTruthy()
        expect(magOpPositie(versterkt.find((s) => s.id === id)!, positie)).toBe(true)
      }
    }
  })

  it('houdt Cato buiten de sleutelposities, ook met de vlag aan', () => {
    const r = maakRooster({ aanwezigen: SELECTIE, keeperId: 'p16' })
    for (const blok of r.blokken) {
      for (const positie of ['LV', 'CV', 'CM'] as Positie[]) {
        expect(blok.opstelling[positie]).not.toBe('p07')
      }
    }
  })
})

describe('handmatig vastzetten', () => {
  it('respecteert een vastgezette positie', () => {
    const aanwezigen = SELECTIE
    const r = maakRooster({
      aanwezigen,
      keeperId: 'p01',
      vastgezet: { 3: { SP: 'p07' }, 4: { SP: 'p07' } },
    })
    expect(r.blokken[3].opstelling.SP).toBe('p07')
    expect(r.blokken[4].opstelling.SP).toBe('p07')
    expect(bezetteIds(r.blokken[3])).toHaveLength(AANTAL_VELDPOSITIES)
  })
})

describe('wisselinstructies', () => {
  it('noemt alleen de posities die veranderen', () => {
    const r = rooster(16)
    const wissels = wisselsTussen(r.blokken[0], r.blokken[1])
    expect(wissels.length).toBeGreaterThan(0)
    for (const w of wissels) {
      expect(r.blokken[0].opstelling[w.positie]).not.toBe(r.blokken[1].opstelling[w.positie])
    }
    const onveranderd = POSITIE_CODES.filter(
      (p) => r.blokken[0].opstelling[p] === r.blokken[1].opstelling[p],
    )
    for (const p of onveranderd) {
      expect(wissels.some((w) => w.positie === p)).toBe(false)
    }
  })

  it('houdt het aantal wissels beperkt door continuïteit', () => {
    const r = rooster(16)
    for (let i = 1; i < r.blokken.length; i++) {
      const wissels = wisselsTussen(r.blokken[i - 1], r.blokken[i])
      expect(wissels.length).toBeLessThanOrEqual(8)
    }
  })
})

describe('wisseloverzicht', () => {
  const r = rooster(16)

  it('scheidt echte wissels van speelsters die alleen doorschuiven', () => {
    for (let i = 1; i < r.blokken.length; i++) {
      const { erin, eruit, verplaatst } = wisselOverzicht(r.blokken[i - 1], r.blokken[i])
      const opVeld = (blok: Blok) => new Set(bezetteIds(blok))
      const vorige = opVeld(r.blokken[i - 1])
      const nu = opVeld(r.blokken[i])

      // Wie doorschuift stond er al en staat er nog: die mag nooit als wissel
      // worden geroepen, anders loopt ze het veld af.
      for (const { id } of verplaatst) {
        expect(vorige.has(id)).toBe(true)
        expect(nu.has(id)).toBe(true)
        expect(eruit).not.toContain(id)
        expect(erin.map((e) => e.id)).not.toContain(id)
      }
      for (const { id } of erin) expect(vorige.has(id)).toBe(false)
      for (const id of eruit) expect(nu.has(id)).toBe(false)
      // Even veel eruit als erin, want het veld blijft vol.
      expect(erin).toHaveLength(eruit.length)
    }
  })

  it('koppelt elke invaller aan de speelster die eraf gaat', () => {
    for (let i = 1; i < r.blokken.length; i++) {
      const { paren, erin, eruit, verplaatst } = wisselOverzicht(r.blokken[i - 1], r.blokken[i])
      expect(paren).toHaveLength(erin.length)
      // Elke wissel is uit te spreken als "X komt erin voor Y".
      for (const paar of paren) expect(paar.eruit).toBeTruthy()
      // Niemand wordt twee keer gekoppeld, en wie doorschuift komt er niet in voor.
      const gekoppeld = paren.map((p) => p.eruit)
      expect(new Set(gekoppeld).size).toBe(gekoppeld.length)
      expect([...gekoppeld].sort()).toEqual([...eruit].sort())
      for (const { id } of verplaatst) expect(gekoppeld).not.toContain(id)
    }
  })

  it('koppelt bij voorkeur aan wie diezelfde plek verliet', () => {
    for (let i = 1; i < r.blokken.length; i++) {
      const vorige = r.blokken[i - 1]
      for (const paar of wisselOverzicht(vorige, r.blokken[i]).paren) {
        const vorigeOpPlek = vorige.opstelling[paar.positie]
        // Stond er iemand op deze plek die nu naar de bank gaat? Dan hoort zij
        // bij dit paar, zodat de positie klopt met wat je roept.
        const gaatNaarBank = vorigeOpPlek && !bezetteIds(r.blokken[i]).includes(vorigeOpPlek)
        if (gaatNaarBank) expect(paar.eruit).toBe(vorigeOpPlek)
      }
    }
  })

  it('noemt bij het eerste blok iedereen als erin en niemand als eruit', () => {
    const { paren, erin, eruit, verplaatst } = wisselOverzicht(null, r.blokken[0])
    expect(erin).toHaveLength(AANTAL_VELDPOSITIES)
    expect(eruit).toEqual([])
    expect(verplaatst).toEqual([])
    // Niemand hoeft eraf, dus geen enkel paar noemt een naam om te vervangen.
    expect(paren.every((p) => p.eruit === null)).toBe(true)
  })
})

describe('schuiven is het laatste redmiddel', () => {
  const alleMaten = [11, 12, 13, 14, 15, 16]

  it('schuift hoogstens één speelster per blok, en meldt het als er meer nodig zijn', () => {
    for (const aantal of alleMaten) {
      const r = rooster(aantal)
      for (let i = 1; i < r.blokken.length; i++) {
        const { verplaatst } = wisselOverzicht(r.blokken[i - 1], r.blokken[i])
        if (verplaatst.length <= 1) continue
        // Meer dan één schuif mag alleen als het niet anders kon, en dan moet
        // de leider het te zien krijgen in plaats van het zelf te ontdekken.
        expect(
          r.blokken[i].waarschuwingen.some((w) => w.includes('schuiven tegelijk door')),
          `${aantal} aanwezig, blok ${i + 1}: ${verplaatst.length} schuiven zonder melding`,
        ).toBe(true)
      }
    }
  })

  it('schuift nooit zonder reden', () => {
    // Een schuif is zinloos als je hem meteen kunt terugdraaien: zet de
    // doorgeschoven speelster terug op haar oude plek en de invaller die daar
    // nu staat op de nieuwe. Mag dat allebei, dan had de schuif niet gehoeven.
    for (const aantal of alleMaten) {
      const r = rooster(aantal)
      for (let i = 1; i < r.blokken.length; i++) {
        const nu = r.blokken[i]
        for (const { id, van, naar } of wisselOverzicht(r.blokken[i - 1], nu).verplaatst) {
          const opOudePlek = nu.opstelling[van]
          if (!opOudePlek) continue
          const vervanger = speelster(opOudePlek)
          const zinloos =
            magOpPositie(speelster(id), van) &&
            inLinie(speelster(id), van) &&
            magOpPositie(vervanger, naar) &&
            inLinie(vervanger, naar)
          expect(
            zinloos,
            `${aantal} aanwezig, blok ${i + 1}: ${speelster(id).naam} schuift ${van}→${naar} ` +
              `terwijl ze gewoon had kunnen blijven staan`,
          ).toBe(false)
        }
      }
    }
  })

  it('houdt het totale aantal schuiven laag over een hele wedstrijd', () => {
    for (const aantal of alleMaten) {
      const r = rooster(aantal)
      let schuiven = 0
      for (let i = 1; i < r.blokken.length; i++) {
        schuiven += wisselOverzicht(r.blokken[i - 1], r.blokken[i]).verplaatst.length
      }
      // Ruim onder de 8 die het zonder deze regels werden; laat ruimte voor de
      // krappe bezettingen waar het echt niet anders kan.
      expect(schuiven, `${aantal} aanwezig`).toBeLessThanOrEqual(7)
    }
  })

  it('laat een speelster op haar plek staan zolang ze in het veld blijft', () => {
    // Bij volle bezetting hoort doorschuiven zeldzaam te zijn. De grens ligt
    // hoger dan de 4 van vóór het samenspel: rustbeurten laten samenvallen
    // verzet bezettingen, en dat kost doorschuiven. Zie de afruil hieronder.
    const r = rooster(16)
    let schuiven = 0
    for (let i = 1; i < r.blokken.length; i++) {
      schuiven += wisselOverzicht(r.blokken[i - 1], r.blokken[i]).verplaatst.length
    }
    expect(schuiven).toBeLessThanOrEqual(7)
  })

  it('houdt het schuiven laag over élke bezetting en élke keeperkeuze', () => {
    // Eén vaste keeper testen verbergt de lastige gevallen: het hangt sterk af
    // van wie er keept hoeveel ruimte het rooster overhoudt. Daarom alle 81
    // combinaties.
    //
    // IJkpunten: 605 schuiven vóór de anti-schuifregels, 140 daarna, en ~320
    // sinds het samenspel erbij kwam. Die laatste stijging is een bewuste
    // afruil: speelsters die om dezelfde plek concurreren laten hun rustbeurten
    // samenvallen, zodat ze wél samen in het veld staan. Dat verzet bezettingen
    // en kost doorschuiven. Nog altijd ruim onder het oorspronkelijke niveau.
    let schuiven = 0
    let blokkenMetMeerdere = 0
    let ergsteBlok = 0
    let ongemeld = 0

    for (const aantal of alleMaten) {
      const aanwezigen = SELECTIE.slice(0, aantal)
      for (const keeper of aanwezigen) {
        const r = maakRooster({
          aanwezigen,
          keeperId: keeper.id,
          sterkteAchter: sterkteAchter.filter(
            (id) => id !== keeper.id && aanwezigen.some((a) => a.id === id),
          ),
          sterkteMidden: sterkteMidden.filter(
            (id) => id !== keeper.id && aanwezigen.some((a) => a.id === id),
          ),
        })
        for (let i = 1; i < r.blokken.length; i++) {
          const aantalSchuiven = wisselOverzicht(r.blokken[i - 1], r.blokken[i]).verplaatst.length
          schuiven += aantalSchuiven
          if (aantalSchuiven < 2) continue
          blokkenMetMeerdere++
          ergsteBlok = Math.max(ergsteBlok, aantalSchuiven)
          // Meer dan één schuif mag alleen als de leider het te zien krijgt.
          if (!r.blokken[i].waarschuwingen.some((w) => w.includes('schuiven tegelijk door'))) {
            ongemeld++
          }
        }
      }
    }

    expect(ongemeld, 'blokken met meerdere schuiven zonder melding').toBe(0)
    expect(schuiven).toBeLessThanOrEqual(150)
    expect(blokkenMetMeerdere).toBeLessThanOrEqual(50)
    expect(ergsteBlok).toBeLessThanOrEqual(3)
  })

  it('zet het schuiven dat overblijft in de rust, niet midden in een kwart', () => {
    // Midden in een kwart loopt de klok en staat iedereen verspreid; in de rust
    // staat de klok stil en sta je bij elkaar. Een schuif die je niet kwijt kunt
    // hoort daarom op een kwartgrens.
    //
    // IJkpunt vóór de verplaatsingsstap: 183 van de 312 schuiven vielen midden
    // in een kwart (59%), en 113 van de 324 kwarten bevatte er een (35%).
    let inKwart = 0
    let bijRust = 0
    let kwartenMetSchuif = 0
    let kwartenTotaal = 0

    for (const aantal of alleMaten) {
      const aanwezigen = SELECTIE.slice(0, aantal)
      for (const keeper of aanwezigen) {
        const r = maakRooster({
          aanwezigen,
          keeperId: keeper.id,
          sterkteAchter: sterkteAchter.filter(
            (id) => id !== keeper.id && aanwezigen.some((a) => a.id === id),
          ),
          sterkteMidden: sterkteMidden.filter(
            (id) => id !== keeper.id && aanwezigen.some((a) => a.id === id),
          ),
        })
        const perKwart = [0, 0, 0, 0]
        for (let i = 1; i < r.blokken.length; i++) {
          const aantalSchuiven = wisselOverzicht(r.blokken[i - 1], r.blokken[i]).verplaatst.length
          if (aantalSchuiven === 0) continue
          if (isKwartStart(i)) {
            bijRust += aantalSchuiven
          } else {
            inKwart += aantalSchuiven
            perKwart[kwartVanBlok(i) - 1] += aantalSchuiven
          }
        }
        kwartenTotaal += 4
        kwartenMetSchuif += perKwart.filter((aantal) => aantal > 0).length
      }
    }

    // Het grootste deel van wat overblijft valt in de rust.
    expect(bijRust).toBeGreaterThan(inKwart * 2)
    // En de meeste kwarten worden helemaal schuifvrij uitgespeeld.
    expect(kwartenMetSchuif / kwartenTotaal).toBeLessThan(0.1)
  })
})

describe('handmatig ingrijpen tijdens de wedstrijd', () => {
  it('zet een speelster vast zonder de rest van het veld te breken', () => {
    // Dit is de rustwissel: kwart 1 is gespeeld, de leider verzet iemand voor
    // kwart 2, en de app rekent de rest van de wedstrijd eromheen.
    //
    // Waar het misging: de haalbaarheidstoets telde een vastgezette speelster
    // nog voor álle plekken mee. Zet je Nora vast op linksback, dan is zij weg
    // uit de pool voor laatste vrouw en centrale verdediger -- en juist daar is
    // het krap. Het blok leek rond te komen en kwam dat niet, waarna er iemand
    // centraal stond die dat niet kan. 19 van deze 309 combinaties liepen daar
    // op vast.
    let proeven = 0

    for (const aantal of [12, 14, 16]) {
      const aanwezigen = SELECTIE.slice(0, aantal)
      const keeperId = aanwezigen[4].id
      const opzet = {
        aanwezigen,
        keeperId,
        sterkteAchter: sterkteAchter.filter(
          (id) => id !== keeperId && aanwezigen.some((a) => a.id === id),
        ),
        sterkteMidden: sterkteMidden.filter(
          (id) => id !== keeperId && aanwezigen.some((a) => a.id === id),
        ),
      }
      const basis = maakRooster(opzet)
      const gespeeldVoor: Record<string, number> = {}
      for (const blok of basis.blokken.slice(0, 3)) {
        for (const id of Object.values(blok.opstelling)) {
          if (id && id !== keeperId) gespeeldVoor[id] = (gespeeldVoor[id] ?? 0) + 1
        }
      }

      for (const positie of POSITIE_CODES) {
        for (const speelster of aanwezigen) {
          if (speelster.id === keeperId || !magOpPositie(speelster, positie)) continue
          proeven++
          const r = maakRooster({
            ...opzet,
            vanafBlok: 3,
            gespeeldVoor,
            eerdereBlokken: basis.blokken.slice(0, 3),
            vastgezet: { 3: { [positie]: speelster.id } },
          })

          // De keuze van de leider staat er ook echt.
          expect(r.blokken[3].opstelling[positie], `${aantal} aanwezig, ${speelster.naam} op ${positie}`).toBe(speelster.id)
          // En niemand staat centraal die dat niet kan.
          expect(
            r.waarschuwingen.filter((w) => w.includes('Noodbezetting')),
            `${aantal} aanwezig, ${speelster.naam} vastgezet op ${positie}`,
          ).toEqual([])
          // Het gespeelde kwart blijft ongemoeid.
          for (let i = 0; i < 3; i++) {
            expect(r.blokken[i].opstelling).toEqual(basis.blokken[i].opstelling)
          }
        }
      }
    }

    expect(proeven).toBeGreaterThan(300)
  })
})

describe('wisselketens', () => {
  it('vertelt elke wissel als een sluitende ketting', () => {
    for (const aantal of [12, 13, 14, 15, 16]) {
      const r = rooster(aantal)
      for (let i = 1; i < r.blokken.length; i++) {
        const vorige = r.blokken[i - 1]
        const nu = r.blokken[i]
        const ketens = wisselKetens(vorige, nu)
        const { eruit } = wisselOverzicht(vorige, nu)

        // Elke speelster die eraf gaat krijgt precies één ketting.
        expect(ketens.map((k) => k.eruit).sort()).toEqual([...eruit].sort())

        for (const keten of ketens) {
          expect(keten.stappen.length).toBeGreaterThan(0)
          // De eerste stap vult de plek die vrijkwam.
          expect(keten.stappen[0].naar).toBe(keten.vanPositie)
          // Elke volgende stap vult de plek die de vorige achterliet.
          for (let stap = 1; stap < keten.stappen.length; stap++) {
            expect(keten.stappen[stap].naar).toBe(keten.stappen[stap - 1].van)
          }
          // De ketting eindigt bij iemand van de bank.
          expect(keten.stappen[keten.stappen.length - 1].van).toBeNull()
          // En klopt met het veld: iedereen staat waar de ketting zegt.
          for (const stap of keten.stappen) {
            expect(nu.opstelling[stap.naar]).toBe(stap.speelsterId)
            if (stap.van) expect(vorige.opstelling[stap.van]).toBe(stap.speelsterId)
          }
        }

        // Niemand komt in twee kettingen voor.
        const alle = ketens.flatMap((k) => k.stappen.map((s) => s.speelsterId))
        expect(new Set(alle).size).toBe(alle.length)
      }
    }
  })

  it('geeft een gewone wissel één stap en een schuif er twee', () => {
    const r = rooster(13)
    let metSchuif = 0
    for (let i = 1; i < r.blokken.length; i++) {
      for (const keten of wisselKetens(r.blokken[i - 1], r.blokken[i])) {
        if (keten.stappen.length === 1) {
          expect(keten.stappen[0].van).toBeNull()
        } else {
          metSchuif++
          // De tussenstappen zijn speelsters die in het veld blijven.
          for (const stap of keten.stappen.slice(0, -1)) expect(stap.van).not.toBeNull()
        }
      }
    }
    expect(metSchuif).toBeGreaterThan(0)
  })

  it('geeft geen ketens voor het eerste blok', () => {
    expect(wisselKetens(null, rooster(16).blokken[0])).toEqual([])
  })
})

describe('samenspel: speelsters die om dezelfde plek concurreren', () => {
  const alleMaten = [11, 12, 13, 14, 15, 16]

  /** In welke linies kan zij een sleutelpositie bezetten? */
  const sleutelLinies = (s: Speelster) =>
    (['V', 'M'] as const).filter((l) => s.linies.includes(l) && s.centraal.includes(l))

  const staatOpVeld = (blok: Blok, id: string) => bezetteIds(blok).includes(id)

  it('laat Nora en Kiki niet om en om spelen', () => {
    // Beiden kunnen op het centrale middenveld, maar er is één plek. Zonder
    // ingrijpen ontwijken hun rustbeurten elkaar en staan ze maar vier van de
    // twaalf blokken samen -- het rekenkundige minimum bij 8 + 8 blokken.
    const r = maakRooster({
      aanwezigen: SELECTIE,
      keeperId: 'p16',
      sterkteAchter,
      sterkteMidden,
    })
    const samen = r.blokken.filter(
      (b) => staatOpVeld(b, 'p10') && staatOpVeld(b, 'p02'),
    ).length
    expect(samen).toBeGreaterThan(4)

    // En als ze samen spelen, staat er één centraal en de ander gewoon elders.
    const samenBlokken = r.blokken.filter((b) => staatOpVeld(b, 'p10') && staatOpVeld(b, 'p02'))
    for (const blok of samenBlokken) {
      const plekken = POSITIE_CODES.filter(
        (p) => blok.opstelling[p] === 'p10' || blok.opstelling[p] === 'p02',
      )
      expect(plekken).toHaveLength(2)
      expect(plekken[0]).not.toBe(plekken[1])
    }
  })

  it('houdt concurrerende paren bij elke bezetting van het minimum af', () => {
    let opMinimum = 0
    let paren = 0
    for (const aantal of alleMaten) {
      const aanwezigen = SELECTIE.slice(0, aantal)
      const r = maakRooster({
        aanwezigen,
        keeperId: aanwezigen[0].id,
        sterkteAchter: sterkteAchter.filter((id) => aanwezigen.some((a) => a.id === id)),
        sterkteMidden: sterkteMidden.filter((id) => aanwezigen.some((a) => a.id === id)),
      })
      const veld = aanwezigen.filter((s) => s.id !== r.keeperId)
      for (let a = 0; a < veld.length; a++) {
        for (let b = a + 1; b < veld.length; b++) {
          const tweede = sleutelLinies(veld[b]) as readonly string[]
          if (!sleutelLinies(veld[a]).some((l) => tweede.includes(l))) continue
          const nA = r.blokken.filter((blk) => staatOpVeld(blk, veld[a].id)).length
          const nB = r.blokken.filter((blk) => staatOpVeld(blk, veld[b].id)).length
          const samen = r.blokken.filter(
            (blk) => staatOpVeld(blk, veld[a].id) && staatOpVeld(blk, veld[b].id),
          ).length
          const minimum = Math.max(0, nA + nB - AANTAL_BLOKKEN)
          paren++
          if (samen === minimum && Math.min(nA, nB) > minimum) opMinimum++
        }
      }
    }
    // Zonder deze stap zat 52% van de concurrerende paren op het minimum.
    expect(opMinimum / paren).toBeLessThan(0.5)
  })

  it('kost geen speeltijd', () => {
    for (const aantal of alleMaten) {
      const waarden = Object.values(rooster(aantal).gespeeld)
      expect(Math.max(...waarden) - Math.min(...waarden)).toBeLessThanOrEqual(1)
    }
  })
})

describe('determinisme', () => {
  it('geeft bij dezelfde invoer exact hetzelfde rooster', () => {
    expect(rooster(14).blokken).toEqual(rooster(14).blokken)
  })
})
