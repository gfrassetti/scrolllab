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
 * Goes to a section of the page by its id: with Lenis it glides there, in the
 * calm version it jumps. The hash follows, as with a plain link.
 */
export function scrollToSection(id) {
  const target = document.getElementById(id)
  if (!target) return
  if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`)
  if (instance) instance.scrollTo(target, { duration: 1.4 })
  else target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/**
 * Links to a section of the page (`#models`) glide there instead of jumping.
 * A hash with no element behind it (`#privacy` opens a panel) is left to the
 * browser, and so is anything another handler already took care of.
 */
function onAnchorClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.target.closest?.('a[href^="#"]')
  if (!link || link.target) return
  const id = decodeURIComponent(link.getAttribute('href').slice(1))
  if (!id || !document.getElementById(id) || !instance || instance.isStopped) return
  event.preventDefault()
  scrollToSection(id)
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
    window.addEventListener('click', onAnchorClick)

    return () => {
      window.removeEventListener('click', onAnchorClick)
      gsap.ticker.remove(onTick)
      lenis.destroy()
      if (instance === lenis) instance = null
    }
  }, [])
}
