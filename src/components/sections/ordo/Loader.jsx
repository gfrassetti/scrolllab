import { useLayoutEffect, useEffect, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { C, DISPLAY, SITE } from './brand'
import Logo from './Logo'

/**
 * ORDO — the loader.
 *
 * A light sheet where the first O of ORDO draws itself: a fine stroke runs along its outline,
 * slowly, and the letter fills in as it passes. Then the rest of the logo comes in: R D O rise from a line
 * and the rust slab drops onto the R and the D. Lastly "Architecture & Interiors" is written, the sheet
 * lifts like a curtain and the logo travels to its place in the header (`bridge.current.target()`).
 * Below, an ink line that follows the drawing. With "reduce motion": a short fade.
 * No sound.
 */

// Only the first O is drawn, slowly (the signature). The rest of the logo comes in afterwards: letters that rise
// from a line and the slab that drops.
const S_SECONDS = 1.5 // how long the O takes to be traced
const RISE = ['R', 'D', 'O2']

export default function Loader({ ready, calm, bridge, onDone }) {
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const logoRef = useRef(null)
  const footRef = useRef(null)
  const lineRef = useRef(null)
  const doneRef = useRef(false)
  const [drawn, setDrawn] = useState(calm)

  // The drawing (once, on mount).
  useLayoutEffect(() => {
    const logo = logoRef.current
    const q = gsap.utils.selector(logo)
    if (calm) {
      gsap.set(logo, { autoAlpha: 0 })
      gsap.to(logo, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' })
      return undefined
    }
    const ctx = gsap.context(() => {
      const strokes = q('[data-part=O1] [data-stroke]')
      const fill = q('[data-part=O1] [data-fill]')
      // The stroke offset is written as an attribute (GSAP would add "px" and it does not work the same with pathLength).
      const setTrail = (amount) => strokes.forEach((el) => el.setAttribute('stroke-dashoffset', String(1 - amount)))
      setTrail(0)
      gsap.set(fill, { opacity: 0 })
      gsap.set(strokes, { opacity: 1 })
      // The rest of the logo, hidden until the O ends (units are those of the drawing: 1000 = 1 em).
      gsap.set(RISE.map((id) => q(`[data-part=${id}]`)[0]), { y: 820 })
      gsap.set(q('[data-part=slab]'), { autoAlpha: 0, y: -520, rotation: -6, transformOrigin: '20% 100%' })
      gsap.set(q('[data-part=sub]'), { autoAlpha: 0, letterSpacing: '0.7em' })
      gsap.set(footRef.current, { autoAlpha: 0, y: 10 })

      const start = 0.15
      const end = start + S_SECONDS // the O ends and the rest comes in
      const trail = { p: 0 }
      const tl = gsap.timeline({
        onUpdate: () => gsap.set(lineRef.current, { scaleX: tl.progress() }),
        onComplete: () => setDrawn(true),
      })
      tl.to(footRef.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.1)
        // The stroke runs along the outline of the O…
        .fromTo(
          trail,
          { p: 0 },
          {
            p: 1,
            duration: S_SECONDS,
            ease: 'power1.inOut',
            onUpdate: () => setTrail(trail.p),
          },
          start,
        )
        // …the letter fills in as it passes and the stroke fades out.
        .to(fill, { opacity: 1, duration: 0.7, ease: 'power1.out' }, start + S_SECONDS * 0.7)
        .to(strokes, { opacity: 0, duration: 0.5, ease: 'power1.out' }, start + S_SECONDS * 0.88)
        // The rest, as usual.
        .to(RISE.map((id) => q(`[data-part=${id}]`)[0]), { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, end)
        .to(q('[data-part=slab]'), { autoAlpha: 1, y: 0, rotation: 0, duration: 0.7, ease: 'power4.out' }, end + 0.6)
        .to(q('[data-part=sub]'), { autoAlpha: 1, letterSpacing: '0.34em', duration: 1, ease: 'expo.out' }, end + 0.8)
        .to({}, { duration: 0.1 }) // a breather before leaving
    }, logo)
    return () => ctx.revert()
  }, [calm])

  // The exit: when the drawing has finished and the fonts are there, the sheet rises and the logo travels to the header.
  useEffect(() => {
    if (!ready || !drawn || doneRef.current) return undefined
    doneRef.current = true
    const root = rootRef.current
    const sheet = sheetRef.current
    const logo = logoRef.current
    const finish = () => {
      bridge?.current.show?.()
      gsap.set(root, { display: 'none' })
      onDone()
    }
    if (calm) {
      bridge?.current.show?.()
      const tween = gsap.to(root, { autoAlpha: 0, duration: 0.45, ease: 'power2.out', onComplete: finish })
      return () => tween.kill()
    }
    const ctx = gsap.context(() => {
      const row = logo.querySelector('svg[data-part=row]')
      const target = bridge?.current.target?.()
      const tl = gsap.timeline({ onComplete: finish })
      tl.to(footRef.current, { autoAlpha: 0, y: -8, duration: 0.35, ease: 'power2.out' }, 0)
        .to(logo.querySelector('[data-part=sub]'), { autoAlpha: 0, duration: 0.3, ease: 'power2.out' }, 0)
        .to(sheet, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.85, ease: 'expo.inOut' }, 0.15)
      if (target && row) {
        // The logo scales from the corner of its container, and the mark is not flush with that corner
        // (the line leaves it air above): the offset subtracts that margin already scaled.
        const a = row.getBoundingClientRect()
        const b = target.getBoundingClientRect()
        const h = logo.getBoundingClientRect()
        const k = b.width / a.width
        tl.to(
          logo,
          {
            x: b.left - h.left - (a.left - h.left) * k,
            y: b.top - h.top - (a.top - h.top) * k,
            scale: k,
            transformOrigin: '0 0',
            duration: 0.85,
            ease: 'expo.inOut',
          },
          0.15,
        )
      } else {
        tl.to(logo, { autoAlpha: 0, duration: 0.5 }, 0.4)
      }
    }, root)
    return () => ctx.revert()
  }, [ready, drawn, calm, bridge, onDone])

  return (
    <div ref={rootRef} className="fixed inset-0 z-50" role="status" aria-live="polite" aria-label="Loading ORDO">
      <div ref={sheetRef} className="od-sheet absolute inset-0" style={{ clipPath: 'inset(0% 0% 0% 0%)' }}>
        <div
          ref={footRef}
          className="absolute inset-x-0 bottom-0 px-5 pb-6 text-[11px] font-medium tracking-[0.16em] uppercase sm:px-9 sm:pb-8"
          style={{ ...DISPLAY, color: C.mute }}
        >
          <span className="block max-w-[70%] leading-relaxed">{SITE.places.join(' · ')}</span>
        </div>
        <div className="absolute inset-x-5 bottom-0 h-px sm:inset-x-9" style={{ background: C.hair }}>
          <div ref={lineRef} className="h-full origin-left" style={{ background: C.ink, transform: 'scaleX(0)' }} />
        </div>
      </div>
      {/* The logo is separate from the sheet: when the sheet rises, it stays in view and travels. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div ref={logoRef} style={{ fontSize: 'clamp(64px, 12.5vw, 168px)', willChange: 'transform' }}>
          <Logo />
        </div>
      </div>
    </div>
  )
}
