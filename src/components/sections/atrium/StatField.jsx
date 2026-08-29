import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'

const defaultStats = [
  { value: 10, suffix: '+', label: 'Placeholder metric' },
  { value: 100, suffix: '+', label: 'Placeholder metric' },
  { value: 25, suffix: '+', label: 'Placeholder metric' },
  { value: 50, suffix: 'K', label: 'Placeholder metric' },
]

/**
 * StatField — the figures, on ink, at reference scale: a grotesk numeral
 * over a serif label, one pair per band, alternating sides so the eye has to
 * travel. Counters run on enter; the final value renders first so reduced
 * motion still reads the real number. The page closes on the typographic
 * statement underneath.
 */
export default function StatField({
  kicker = 'Practice',
  stats = defaultStats,
  closer = 'Placeholder statement — swap this line for your own closing sentence.',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.utils.toArray('[data-stat]').forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0.12, y: 60 },
          {
            autoAlpha: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top 92%',
              end: 'top 48%',
              scrub: 0.5,
            },
          },
        )
        gsap.to(el, {
          autoAlpha: 0.14,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'bottom 52%',
            end: 'bottom 8%',
            scrub: 0.5,
          },
        })
      })

      gsap.utils.toArray('[data-atrium-counter]').forEach((el) => {
        const target = parseFloat(el.dataset.atriumCounter)
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            const proxy = { value: 0 }
            gsap.to(proxy, {
              value: target,
              duration: 1.7,
              ease: 'power3.out',
              onUpdate: () => {
                el.textContent = String(Math.round(proxy.value))
              },
            })
          },
        })
      })

      const split = new SplitText('[data-closer]', { type: 'lines', mask: 'lines' })
      gsap.from(split.lines, {
        yPercent: 110,
        duration: 1.2,
        ease: 'power4.out',
        stagger: 0.09,
        scrollTrigger: { trigger: '[data-closer]', start: 'top 82%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="bg-atrium-ink px-5 pt-[14svh] pb-[16svh] text-atrium-paper md:px-10"
    >
      {kicker ? (
        <p className="atrium-note font-display text-atrium-paper/65">{kicker}</p>
      ) : null}

      <div className="mt-[10svh]">
        {stats.map((stat, i) => (
          <div
            key={`${stat.label}-${i}`}
            data-stat
            className={`flex min-h-[46svh] flex-col justify-center will-change-transform md:min-h-[54svh] ${
              i % 2 ? 'md:items-end md:text-right' : 'md:items-start'
            }`}
          >
            <p className="atrium-display">
              <span data-atrium-counter={stat.value}>{stat.value}</span>
              <span>{stat.suffix}</span>
            </p>
            <p
              className={`atrium-lead max-w-[11ch] text-atrium-paper/70 ${
                i % 2 ? 'md:pr-[0.55em]' : 'md:pl-[0.55em]'
              }`}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {closer ? (
        <h2
          data-closer
          className="mx-auto mt-[16svh] max-w-[17ch] text-center font-display text-[length:var(--atrium-display)] leading-[0.98] tracking-[-0.02em] text-balance"
        >
          {closer}
        </h2>
      ) : null}
    </section>
  )
}
