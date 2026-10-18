import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmCount, calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { themeVars } from '../../../lib/themeVars'

const defaultStats = [
  { value: '1,400', label: 'm² of foundry on the Antwerp docks' },
  { value: '28', label: 'days every piece cures before it leaves' },
  { value: '312', label: 'pieces cast since 2014' },
  { value: '0', label: 'coats of paint, ever' },
]

// Hasta dónde llega el vertido en cada celda (un medidor, no un bloque negro).
const LEVELS = [0.72, 0.46, 0.86, 0.24]

// Solo cuenta un número limpio («1,400», «28»); «24/7» o una palabra se muestran tal cual.
const countable = (v) => /^\d[\d,]*$/.test(String(v).trim())
const digits = (v) => Number(String(v).replace(/[^\d.]/g, '')) || 0
const format = (n, sample) => (String(sample).includes(',') ? Math.round(n).toLocaleString('en-US') : String(Math.round(n)))

/**
 * LoadNumbers — the studio in four figures, poured: each cell is a mould
 * that fills with concrete from the bottom while its number counts up; where
 * the pour passes the number, the type inverts. The cells are placed one by
 * one, like blocks on site.
 *
 * Calma: los números cuentan igual (calmCount) y el vertido se ve terminado.
 */
export default function LoadNumbers({
  unit = '06',
  total = '07',
  label = 'By weight',
  unitLabel = 'Unit',
  title = 'The studio, in numbers.',
  stats,
  bg,
  fg,
}) {
  const root = useRef(null)
  const valid = stats?.filter((s) => s?.value || s?.label)
  const rows = valid?.length ? valid : defaultStats

  useGSAP(
    () => {
      const nums = gsap.utils.toArray('[data-load-num]', root.current)
      if (prefersReducedMotion()) {
        gsap.utils.toArray('[data-load-fill]', root.current).forEach((el, i) => gsap.set(el, { scaleY: LEVELS[i % LEVELS.length] }))
        const stop = calmCount(
          nums.filter((el) => countable(el.dataset.count)),
          { read: (el) => digits(el.dataset.count) },
        )
        const stopReveal = calmReveal('[data-load-cell]', { y: 16, stagger: 0.08 })
        return () => {
          stop()
          stopReveal()
        }
      }

      const cells = gsap.utils.toArray('[data-load-cell]', root.current)
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 65%', once: true } })
      tl.from(cells, { yPercent: -30, autoAlpha: 0, duration: 0.6, stagger: 0.12, ease: 'power4.out' })
      cells.forEach((cell, i) => {
        const num = nums[i]
        const at = 0.35 + i * 0.18
        tl.fromTo(
          cell.querySelector('[data-load-fill]'),
          { scaleY: 0 },
          { scaleY: LEVELS[i % LEVELS.length], duration: 1.6, ease: 'power2.inOut' },
          at,
        )
        if (!countable(num.dataset.count)) return
        const to = digits(num.dataset.count)
        const proxy = { v: 0 }
        num.textContent = format(0, num.dataset.count)
        tl.to(
          proxy,
          {
            v: to,
            duration: 1.6,
            ease: 'power2.inOut',
            onUpdate: () => {
              num.textContent = format(proxy.v, num.dataset.count)
            },
          },
          at,
        )
      })
    },
    { scope: root, dependencies: [rows.length], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      className="px-5 py-20 md:px-8 md:py-32"
      style={{ backgroundColor: bg || undefined, color: fg || undefined, ...themeVars({ carbon: fg, concrete: bg }) }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
        <p>
          {unitLabel} {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <h2 className="mb-10 max-w-[14ch] font-anton text-[clamp(2.4rem,6.5vw,5.5rem)] leading-[0.9] uppercase md:mb-14">
        {title}
      </h2>

      <div className="grid grid-cols-1 gap-[2px] border-2 border-carbon bg-carbon sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((stat, i) => (
          <div
            key={i}
            data-load-cell
            className="relative flex min-h-[15rem] flex-col justify-between overflow-hidden bg-concrete p-5 md:min-h-[24rem] md:p-6"
          >
            {/* el hormigón que sube */}
            <span
              data-load-fill
              aria-hidden="true"
              className="absolute inset-0 origin-bottom scale-y-0 bg-carbon"
            />
            <p className="relative font-mono text-[11px] uppercase tracking-[0.1em] text-concrete mix-blend-difference md:text-xs">
              {String(i + 1).padStart(2, '0')}
            </p>
            <div className="relative text-concrete mix-blend-difference">
              <p
                data-load-num
                data-count={stat.value}
                className="font-anton text-[clamp(4rem,9vw,8.5rem)] leading-[0.85] tabular-nums"
              >
                {stat.value}
              </p>
              <p className="mt-3 max-w-[22ch] font-mono text-sm leading-snug uppercase">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
