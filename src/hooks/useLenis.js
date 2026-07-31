import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '../lib/gsap'

let instance = null

/**
 * The running Lenis instance, or null when smooth scroll is off
 * (reduced motion). Overlays use it to freeze the page behind them.
 */
export function getLenis() {
  return instance
}

/**
 * Boots Lenis smooth scrolling and keeps it in sync with GSAP:
 * Lenis drives the scroll, ScrollTrigger listens to it, and both
 * share the GSAP ticker so scroll and animation share one rhythm.
 *
 * Skipped entirely when the user prefers reduced motion.
 */
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    })
    instance = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const onTick = (time) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(onTick)
      lenis.destroy()
      if (instance === lenis) instance = null
    }
  }, [])
}
