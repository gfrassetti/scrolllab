import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { HERO_VH } from './brand'

/**
 * The hero exit: when its four stages end, everything (except the nav) becomes a sketched sheet again. The
 * hero stays fixed for 100vh more of scroll and in that stretch:
 *   - the photo of the shop is unpainted with the same brush it was painted with (in reverse) and the
 *     pencil strokes come back (in the scene, Hero.jsx → setBack);
 *   - the title stays in outline with graphite hatching, the text turns pencil grey and the text and the
 *     frame tremble slightly, as if drawn by hand (--sk and the #od-pencil filter, ordo.css).
 * Then the sheet, already a sketch, keeps going with the scroll and is left behind.
 *
 * With "reduce motion" there is no return to a sketch: the hero ends and Projects follows.
 */
export default function Sketch({ calm, exit }) {
  const dispRef = useRef(null)

  useLayoutEffect(() => {
    if (calm) return undefined
    const hero = document.getElementById('home')
    let u = 0
    let needs = true
    let lastDisp = -1

    const draw = () => {
      const t = Math.min(1, u / 0.85)
      const back = t * t * (3 - 2 * t)
      exit.current?.setBack(back)
      // The tremble, in four steps (each change runs the filter over the text and the frame again).
      const disp = (Math.ceil(back * 4) / 4) * 2.6
      if (disp !== lastDisp) dispRef.current?.setAttribute('scale', String((lastDisp = disp)))
    }

    const st = ScrollTrigger.create({
      start: () => hero.offsetTop + window.innerHeight * HERO_VH,
      end: () => hero.offsetTop + window.innerHeight * (HERO_VH + 1),
      onUpdate: (self) => {
        u = self.progress
        needs = true
      },
      onRefresh: (self) => {
        u = self.progress
        needs = true
      },
    })
    const tick = () => {
      if (!needs) return
      needs = false
      draw()
    }
    gsap.ticker.add(tick)
    const getHero = () => exit.current
    return () => {
      gsap.ticker.remove(tick)
      st.kill()
      getHero()?.setBack(0)
    }
  }, [calm, exit])

  if (calm) return null

  // The pencil: a barely visible tremble in the strokes of the text and the frame.
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
      <filter id="od-pencil" x="-2%" y="-10%" width="104%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}
