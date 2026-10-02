import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { retainTouchScroll } from '../lib/touchScroll'
import { prefersReducedMotion } from '../lib/motion'

let instance = null

/**
 * The running Lenis instance, or null when smooth scroll is off
 * (calm version). Overlays use it to freeze the page behind them.
 */
export function getLenis() {
  return instance
}

/**
 * Boots Lenis smooth scrolling and keeps it in sync with GSAP:
 * Lenis drives the scroll, ScrollTrigger listens to it, and both
 * share the GSAP ticker so scroll and animation share one rhythm.
 *
 * Lenis only smooths the wheel; on phones and tablets the touch scroll is
 * normalized instead (src/lib/touchScroll.js), also in the calm version.
 * Pass `normalizeTouch: false` where the page is an app with its own panels.
 *
 * Lenis is skipped entirely in the calm version (src/lib/motion.js).
 */
export function useLenis({ normalizeTouch = true } = {}) {
  useEffect(() => (normalizeTouch ? retainTouchScroll() : undefined), [normalizeTouch])

  useEffect(() => {
    if (prefersReducedMotion()) return undefined

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
