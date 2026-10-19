import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { hero3, hero4, areaInterior, areaLandscape, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'
import { cardTone } from './tone'

const defaultCards = [
  {
    title: 'Why we draw the garden first',
    label: 'Landscape',
    date: 'March 2026',
    img: areaLandscape,
    href: '#expertise',
    color: '#5a6a52',
  },
  {
    title: 'Charred timber, two years on',
    label: 'Materials',
    date: 'January 2026',
    img: hero3,
    href: '#projects',
    color: '#2b2b2b',
  },
  {
    title: 'A kitchen built around one table',
    label: 'Interiors',
    date: 'November 2025',
    img: areaInterior,
    href: '#expertise',
    color: '#8a7a64',
  },
  {
    title: 'Water as a boundary',
    label: 'Projects',
    date: 'September 2025',
    img: hero4,
    href: '#projects',
    color: '#6a7a86',
  },
]

/**
 * StudioCards — the journal: a ruled list of posts. Date and category on the
 * left, the title large, a thumbnail, and a "Read" link that goes to the
 * matching section of the page.
 */
export default function StudioCards({
  eyebrow = 'Journal',
  title = 'Notes from the studio',
  cards = defaultCards,
  readLabel = 'Read',
  bg,
  fg,
}) {
  const root = useRef(null)
  const items = (Array.isArray(cards) && cards.length ? cards : defaultCards).slice(0, 8)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-post]', { y: 14, duration: 0.8 })
      gsap.from('[data-post]', {
        autoAlpha: 0,
        y: 30,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '[data-posts]', start: 'top 82%' },
      })
      return undefined
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="journal"
      data-tone="light"
      className="px-5 py-24 md:px-8 md:py-36"
      style={{ backgroundColor: bg || '#ffffff', color: fg || '#111111' }}
    >
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-12 grid gap-4 md:mb-20 md:grid-cols-12">
          <p className="text-sm font-medium md:col-span-2">{eyebrow}</p>
          <h2 className="text-[clamp(2.2rem,6vw,5.4rem)] leading-[0.98] font-medium tracking-[-0.045em] md:col-span-10">
            {title}
          </h2>
        </header>
        <ul data-posts className="border-t border-current/20">
          {items.map((c, i) => (
            <li key={`${c.title}-${i}`} data-post className="group border-b border-current/20">
              <a
                href={c.href || '#projects'}
                className="grid items-center gap-4 py-6 md:grid-cols-12 md:gap-8 md:py-8"
              >
                <span className="text-sm font-medium opacity-60 md:col-span-2">
                  {c.date}
                  <span className="block md:mt-1">{c.label}</span>
                </span>
                <h3 className="text-[clamp(1.4rem,2.8vw,2.5rem)] leading-[1.05] font-medium tracking-[-0.035em] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2 md:col-span-6">
                  {c.title}
                </h3>
                <div
                  className="aspect-[3/2] overflow-hidden md:col-span-2 md:aspect-[4/3]"
                  style={cardTone(c.color || '#6a6a6a')}
                >
                  {c.img && (
                    <img
                      {...imgAttrs(c.img, variants)}
                      sizes="(min-width: 768px) 16vw, 100vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                  )}
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium md:col-span-2 md:justify-end">
                  {readLabel}
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
