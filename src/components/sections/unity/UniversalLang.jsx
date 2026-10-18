import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { pointerFx } from '../../../lib/interact'

const DEFAULT_STATS = [
  { label: 'COUNTRIES', value: '19' },
  { label: 'CLUBS', value: '32' },
  { label: 'MATCHES', value: '63' },
  { label: 'VOLUNTEERS', value: '210' },
]

/**
 * UniversalLang — intro scrolls away; giant number stays sticky/centered
 * while barcode + stats scrub past.
 *
 * Calma: sin scrub, el escenario sticky se quedaba quieto 2,6 pantallas
 * (`h-[260vh]`) con la página scrolleando por detrás — el «se traba» de los
 * stats. En calma el alto de scrub se va y el bloque queda en el flujo.
 */
export default function UniversalLang({
  eyebrow = 'THE CLUBS',
  title = 'A UNIVERSAL LANGUAGE',
  body = 'Players arrive speaking 23 languages. By the second match they share one: a pass, a shout, a hand to get someone back up.',
  number = '640',
  numberLabel = 'PLAYERS',
  stats = DEFAULT_STATS,
  bg,
  fg,
  /** Las barras del código de barras se encienden cerca del puntero. */
  showHover = 'on',
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-uni-number], [data-uni-stats]', { y: 16, stagger: 0.12 })

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

      if (showHover === 'off') return
      // Las barras cerca del puntero quedan encendidas; las demás bajan de opacidad.
      // (la altura es del scrub, así que acá solo se toca `opacity`)
      const fx = pointerFx(root.current)
      const box = root.current.querySelector('[data-uni-bars]')
      const bars = box ? Array.from(box.children) : []
      const level = bars.map(() => 1)
      fx.frame((p) => {
        const r = box.getBoundingClientRect()
        const near = p.clientY > r.top - 140 && p.clientY < r.bottom + 140 && r.height > 0
        const at = ((p.clientX - r.left) / r.width) * bars.length
        bars.forEach((bar, i) => {
          const target = near ? 0.3 + 0.7 * Math.max(0, 1 - Math.abs(i - at) / 6) ** 2 : 1
          level[i] += (target - level[i]) * 0.2
          bar.style.opacity = level[i].toFixed(3)
        })
      })
      return () => {
        fx.dispose()
        bars.forEach((bar) => {
          bar.style.opacity = ''
        })
      }
    },
    { scope: root, dependencies: [reduced, showHover] },
  )

  const rows = Array.isArray(stats) && stats.length ? stats : DEFAULT_STATS

  return (
    <section
      ref={root}
      id="languages"
      className="relative bg-(--sec-bg) text-current"
      style={{
        '--sec-bg': bg || '#e7e4dc',
        color: fg || '#0a0a0a',
      }}
    >
      <div className="mx-auto max-w-5xl px-5 pt-24 md:px-10 md:pt-32">
        <p className="mb-4 text-[11px] tracking-[0.28em] uppercase opacity-55">
          {eyebrow}
        </p>
        <h2 className="font-oswald text-[clamp(2.8rem,9vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.02em] uppercase">
          {title}
        </h2>
        <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-current/70 md:text-base">
          {body}
        </p>
      </div>

      {/* Tall scroller: number pinned center; stats move through */}
      <div data-uni-pin className="relative mt-10 h-[260vh] calm:h-auto md:h-[280vh] md:calm:h-auto">
        <div className="sticky top-0 flex h-svh flex-col items-center justify-center px-5 calm:static calm:h-auto calm:py-16">
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
                    className="flex-1 bg-current"
                    style={{ height: `${22 + ((i * 41) % 78)}%` }}
                  />
                ))}
              </div>

              <ul className="grid grid-cols-2 gap-x-8 gap-y-5 text-left">
                {rows.map((row) => (
                  <li key={row.label}>
                    <p className="text-[11px] tracking-[0.22em] uppercase opacity-45">
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
