import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import PaperFrame from './PaperFrame'
import { PAPER, TORN_TOP } from './comicKit'
import { AerialScene, PensScene, ShedsScene } from './StoryArt'

const SHOTS = [
  { Scene: PensScene, from: 2.0, to: 1.7 },
  { Scene: ShedsScene, from: 2.8, to: 1 },
  { Scene: AerialScene, from: 1.5, to: 1 },
]

/**
 * ChapterFork — three wide shots in a row. The previous chapter zooms into the
 * barn; here each shot comes in already blown up and pulls back until it fits
 * the screen (measured on the reference: ×2.0→1.7, ×2.8→1, ×1.5→1), the next
 * one cutting in over it. A torn grey paper rises at the end and becomes the
 * page the next chapter is drawn on.
 */
export default function ChapterFork({ captions = ['Caption 8 — replace with story beat.'] }) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-comic-reveal]')
      const q = (sel) => gsap.utils.toArray(sel, root.current)
      const shots = q('[data-shot]')
      const curtain = root.current.querySelector('[data-curtain]')
      const caption = root.current.querySelector('[data-fork-caption]')

      shots.forEach((shot, i) => gsap.set(shot, { scale: SHOTS[i].from, opacity: i ? 0 : 1, transformOrigin: '50% 50%' }))
      gsap.set(curtain, { yPercent: 106 })
      gsap.set(caption, { opacity: 0, y: 20 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
          pin: root.current.querySelector('[data-pin]'),
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      let t = 0
      shots.forEach((shot, i) => {
        if (i) tl.to(shot, { opacity: 1, duration: 0.25 }, t)
        tl.to(shot, { scale: SHOTS[i].to, duration: 2.4, ease: 'power2.out' }, t)
        t += 2.2
      })
      tl.to(caption, { opacity: 1, y: 0, duration: 0.6 }, 2.4)
      tl.to(caption, { opacity: 0, y: -14, duration: 0.5 }, t - 0.4)
      tl.to(curtain, { yPercent: 0, duration: 1.6, ease: 'power2.out' }, t)
      tl.to(shots[2], { yPercent: -10, duration: 1.6, ease: 'power2.out' }, t)
    },
    { scope: root, dependencies: [reduced] },
  )

  if (reduced) {
    return (
      <section id="chapter-fork" ref={root} className="bg-[#1a1512] py-16 md:py-24">
        {SHOTS.map(({ Scene }, i) => (
          <div key={i} data-comic-reveal className="mx-auto mb-6 max-w-4xl px-5 md:px-10">
            <PaperFrame className="h-full !w-full">
              <div className="relative aspect-[16/9] overflow-hidden">
                <Scene className="absolute inset-0 h-full w-full" />
              </div>
            </PaperFrame>
          </div>
        ))}
        <p data-comic-reveal className="px-6 text-center text-white">{captions[0]}</p>
      </section>
    )
  }

  return (
    <section id="chapter-fork" ref={root} className="relative h-[520vh] bg-[#1a1512]">
      <div data-pin className="relative h-svh overflow-hidden">
        {SHOTS.map(({ Scene }, i) => (
          <div key={i} data-shot aria-hidden="true" className="absolute inset-0 will-change-transform">
            <Scene className="absolute inset-0 h-full w-full" />
          </div>
        ))}
        <p
          data-fork-caption
          className="pointer-events-none absolute inset-x-0 top-[12%] z-20 px-6 text-center text-[15px] font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] md:text-lg"
        >
          {captions[0]}
        </p>
        <div
          data-curtain
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-9 -bottom-2 z-30 will-change-transform"
          style={{ filter: 'drop-shadow(0 -8px 14px rgba(20,12,8,0.4))' }}
        >
          <div className="h-full w-full" style={{ ...PAPER, clipPath: TORN_TOP }} />
        </div>
      </div>
    </section>
  )
}
