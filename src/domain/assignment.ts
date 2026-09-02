/**
 * Toewijzing van speelsters aan posities. Greedy per positie werkt hier niet:
 * de laatste vrije verdediger kan op linksback belanden terwijl ze de enige
 * was die centraal kon. Daarom lossen we elk blok op als een compleet
 * koppelingsprobleem over alle tien de posities tegelijk.
 */

/** Kuhn's algoritme: koppelt zoveel mogelijk posities aan een speelster. */
export function maximaleKoppeling(
  aantalPosities: number,
  kandidaten: number[][],
  aantalSpeelsters: number,
): number[] {
  const speelsterVanPositie = new Array<number>(aantalPosities).fill(-1)
  const positieVanSpeelster = new Array<number>(aantalSpeelsters).fill(-1)

  const zoek = (positie: number, gezien: boolean[]): boolean => {
    for (const speelster of kandidaten[positie]) {
      if (gezien[speelster]) continue
      gezien[speelster] = true
      if (positieVanSpeelster[speelster] === -1 || zoek(positieVanSpeelster[speelster], gezien)) {
        positieVanSpeelster[speelster] = positie
        speelsterVanPositie[positie] = speelster
        return true
      }
    }
    return false
  }

  for (let positie = 0; positie < aantalPosities; positie++) {
    zoek(positie, new Array<boolean>(aantalSpeelsters).fill(false))
  }
  return speelsterVanPositie
}

/** Kunnen alle posities tegelijk bezet worden met deze kandidatenlijsten? */
export function isVolledigTeBezetten(
  aantalPosities: number,
  kandidaten: number[][],
  aantalSpeelsters: number,
): boolean {
  return maximaleKoppeling(aantalPosities, kandidaten, aantalSpeelsters).every((s) => s !== -1)
}

/** Kosten voor een koppeling die verboden is; hoog genoeg om altijd te verliezen. */
export const VERBODEN = 1e6

/**
 * Hongaars algoritme (O(n³)) op een vierkante kostenmatrix. Geeft per rij de
 * gekozen kolom. Met tien posities is dit ruim snel genoeg om bij elke
 * herberekening opnieuw te draaien.
 */
export function hongaars(kosten: number[][]): number[] {
  const n = kosten.length
  if (n === 0) return []
  const u = new Array<number>(n + 1).fill(0)
  const v = new Array<number>(n + 1).fill(0)
  const p = new Array<number>(n + 1).fill(0)
  const way = new Array<number>(n + 1).fill(0)

  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array<number>(n + 1).fill(Infinity)
    const gebruikt = new Array<boolean>(n + 1).fill(false)
    do {
      gebruikt[j0] = true
      const i0 = p[j0]
      let delta = Infinity
      let j1 = 0
      for (let j = 1; j <= n; j++) {
        if (gebruikt[j]) continue
        const cur = kosten[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) {
          minv[j] = cur
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= n; j++) {
        if (gebruikt[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0)
  }

  const resultaat = new Array<number>(n).fill(-1)
  for (let j = 1; j <= n; j++) if (p[j] > 0) resultaat[p[j] - 1] = j - 1
  return resultaat
}
