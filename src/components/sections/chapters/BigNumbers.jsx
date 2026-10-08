import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmCount, calmReveal, prefersReducedMotion } from '../../../lib/motion'

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
 *
 * Calma: cada cifra entra con un fundido y los contadores cuentan igual (es
 * contenido que cambia, no movimiento): en el teléfono con «reducir movimiento»
 * los números quedaban quietos.
 */
export default function BigNumbers({ stats = defaultStats, bg, fg }) {
  const root = useRef(null)
  const rows = Array.isArray(stats) && stats.length ? stats : defaultStats

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        // Mismo criterio que abajo: solo cuenta un entero.
        const counters = gsap.utils
          .toArray('[data-counter]')
          .filter((el) => /^\d+$/.test(el.dataset.counter))
        const stopReveal = calmReveal('[data-stat]', { y: 16, stagger: 0.1 })
        const stopCount = calmCount(counters, { read: (el) => Number(el.dataset.counter) })
        return () => {
          stopReveal()
          stopCount()
        }
      }

      gsap.utils.toArray('[data-counter]').forEach((el) => {
        // Solo cuenta un entero (127). Cualquier otro valor (1.500, 4,8, 24/7)
        // queda como se escribió: el conteo nunca termina en NaN ni recortado.
        const raw = el.dataset.counter
        if (!/^\d+$/.test(raw)) return
        const proxy = { value: 0 }

        gsap.to(proxy, {
          value: Number(raw),
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = String(Math.round(proxy.value))
          },
          onComplete: () => {
            el.textContent = raw
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
    <section
      ref={root}
      className="border-t border-ink/15 px-5 py-20 md:px-10 md:py-32"
      style={{ backgroundColor: bg || undefined, color: fg || undefined, '--market-ink': fg || undefined, '--market-bone': bg || undefined }}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-4">
        {rows.map((stat, i) => (
          <div key={i} data-stat className="space-y-3">
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
