import { useCallback, useRef } from 'react'

/**
 * Wisselsignaal zonder geluidsbestand: een paar tonen via de Web Audio API, plus
 * trillen waar dat kan. Werkt daardoor ook offline.
 *
 * iOS laat geluid alleen toe na een echte tik van de gebruiker, dus de
 * audiocontext wordt bij de eerste tik op Start ontgrendeld.
 */
export function useAlarm() {
  const contextRef = useRef<AudioContext | null>(null)

  const context = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    if (!contextRef.current) contextRef.current = new Ctor()
    return contextRef.current
  }, [])

  /** Aanroepen vanuit een tik van de gebruiker, anders blijft het stil. */
  const ontgrendel = useCallback(() => {
    const ctx = context()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }, [context])

  const speel = useCallback(() => {
    const ctx = context()
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume()
      const nu = ctx.currentTime
      // Drie korte tonen: hoorbaar boven een hockeyveld, niet schrikachtig.
      ;[0, 0.28, 0.56].forEach((offset, index) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = index === 2 ? 1320 : 880
        gain.gain.setValueAtTime(0.0001, nu + offset)
        gain.gain.exponentialRampToValueAtTime(0.5, nu + offset + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, nu + offset + 0.22)
        osc.connect(gain).connect(ctx.destination)
        osc.start(nu + offset)
        osc.stop(nu + offset + 0.24)
      })
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([200, 100, 200, 100, 300])
    }
  }, [context])

  return { speel, ontgrendel }
}
