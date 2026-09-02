import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

// Single registration point: every section imports gsap from here
// so plugins are guaranteed to be registered exactly once.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, MotionPathPlugin)

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
