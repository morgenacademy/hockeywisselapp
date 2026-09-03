import { useEffect, useState } from 'react'
import { Aanwezigheid } from './screens/Aanwezigheid'
import { KeeperKiezen } from './screens/KeeperKiezen'
import { Opstelling } from './screens/Opstelling'
import { Overzicht } from './screens/Overzicht'
import { Sterkte } from './screens/Sterkte'
import { Wedstrijd } from './screens/Wedstrijd'
import { standaardSterkte, useWedstrijd } from './state/matchStore'

export default function App() {
  const w = useWedstrijd()
  const { stand, wijzig, aanwezigen } = w
  const [toonOverzicht, zetToonOverzicht] = useState(false)

  // Vult de sterkte-volgordes zodra de keeper bekend is, en houdt ze schoon als
  // de aanwezigheid verandert.
  useEffect(() => {
    if (!stand.keeperId) return
    const veld = aanwezigen.filter((s) => s.id !== stand.keeperId)
    const vul = (huidig: string[], plek: 'LV' | 'CM') => {
      const standaard = standaardSterkte(veld, plek)
      const behouden = huidig.filter((id) => standaard.includes(id))
      const nieuw = standaard.filter((id) => !behouden.includes(id))
      return [...behouden, ...nieuw]
    }
    const achter = vul(stand.sterkteAchter, 'LV')
    const midden = vul(stand.sterkteMidden, 'CM')
    const zelfde = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])
    if (!zelfde(achter, stand.sterkteAchter) || !zelfde(midden, stand.sterkteMidden)) {
      wijzig({ sterkteAchter: achter, sterkteMidden: midden })
    }
  }, [aanwezigen, stand.keeperId, stand.sterkteAchter, stand.sterkteMidden, wijzig])

  if (stand.fase === 'aanwezigheid') {
    return (
      <Aanwezigheid
        selectie={stand.selectie}
        aanwezig={stand.aanwezig}
        onWissel={(id) =>
          wijzig({
            aanwezig: stand.aanwezig.includes(id)
              ? stand.aanwezig.filter((a) => a !== id)
              : [...stand.aanwezig, id],
            keeperId: stand.keeperId === id ? null : stand.keeperId,
          })
        }
        onAlle={(aan) => wijzig({ aanwezig: aan ? stand.selectie.map((s) => s.id) : [], keeperId: null })}
        onCentraal={w.zetCentraal}
        onHerstelSelectie={w.herstelSelectie}
        onVerder={() => wijzig({ fase: 'keeper' })}
      />
    )
  }

  if (stand.fase === 'keeper') {
    return (
      <KeeperKiezen
        aanwezigen={aanwezigen}
        keeperId={stand.keeperId}
        onKies={(id) => wijzig({ keeperId: id })}
        onTerug={() => wijzig({ fase: 'aanwezigheid' })}
        onVerder={() => wijzig({ fase: 'sterkte' })}
      />
    )
  }

  if (stand.fase === 'sterkte') {
    return (
      <Sterkte
        aanwezigen={aanwezigen}
        keeperId={stand.keeperId}
        achter={stand.sterkteAchter}
        midden={stand.sterkteMidden}
        onZet={(achter, midden) => wijzig({ sterkteAchter: achter, sterkteMidden: midden })}
        onTerug={() => wijzig({ fase: 'keeper' })}
        onVerder={() => wijzig({ fase: 'opstelling' })}
      />
    )
  }

  if (stand.fase === 'opstelling') {
    return (
      <Opstelling
        aanwezigen={aanwezigen}
        keeperId={stand.keeperId}
        voorstel={w.rooster.blokken[0]?.opstelling ?? {}}
        vastgezet={stand.vastgezet[0] ?? {}}
        onZet={(positie, id) => w.zetOpPositie(0, positie, id)}
        onWis={() => wijzig({ vastgezet: { ...stand.vastgezet, 0: {} } })}
        onTerug={() => wijzig({ fase: 'sterkte' })}
        onVerder={() => wijzig({ fase: 'wedstrijd' })}
      />
    )
  }

  if (toonOverzicht) {
    return (
      <Overzicht
        aanwezigen={aanwezigen}
        rooster={w.rooster}
        keeperId={stand.keeperId}
        huidigBlok={w.huidigBlok}
        onTerug={() => zetToonOverzicht(false)}
      />
    )
  }

  return (
    <Wedstrijd
      aanwezigen={aanwezigen}
      rooster={w.rooster}
      keeperId={stand.keeperId}
      uitgevallen={stand.uitgevallen}
      kwart={stand.kwart}
      secondenInKwart={w.secondenInKwart}
      loopt={stand.loopt}
      kwartVoorbij={w.kwartVoorbij}
      huidigBlok={w.huidigBlok}
      alarmTot={stand.alarmTot}
      onStart={w.start}
      onPauze={w.pauzeer}
      onVolgendKwart={w.volgendKwart}
      onVolgendBlok={w.volgendBlok}
      onUitgevallen={w.zetUitgevallen}
      onZetOpPositie={w.zetOpPositie}
      onAlarmGezien={w.markeerAlarm}
      snelheid={stand.snelheid ?? 1}
      onSnelheid={w.zetSnelheid}
      onOverzicht={() => zetToonOverzicht(true)}
      onOpnieuw={() => {
        if (confirm('Wedstrijd opnieuw beginnen? De huidige stand gaat verloren.')) w.herstart()
      }}
    />
  )
}
