import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import Plate from './Plate'
import { tilt } from './rupture'

const DEFAULT_PLATES = [
  { index: '01', title: 'COLUMNS', variant: 'column' },
  { index: '02', title: 'CANON', variant: 'canon' },
  { index: '03', title: 'MODULE', variant: 'module' },
  { index: '04', title: 'FIELD', variant: 'radial' },
]

/**
 * FourPlates — P1 pin + P2 zoom-through.
 * Four stacked construction cards; scroll drives each one from a small tile
 * to full-bleed, then through the lens (scale ~9) into the next chapter.
 */
export default function FourPlates({
  eyebrow = '4 systems of measure',
  platesText,
  plate1Title = 'COLUMNS',
  plate2Title = 'CANON',
  plate3Title = 'MODULE',
  plate4Title = 'FIELD',
}) {
  const root = useRef(null)
  const plates = platesText
    ? platesText.split('\n').filter(Boolean).slice(0, 4).map((line, i) => {
        const [title, variant] = line.split('|').map((p) => p.trim())
        return {
          index: String(i + 1).padStart(2, '0'),
          title: title || DEFAULT_PLATES[i].title,
          variant: variant || DEFAULT_PLATES[i].variant,
        }
      })
    : [
        { ...DEFAULT_PLATES[0], title: plate1Title },
        { ...DEFAULT_PLATES[1], title: plate2Title },
        { ...DEFAULT_PLATES[2], title: plate3Title },
        { ...DEFAULT_PLATES[3], title: plate4Title },
      ]

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const cards = gsap.utils.toArray('[data-plate-card]', root.current)
      gsap.set(cards, { scale: 0.2, autoAlpha: 1, rotate: -6 })
      cards.forEach((card, i) => {
        gsap.set(card, { y: i * 22, x: i * 14 })
      })

      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=420%',
            pin: '[data-plates-pin]',
            scrub: 0.55,
          },
        })

        cards.forEach((card, i) => {
          const t = i / cards.length
          tl.to(card, { autoAlpha: 1, scale: 1, rotate: 0, x: 0, y: 0, ease: 'none' }, t)
            .to(
              card,
              {
                scale: 9.1,
                rotate: 0,
                autoAlpha: i === cards.length - 1 ? 1 : 0,
                ease: 'none',
              },
              t + 0.16,
            )
        })
      })

      mm.add('(max-width: 767px)', () => {
        gsap.set(cards, { scale: 1, autoAlpha: 1, rotate: 0, clearProps: 'transform' })
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section
      id="systems"
      ref={root}
      className="relative bg-[#ebe6dc] text-[#111]"
    >
      <div data-plates-pin className="relative h-svh overflow-hidden">
        <p className="absolute top-14 left-4 z-20 font-anton text-[clamp(1.4rem,4vw,2.6rem)] uppercase md:left-8">
          {eyebrow}
        </p>

        {plates.map((plate, i) => (
          <article
            key={plate.index}
            data-plate-card
            data-ratio-block
            className="absolute inset-[8%] z-10 flex flex-col overflow-hidden border border-[#111] bg-[#ebe6dc] will-change-transform md:inset-[10%_12%]"
            style={{
              zIndex: 10 + i,
              ...tilt(i + 3, 1.4),
            }}
          >
            <div className="relative min-h-0 flex-1 text-[#111]/35">
              <Plate variant={plate.variant} />
            </div>
            <div className="flex items-end justify-between border-t border-[#111] px-4 py-3 md:px-6">
              <h2 className="font-anton text-[clamp(2rem,8vw,5.5rem)] leading-[0.8] uppercase">
                {plate.title}
              </h2>
              <span className="font-anton text-[clamp(2rem,8vw,5.5rem)] leading-[0.8]">
                {plate.index}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
