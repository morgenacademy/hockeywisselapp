import { describe, expect, it } from 'vitest'
import { AANTAL_BLOKKEN, BLOK_SECONDEN, WEDSTRIJD_SECONDEN } from '../clock'
import { AANTAL_VELDPOSITIES, POSITIE_CODES, positieInfo, type Positie } from '../formation'
import { SELECTIE, magOpPositie, type Speelster } from '../players'
import {
  controleerBezetting,
  heeftGeldigeSleutelbezetting,
  maakRooster,
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

    // Lynn staat normaal onderaan de verdedigingslijst en bovenaan als je hem
    // omdraait; bij Eva Hoevers is het precies andersom.
    const lynn = 'p15'
    const eva = 'p03'
    expect(centraalBlokken(omgekeerd, lynn)).toBeGreaterThan(centraalBlokken(normaal, lynn))
    expect(centraalBlokken(normaal, eva)).toBeGreaterThan(centraalBlokken(omgekeerd, eva))
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

describe('determinisme', () => {
  it('geeft bij dezelfde invoer exact hetzelfde rooster', () => {
    expect(rooster(14).blokken).toEqual(rooster(14).blokken)
  })
})
