import { useEffect } from 'react'

type WakeLockSentinel = { release: () => Promise<void>; released: boolean }
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> }
}

/**
 * Houdt het scherm aan zolang de wedstrijd loopt. Niet elke browser kent dit;
 * waar het ontbreekt gebeurt er simpelweg niets.
 */
export function useWakeLock(actief: boolean) {
  useEffect(() => {
    if (!actief) return
    const nav = navigator as WakeLockNavigator
    if (!nav.wakeLock) return

    let sentinel: WakeLockSentinel | null = null
    let afgebroken = false

    const vraagAan = async () => {
      try {
        const nieuw = await nav.wakeLock!.request('screen')
        if (afgebroken) {
          void nieuw.release()
          return
        }
        sentinel = nieuw
      } catch {
        // Geweigerd (bijvoorbeeld bij weinig accu); dan blijft het scherm gewoon uitgaan.
      }
    }

    // Na terugkeren uit de achtergrond is de lock vervallen en moet hij opnieuw.
    const bijZichtbaar = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void vraagAan()
    }

    void vraagAan()
    document.addEventListener('visibilitychange', bijZichtbaar)
    return () => {
      afgebroken = true
      document.removeEventListener('visibilitychange', bijZichtbaar)
      void sentinel?.release()
    }
  }, [actief])
}
