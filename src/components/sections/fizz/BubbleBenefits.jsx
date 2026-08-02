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
 * BubbleBenefits — springy stagger pop-in + denser drifting bubbles.
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

      gsap.utils.toArray('[data-float-bubble]', root.current).forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            delay: 0.05 * i,
            ease: 'power2.out',
            scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
          },
        )
        gsap.to(el, {
          y: -36 - (i % 4) * 16,
          x: i % 2 === 0 ? 16 : -14,
          duration: 2.6 + (i % 5) * 0.7,
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
      {[...Array(12)].map((_, i) => (
        <span
          key={i}
          data-float-bubble
          aria-hidden="true"
          className="absolute rounded-full border border-foam/25"
          style={{
            width: `${14 + (i % 5) * 12}px`,
            height: `${14 + (i % 5) * 12}px`,
            left: `${4 + ((i * 8) % 90)}%`,
            top: `${8 + ((i * 17) % 78)}%`,
            opacity: 0.35 + (i % 3) * 0.15,
          }}
        />
      ))}

      <div data-benefit-head>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-foam/60 md:text-xs">
          {eyebrow}
        </p>
        <h2 className="mt-4 max-w-[16ch] font-brico text-[clamp(2.2rem,6.5vw,5rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
          {title}
        </h2>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => (
          <article
            key={benefit.title}
            data-benefit-card
            className="group rounded-3xl border border-foam/20 p-6 transition-transform duration-300 hover:-rotate-2 hover:scale-[1.02] md:p-7"
          >
            <span
              data-benefit-dot
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
