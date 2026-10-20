import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { model, interior, courtyard, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultPosts = [
  {
    date: 'March 2026',
    tag: 'Practice',
    title: 'Why we still build a physical model for every house',
    img: model,
    href: '#work',
  },
  {
    date: 'January 2026',
    tag: 'Materials',
    title: 'Lime plaster, two winters on: what held and what did not',
    img: interior,
    href: '#approach',
  },
  {
    date: 'November 2025',
    tag: 'Site',
    title: 'A courtyard house in an olive grove: notes from the first visit',
    img: courtyard,
    href: '#work',
  },
]

/**
 * JournalList — three notes from the studio as an editorial row: photograph,
 * date and tag in the small caps, the title in the serif, and a read link to
 * the matching section. Photographs rise as the row is reached.
 */
export default function JournalList({
  kicker = '(9)',
  title = 'Journal',
  readLabel = 'Read',
  posts = defaultPosts,
  bg,
  fg,
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()
  const items = (Array.isArray(posts) && posts.length ? posts : defaultPosts).slice(0, 6)

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-post]', { y: 16 })
      gsap.from('[data-post]', {
        yPercent: 12,
        autoAlpha: 0,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '[data-posts]', start: 'top 82%', once: true },
      })
      return undefined
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <section
      ref={root}
      id="journal"
      className="bg-atrium-paper px-5 py-[14svh] text-atrium-ink md:px-10 md:py-[20svh]"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <header className="mb-[8svh] flex items-baseline gap-4 md:mb-[12svh]">
        <h2 className="atrium-mid">{title}</h2>
        <span className="atrium-note align-super opacity-60">{kicker}</span>
      </header>
      <ul data-posts className="grid gap-14 md:grid-cols-3 md:gap-8">
        {items.map((p, i) => (
          <li key={`${p.title}-${i}`} data-post>
            <a href={p.href || '#work'} className="group block">
              <div className="aspect-[4/5] overflow-hidden bg-current/10">
                {p.img && (
                  <img
                    {...imgAttrs(p.img, variants)}
                    sizes="(min-width: 768px) 32vw, 90vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
                  />
                )}
              </div>
              <p className="atrium-note mt-5 flex justify-between tracking-[0.06em] uppercase opacity-60">
                <span>{p.date}</span>
                <span>{p.tag}</span>
              </p>
              <h3 className="mt-3 font-display text-[clamp(1.4rem,2.2vw,2.3rem)] leading-[1.08] tracking-[-0.015em]">
                {p.title}
              </h3>
              <span className="atrium-note mt-4 inline-block tracking-[0.06em] uppercase underline underline-offset-4">
                {readLabel}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
