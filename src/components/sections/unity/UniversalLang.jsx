import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const DEFAULT_STATS = [
  { label: 'STAT 1', value: 'Value 1' },
  { label: 'STAT 2', value: 'Value 2' },
  { label: 'STAT 3', value: 'Value 3' },
  { label: 'STAT 4', value: 'Value 4' },
]

/**
 * UniversalLang — intro scrolls away; giant number stays sticky/centered
 * while barcode + stats scrub past.
 */
export default function UniversalLang({
  eyebrow = 'EYEBROW 2',
  title = 'HEADLINE 5',
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.',
  number = '99+',
  numberLabel = 'LABEL 1',
  stats = DEFAULT_STATS,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.fromTo(
        '[data-uni-bars] > *',
        { scaleY: 0.12, transformOrigin: 'bottom center' },
        {
          scaleY: 1,
          stagger: 0.03,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-uni-pin]',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.45,
          },
        },
      )

      gsap.fromTo(
        '[data-uni-stats]',
        { y: 80, opacity: 0.25 },
        {
          y: -40,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-uni-pin]',
            start: 'top top',
            end: 'center center',
            scrub: 0.5,
          },
        },
      )
    },
    { scope: root },
  )

  const rows = Array.isArray(stats) && stats.length ? stats : DEFAULT_STATS

  return (
    <section
      ref={root}
      id="languages"
      className="relative bg-[#e7e4dc] text-[#0a0a0a]"
    >
      <div className="mx-auto max-w-5xl px-5 pt-24 md:px-10 md:pt-32">
        <p className="mb-4 text-[11px] tracking-[0.28em] uppercase opacity-55">
          {eyebrow}
        </p>
        <h2 className="font-oswald text-[clamp(2.8rem,9vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.02em] uppercase">
          {title}
        </h2>
        <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-[#0a0a0a]/70 md:text-base">
          {body}
        </p>
      </div>

      {/* Tall scroller: number pinned center; stats move through */}
      <div data-uni-pin className="relative mt-10 h-[260vh] md:h-[280vh]">
        <div className="sticky top-0 flex h-svh flex-col items-center justify-center px-5">
          <div className="flex w-full max-w-3xl flex-col items-center text-center">
            <p
              data-uni-number
              className="font-oswald text-[clamp(6rem,22vw,13rem)] leading-[0.78] font-semibold tracking-[-0.045em]"
            >
              {number}
            </p>
            <p className="mt-2 text-[12px] tracking-[0.28em] uppercase opacity-50">
              {numberLabel}
            </p>

            <div
              data-uni-stats
              className="mt-10 w-full max-w-lg will-change-transform md:mt-14"
            >
              <div
                data-uni-bars
                className="mx-auto mb-8 flex h-24 items-end gap-[2px] md:h-28"
                aria-hidden="true"
              >
                {Array.from({ length: 48 }, (_, i) => (
                  <span
                    key={i}
                    className="flex-1 bg-[#0a0a0a]"
                    style={{ height: `${22 + ((i * 41) % 78)}%` }}
                  />
                ))}
              </div>

              <ul className="grid grid-cols-2 gap-x-8 gap-y-5 text-left">
                {rows.map((row) => (
                  <li key={row.label}>
                    <p className="text-[10px] tracking-[0.22em] uppercase opacity-45">
                      {row.label}
                    </p>
                    <p className="mt-1 font-oswald text-xl font-semibold uppercase md:text-2xl">
                      {row.value}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
