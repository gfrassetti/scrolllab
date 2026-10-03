import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { riseBubbles } from './riseBubbles'

const defaultBenefits = [
  {
    title: 'Benefit 01',
    body: 'Placeholder benefit copy — swap in your first selling point.',
    color: '#ffb02e',
  },
  {
    title: 'Benefit 02',
    body: 'Placeholder benefit copy — ingredients, story, whatever fizzes.',
    color: '#ff3ea5',
  },
  {
    title: 'Benefit 03',
    body: 'Placeholder benefit copy — keep it short, let the bubbles talk.',
    color: '#3ddc97',
  },
  {
    title: 'Benefit 04',
    body: 'Placeholder benefit copy — values, certifications, the fine print.',
    color: '#ff6b35',
  },
]

/**
 * BubbleBenefits — springy stagger pop-in; each benefit gets a glass bubble in
 * its color and the same rising bubbles as the footer.
 */
export default function BubbleBenefits({
  eyebrow = '',
  title = 'YOUR SECTION TITLE',
  benefits,
  bg = '#2c4bff',
  fg,
}) {
  const root = useRef(null)
  const bubblesRef = useRef(null)
  const rows = Array.isArray(benefits) && benefits.length ? benefits : defaultBenefits

  useGSAP(
    () => {
      // Calma: título y tarjetas entran con un fundido; las burbujas quedan quietas.
      if (prefersReducedMotion()) return calmReveal('[data-benefit-head], [data-benefit-card]', { y: 18 })

      gsap.from('[data-benefit-head]', {
        y: 36,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
      })

      gsap.from('[data-benefit-card]', {
        y: 80,
        opacity: 0,
        scale: 0.82,
        rotate: (i) => (i % 2 === 0 ? -7 : 7),
        duration: 0.95,
        ease: 'back.out(1.85)',
        stagger: { each: 0.11, from: 'start' },
        scrollTrigger: { trigger: root.current, start: 'top 62%', once: true },
      })

      gsap.from('[data-benefit-dot]', {
        scale: 0,
        duration: 0.55,
        ease: 'back.out(2.4)',
        stagger: 0.1,
        delay: 0.15,
        scrollTrigger: { trigger: root.current, start: 'top 62%', once: true },
      })

      // Las burbujas de vidrio de siempre, más ralas: acompañan, no tapan las tarjetas.
      return riseBubbles(bubblesRef.current, root.current, {
        size: [28, 90],
        every: 0.8,
        burst: 5,
        pool: 12,
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative z-[3] px-5 py-24 md:px-10 md:py-36"
      style={{ backgroundColor: bg, color: fg || undefined }}
    >
      {/* Wavy top edge: this section rises over the flavors' canvas and hides the bottle. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-[calc(100%-2px)] block h-8 w-full md:h-12"
        style={{ fill: bg }}
      >
        <path d="M0 48V22C120 6 240 2 360 12s240 26 360 22 240-24 360-28 240 8 360 18v22Z" />
      </svg>
      <div
        ref={bubblesRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden text-foam/45"
      />

      <div data-benefit-head>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-foam/60 md:text-xs">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="max-w-[16ch] font-brico text-[clamp(2.2rem,6.5vw,5rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
          {title}
        </h2>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((benefit, i) => (
          <article
            key={i}
            data-benefit-card
            className="group rounded-3xl border border-foam/20 p-6 transition-transform duration-300 hover:-rotate-2 hover:scale-[1.02] md:p-7"
          >
            <span
              data-benefit-dot
              aria-hidden="true"
              className="relative block h-11 w-11 rounded-full border-2 transition-transform duration-300 group-hover:scale-125"
              style={{ borderColor: benefit.color, backgroundColor: `${benefit.color}26` }}
            >
              <i
                className="absolute top-[15%] left-[20%] h-[19%] w-[34%] -rotate-[35deg] rounded-full"
                style={{ backgroundColor: benefit.color }}
              />
            </span>
            <h3 className="mt-6 font-brico text-xl font-extrabold uppercase tracking-tight md:text-2xl">
              {benefit.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-foam/70">
              {benefit.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
