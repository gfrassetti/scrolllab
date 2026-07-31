import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

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
 * BubbleBenefits — 2×2 benefit cards that pop in with a springy
 * stagger, while decorative bubbles drift up behind them.
 */
export default function BubbleBenefits({
  eyebrow = 'Section eyebrow',
  title = 'YOUR SECTION TITLE',
  benefits = defaultBenefits,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-benefit-card]', {
        y: 60,
        opacity: 0,
        rotate: (i) => (i % 2 === 0 ? -4 : 4),
        duration: 0.8,
        ease: 'back.out(1.4)',
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: 'top 65%', once: true },
      })

      gsap.utils.toArray('[data-float-bubble]', root.current).forEach((el, i) => {
        gsap.to(el, {
          y: -30 - (i % 3) * 14,
          x: i % 2 === 0 ? 12 : -12,
          duration: 3 + (i % 4) * 0.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative overflow-hidden px-5 py-24 md:px-10 md:py-36"
    >
      {[...Array(7)].map((_, i) => (
        <span
          key={i}
          data-float-bubble
          aria-hidden="true"
          className="absolute rounded-full border border-foam/25"
          style={{
            width: `${18 + (i % 4) * 14}px`,
            height: `${18 + (i % 4) * 14}px`,
            left: `${8 + i * 13}%`,
            top: `${12 + ((i * 29) % 70)}%`,
          }}
        />
      ))}

      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-foam/60 md:text-xs">
        {eyebrow}
      </p>
      <h2 className="mt-4 max-w-[16ch] font-brico text-[clamp(2.2rem,6.5vw,5rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
        {title}
      </h2>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => (
          <article
            key={benefit.title}
            data-benefit-card
            className="group rounded-3xl border border-foam/20 p-6 transition-transform duration-300 hover:-rotate-2 hover:scale-[1.02] md:p-7"
          >
            <span
              aria-hidden="true"
              className="block h-10 w-10 rounded-full transition-transform duration-300 group-hover:scale-125"
              style={{ backgroundColor: benefit.color }}
            />
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
