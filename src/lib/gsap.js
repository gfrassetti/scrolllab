import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

// Single registration point: every section imports gsap from here
// so plugins are guaranteed to be registered exactly once.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, MotionPathPlugin)

// Mobile: el address bar del navegador se esconde/aparece al scrollear y
// dispara un resize — sin esto ScrollTrigger lo toma como "cambió el layout"
// y se re-mide a mitad de scroll, dejando pines/scrubs desalineados o
// directamente sin disparar. Config global, no toca el scroll en sí
// (a diferencia de normalizeScroll, que si lo usás junto a Lenis en los
// demos de templates pelean por el control del scroll — ver useLenis.js).
ScrollTrigger.config({ ignoreMobileResize: true })

// TEMP DEBUG — tracing a "GSAP target null not found" warning to its call
// site. Remove once found.
const isBad = (t) => t == null || (Array.isArray(t) && t.some((x) => x == null))
for (const m of ['to', 'set', 'from', 'fromTo']) {
  const orig = gsap[m].bind(gsap)
  gsap[m] = (target, ...rest) => {
    if (isBad(target)) console.error(`[TEMP DEBUG] gsap.${m} called with null target`, target, new Error().stack)
    return orig(target, ...rest)
  }
}
const origTimeline = gsap.timeline.bind(gsap)
gsap.timeline = (...args) => {
  const tl = origTimeline(...args)
  for (const m of ['to', 'set', 'from', 'fromTo']) {
    const orig = tl[m].bind(tl)
    tl[m] = (target, ...rest) => {
      if (isBad(target)) console.error(`[TEMP DEBUG] timeline.${m} called with null target`, target, new Error().stack)
      return orig(target, ...rest)
    }
  }
  return tl
}

export { gsap, useGSAP, ScrollTrigger, SplitText, MotionPathPlugin }
