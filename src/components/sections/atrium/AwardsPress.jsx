import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

const defaultItems = [
  { year: '2025', title: 'Swiss Architecture Prize', note: 'Lakeside Civic Centre · Special mention', href: '#work' },
  { year: '2024', title: 'Hochparterre — Best of Housing', note: 'Hofmatt Tower · Winner', href: '#work' },
  { year: '2024', title: 'Architectural Review — House of the Year', note: 'Olive Courtyard House · Shortlist', href: '#work' },
  { year: '2023', title: 'Prix Lignum', note: 'House in the Pines · Regional award', href: '#work' },
  { year: '2022', title: 'Domus — Interiors', note: 'Alpine Apartment · Featured', href: '#work' },
]

/**
 * AwardsPress — recognition as a ruled table: year, award, the project it was
 * for. Each row links to the work. Rows rise in one after another; the calm
 * version is a short fade.
 */
export default function AwardsPress({
  kicker = '(7)',
  title = 'Recognition',
  items = defaultItems,
  bg,
  fg,
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()
  const rows = (Array.isArray(items) && items.length ? items : defaultItems).slice(0, 10)

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-award-row]', { y: 14 })
      gsap.from('[data-award-row]', {
        yPercent: 40,
        autoAlpha: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.09,
        scrollTrigger: { trigger: '[data-award-list]', start: 'top 82%', once: true },
      })
      return undefined
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <section
      ref={root}
      id="recognition"
      className="bg-atrium-paper px-5 py-[16svh] text-atrium-ink md:px-10 md:py-[22svh]"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <header className="mb-[8svh] flex items-baseline gap-4 md:mb-[12svh]">
        <h2 className="atrium-mid">{title}</h2>
        <span className="atrium-note align-super opacity-60">{kicker}</span>
      </header>
      <ul data-award-list className="border-t border-current/25">
        {rows.map((a, i) => (
          <li key={`${a.title}-${i}`} data-award-row className="border-b border-current/25">
            <a
              href={a.href || '#work'}
              className="group grid items-baseline gap-x-6 gap-y-1 py-6 md:grid-cols-[8rem_1fr_1fr] md:py-9"
            >
              <span className="atrium-note tracking-[0.06em] tabular-nums uppercase opacity-60">{a.year}</span>
              <span className="font-display text-[clamp(1.5rem,2.9vw,3.1rem)] leading-[1.05] tracking-[-0.015em] transition-transform duration-500 ease-out group-hover:translate-x-3">
                {a.title}
              </span>
              <span className="atrium-note tracking-[0.04em] uppercase opacity-60 md:text-right">{a.note}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
