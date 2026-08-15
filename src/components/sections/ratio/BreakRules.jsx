import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { tilt } from './rupture'

/**
 * BreakRules — P1 pin + P8 type + grey/white modules.
 * Black field. Scroll peels three lines. Blocks stay rigid until Rupture
 * leans them (crazy mode). Used twice: after canon, after field.
 */
export default function BreakRules({
  line1 = "DON'T BE AFRAID",
  line2 = 'TO BEND',
  line3 = 'THE MEASURE',
  aside = '(IF THE WORK ASKS)',
  invert = true,
  anchor = 'break',
}) {
  const root = useRef(null)
  const bg = invert ? '#111' : '#ebe6dc'
  const fg = invert ? '#ebe6dc' : '#111'
  const tiles = [
    '#f4f1ea',
    '#f4f1ea',
    '#f4f1ea',
    null,
    '#9a958c',
    '#9a958c',
    '#9a958c',
    '#cfc8bc',
  ]

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const lines = gsap.utils.toArray('[data-break-line]', root.current)
      const splits = lines.map((el) => new SplitText(el, { type: 'chars', mask: 'chars' }))
      splits.forEach((s, i) => {
        gsap.set(s.chars, { yPercent: i === 0 ? 0 : 110 })
        if (i > 0) gsap.set(lines[i], { autoAlpha: 0 })
      })
      gsap.set('[data-break-aside]', { autoAlpha: 0, y: 16 })

      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=220%',
            pin: '[data-break-pin]',
            scrub: 0.45,
          },
        })

        tl.to(splits[0].chars, { yPercent: -110, stagger: 0.02, ease: 'none' }, 0.22)
          .set(lines[1], { autoAlpha: 1 }, 0.28)
          .fromTo(
            splits[1].chars,
            { yPercent: 110 },
            { yPercent: 0, stagger: 0.02, ease: 'none' },
            0.28,
          )
          .to(splits[1].chars, { yPercent: -110, stagger: 0.02, ease: 'none' }, 0.52)
          .set(lines[2], { autoAlpha: 1 }, 0.58)
          .fromTo(
            splits[2].chars,
            { yPercent: 110 },
            { yPercent: 0, stagger: 0.02, ease: 'none' },
            0.58,
          )
          .to('[data-break-aside]', { autoAlpha: 1, y: 0, ease: 'none' }, 0.72)
      })

      return () => {
        splits.forEach((s) => s.revert())
        mm.revert()
      }
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id={anchor}
      className="relative"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div data-break-pin className="relative h-svh overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 gap-[3px] p-[3px]">
          {tiles.map((color, i) => (
            <div
              key={i}
              data-ratio-block
              className="min-h-0"
              style={{
                backgroundColor: color || 'transparent',
                ...tilt(i + 6, 1.6),
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex h-full flex-col justify-center px-4 md:px-8">
          <h2 className="font-anton text-[clamp(2.4rem,9vw,7rem)] leading-[0.82] uppercase">
            <span data-break-line className="block">
              {line1}
            </span>
            <span data-break-line className="block">
              {line2}
            </span>
            <span data-break-line className="block">
              {line3}
            </span>
          </h2>
          <p
            data-break-aside
            className="mt-4 font-anton text-[clamp(1.2rem,4vw,2.8rem)] uppercase opacity-80"
          >
            {aside}
          </p>
        </div>
      </div>
    </section>
  )
}
