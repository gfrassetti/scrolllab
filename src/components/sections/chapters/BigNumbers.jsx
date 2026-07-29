import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultStats = [
  { value: 128, suffix: '+', label: 'Placeholder metric' },
  { value: 97, suffix: '%', label: 'Generic percentage' },
  { value: 24, suffix: '', label: 'Chapters shipped' },
  { value: 12, suffix: '', label: 'Awards imagined' },
]

/**
 * BigNumbers — oversized stat counters that count up once when they
 * enter the viewport. Final values render by default, so users with
 * reduced motion (or no JS) always see the real numbers.
 */
export default function BigNumbers({ stats = defaultStats }) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.utils.toArray('[data-counter]').forEach((el) => {
        const target = parseFloat(el.dataset.counter)
        const proxy = { value: 0 }

        gsap.to(proxy, {
          value: target,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = String(Math.round(proxy.value))
          },
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="border-t border-ink/15 px-5 py-20 md:px-10 md:py-32">
      <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-3">
            <p className="text-[clamp(3rem,9vw,7.5rem)] leading-none font-medium tracking-[-0.03em]">
              <span data-counter={stat.value}>{stat.value}</span>
              <span className="text-accent">{stat.suffix}</span>
            </p>
            <p className="border-t border-ink/15 pt-3 text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
