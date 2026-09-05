import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * DiagonalMarquee — two tilted ribbons crossing the screen in
 * opposite directions: one solid acid, one outlined ghost text.
 */
export default function DiagonalMarquee({
  textA = 'Placeholder ribbon',
  textB = 'Generic subtitle strip',
  repeat = 6,
  bg,
  fg,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.to('[data-ribbon-a]', {
        xPercent: -50,
        duration: 26,
        ease: 'none',
        repeat: -1,
      })
      gsap.fromTo(
        '[data-ribbon-b]',
        { xPercent: -50 },
        { xPercent: 0, duration: 32, ease: 'none', repeat: -1 },
      )
    },
    { scope: root },
  )

  const items = (text) =>
    Array.from({ length: repeat }, (_, i) => (
      <span key={i} className="inline-flex items-baseline gap-[0.6em] pr-[0.6em]">
        <span>{text}</span>
        <span aria-hidden="true">◆</span>
      </span>
    ))

  return (
    <section
      ref={root}
      aria-hidden="true"
      className="relative overflow-hidden py-24 md:py-36"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div className="rotate-[-2.5deg]">
        <div className="-mx-[5vw] bg-acid py-3 md:py-4">
          <div
            data-ribbon-a
            className="flex w-max font-brico text-[7vw] leading-none font-extrabold whitespace-nowrap text-noir uppercase will-change-transform md:text-[4vw]"
          >
            <div>{items(textA)}</div>
            <div>{items(textA)}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 rotate-[1.5deg] md:mt-8">
        <div className="-mx-[5vw] border-y border-salt/20 py-3 md:py-4">
          <div
            data-ribbon-b
            className="flex w-max font-brico text-[7vw] leading-none font-extrabold whitespace-nowrap text-transparent uppercase will-change-transform [-webkit-text-stroke:1px_rgba(236,233,226,0.4)] md:text-[4vw]"
          >
            <div>{items(textB)}</div>
            <div>{items(textB)}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
