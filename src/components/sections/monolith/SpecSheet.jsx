import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultSpecs = [
  { key: 'Format', value: 'One-page scrollytelling' },
  { key: 'Stack', value: 'React / Tailwind / GSAP / Lenis / Three.js' },
  { key: 'Units', value: '07 modular sections' },
  { key: 'Type', value: 'Anton condensed + JetBrains Mono' },
  { key: 'License', value: 'Commercial — placeholder terms' },
]

/**
 * SpecSheet — brutalist data table. Rows invert on hover and slide
 * in with a stagger. Swap the specs for real product facts.
 */
export default function SpecSheet({
  unit = '02',
  total = '05',
  label = 'Spec sheet',
  specs = defaultSpecs,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-spec-row]', {
        y: 36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="px-5 py-20 md:px-8 md:py-32">
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
        <p>
          Unit {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <dl className="border-2 border-carbon">
        {specs.map((spec, i) => (
          <div
            key={spec.key}
            data-spec-row
            className={`grid grid-cols-[auto_1fr] items-baseline gap-6 px-4 py-5 transition-colors duration-200 hover:bg-carbon hover:text-concrete md:grid-cols-[8rem_10rem_1fr] md:px-6 ${
              i > 0 ? 'border-t-2 border-carbon' : ''
            }`}
          >
            <dt className="font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
              {String(i + 1).padStart(2, '0')}
            </dt>
            <dt className="hidden font-mono text-[11px] uppercase tracking-[0.1em] md:block md:text-xs">
              {spec.key}
            </dt>
            <dd>
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.1em] opacity-60 md:hidden">
                {spec.key}
              </span>
              <span className="font-anton text-[clamp(1.4rem,4vw,3rem)] leading-none uppercase">
                {spec.value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
