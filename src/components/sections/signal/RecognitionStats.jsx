import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'

const defaultStats = [
  { value: 40, suffix: '+', label: 'Brand films scored' },
  { value: 12, suffix: '', label: 'Industry nods' },
  { value: 6, suffix: 'yrs', label: 'In the room, not the brief' },
]

/**
 * RecognitionStats — count-up figures on enter, same idiom as
 * atrium/StatField (`data-counter` + ScrollTrigger once + tweened proxy).
 * Placeholder numbers for a fictional studio — not a claim about a real
 * one. See docs/reference-analysis/signal.md.
 */
export default function RecognitionStats({
  eyebrow = 'Recognition',
  stats = defaultStats,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      gsap.utils.toArray('[data-counter]').forEach((el) => {
        const target = parseFloat(el.dataset.counter)
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          el.textContent = String(target)
          return
        }
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            const proxy = { value: 0 }
            gsap.to(proxy, {
              value: target,
              duration: 1.5,
              ease: 'power3.out',
              onUpdate: () => {
                el.textContent = String(Math.round(proxy.value))
              },
            })
          },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="bg-signal-paper px-5 py-24 text-signal-ink md:px-10 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <p className="border-t border-signal-ink/15 pt-5 text-[11px] tracking-[0.28em] text-signal-ink/45 uppercase">
          {eyebrow}
        </p>
        <div className="mt-14 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-grotesk text-[clamp(3rem,7vw,5rem)] leading-none font-medium tracking-[-0.03em]">
                <span data-counter={stat.value}>0</span>
                {stat.suffix}
              </p>
              <p className="mt-3 max-w-[20ch] text-sm text-signal-ink/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
