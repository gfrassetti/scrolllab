import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { hero2, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultFacts = [
  { value: '41', label: 'Houses built' },
  { value: '12', label: 'Years in practice' },
  { value: '11', label: 'People in the studio' },
]

/**
 * KeyFacts — the studio statement: a full-bleed photograph that drifts slower
 * than the page, one sentence over it, a link, and three plain figures under.
 */
export default function KeyFacts({
  eyebrow = 'The studio',
  title = 'We shape space into purpose.',
  linkLabel = 'Read our journal',
  linkHref = '#journal',
  img = hero2,
  facts = defaultFacts,
  bg,
  fg,
  /** Oscurece un poco la foto para que el texto se lea. */
  showShade = 'on',
}) {
  const root = useRef(null)
  const stats = (Array.isArray(facts) && facts.length ? facts : defaultFacts).slice(0, 6)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-studio-copy] > *', { y: 14, duration: 0.8 })
      gsap.fromTo(
        '[data-studio-img]',
        { yPercent: -9 },
        {
          yPercent: 9,
          ease: 'none',
          scrollTrigger: { trigger: '[data-studio-frame]', start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
      gsap.from('[data-studio-copy] > *', {
        autoAlpha: 0,
        y: 40,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '[data-studio-frame]', start: 'top 60%' },
      })
      return undefined
    },
    { scope: root },
  )

  return (
    <section ref={root} id="studio" style={{ backgroundColor: bg || '#ffffff', color: fg || '#111111' }}>
      <div data-studio-frame data-tone="dark" className="relative h-[88svh] min-h-[540px] overflow-clip"
        style={{ backgroundColor: fg || '#1d1d1d' }}
      >
        <img
          data-studio-img
          {...imgAttrs(img, variants)}
          sizes="(max-width: 767px) 120vh, 100vw"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover"
        />
        {showShade !== 'off' && <div className="absolute inset-0 bg-black/35" />}
        <div
          data-studio-copy
          className="relative z-10 flex h-full flex-col items-start justify-end gap-6 px-5 pb-14 text-white md:px-8 md:pb-20"
        >
          <p className="text-sm font-medium">{eyebrow}</p>
          <h2 className="max-w-[16ch] text-[clamp(2.8rem,8.5vw,8rem)] leading-[0.92] font-medium tracking-[-0.05em]">
            {title}
          </h2>
          <a
            href={linkHref}
            className="tpl-hit inline-flex items-center gap-3 rounded-full border border-white px-6 py-3 text-sm font-medium transition-[background-color,color] duration-300 hover:bg-white hover:text-black"
          >
            {linkLabel}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <dl data-tone="light" className="mx-auto grid max-w-[1500px] grid-cols-1 gap-10 px-5 py-16 sm:grid-cols-3 md:px-8 md:py-24">
        {stats.map((f, i) => (
          <div key={`${f.label}-${i}`} className="border-t border-current/20 pt-5">
            <dd className="text-[clamp(3.4rem,8vw,7rem)] leading-none font-medium tracking-[-0.06em] tabular-nums">
              {f.value}
            </dd>
            <dt className="mt-3 text-sm font-medium opacity-65">{f.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
