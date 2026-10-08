import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

const defaultSpecs = [
  { key: 'Form', value: 'Vertical scroll monument' },
  { key: 'System', value: 'Wireframe · pin scrub · hard edge' },
  { key: 'Modules', value: '07 locked units' },
  { key: 'Face', value: 'Anton condensed · JetBrains Mono' },
  { key: 'Signal', value: 'Klein blue on concrete grey' },
]

/**
 * SpecSheet — brutalist data table. Rows invert on hover and slide
 * in with a stagger. Swap the specs for real product facts.
 * `specs` rows are `{ key, value }`; the builder / LAB list sends
 * `{ label, value }` (same thing, `label` reads better in a form).
 */
export default function SpecSheet({
  unit = '02',
  total = '05',
  label = 'Spec sheet',
  specs,
  unitLabel = 'Unit',
  bg,
  fg,
}) {
  const root = useRef(null)
  const valid = specs?.filter((s) => s?.key || s?.label || s?.value)
  const rows = valid?.length ? valid : defaultSpecs

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-spec-row]', { y: 20, stagger: 0.07 })

      gsap.from('[data-spec-row]', {
        y: 36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })
    },
    { scope: root, dependencies: [rows.length], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      className="px-5 py-20 md:px-8 md:py-32"
      style={{
        background: bg || undefined,
        color: fg || undefined,
        '--spec-ink': fg || '#101010',
        '--spec-paper': bg || '#cdcbc4',
      }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-[var(--spec-ink)] pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
        <p>
          {unitLabel} {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <dl className="border-2 border-[var(--spec-ink)]">
        {rows.map((spec, i) => (
          <div
            key={i}
            data-spec-row
            className={`grid grid-cols-[auto_1fr] items-baseline gap-6 px-4 py-5 transition-colors duration-200 hover:bg-[var(--spec-ink)] hover:text-[var(--spec-paper)] md:grid-cols-[8rem_10rem_1fr] md:px-6 ${
              i > 0 ? 'border-t-2 border-[var(--spec-ink)]' : ''
            }`}
          >
            <dt className="font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
              {String(i + 1).padStart(2, '0')}
            </dt>
            <dt className="hidden font-mono text-[11px] uppercase tracking-[0.1em] md:block md:text-xs">
              {spec.key ?? spec.label}
            </dt>
            <dd className="min-w-0">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.1em] opacity-60 md:hidden">
                {spec.key ?? spec.label}
              </span>
              <span className="font-anton text-[clamp(1.4rem,4vw,3rem)] leading-none [overflow-wrap:anywhere] uppercase">
                {spec.value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
