import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'

const defaultStats = [
  { value: 14, suffix: '+', label: 'Years in practice' },
  { value: 86, suffix: '', label: 'Projects completed' },
  { value: 22, suffix: '', label: 'People in the studio' },
  { value: 40, suffix: 'k', label: 'Square metres built' },
]

/**
 * StatField — counters that count up on enter. Final values render first
 * so reduced motion still reads the real numbers.
 */
export default function StatField({
  kicker = 'Practice',
  stats = defaultStats,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

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
    },
    { scope: root },
  )

  return (
    <section ref={root} className="border-t border-[#111]/12 px-5 py-20 md:px-10 md:py-32">
      <p className="mb-14 text-[11px] tracking-[0.28em] text-[#111]/45 uppercase">{kicker}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-3">
            <p className="font-display text-[clamp(3rem,8vw,6.5rem)] leading-none tracking-[-0.04em]">
              <span data-atrium-counter={stat.value}>{stat.value}</span>
              <span>{stat.suffix}</span>
            </p>
            <p className="border-t border-[#111]/12 pt-3 text-[11px] tracking-[0.22em] text-[#111]/50 uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
