import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

/**
 * KIN — Rooms
 *
 * The dark room behind the hero's doorway (`data-kin-dark` is what the
 * hero looks for to time its walk-through). It sits above the bar layer: by
 * the time it scrolls in, the doorway's dark already fills the screen with
 * the same ink.
 * An index of the current shows: big titles that rise row by row. Hovering
 * a row dims the rest and sets a small accent bar in front of its title —
 * the same bar the wordmark is built from.
 */
const DISPLAY = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '125%', fontVariationSettings: "'wdth' 125" }

// Hairlines in the text colour at 25%, so a custom fg keeps them.
const HAIRLINE = 'color-mix(in srgb, currentColor 25%, transparent)'

const ROOMS = [
  { no: '01', title: 'Headline 1', dates: 'Subheadline' },
  { no: '02', title: 'Headline 2', dates: 'Subheadline' },
  { no: '03', title: 'Headline 3', dates: 'Subheadline' },
  { no: '04', title: 'Headline 4', dates: 'Subheadline' },
  { no: '05', title: 'Headline 5', dates: 'Subheadline' },
]

export default function Rooms({ heading = 'Section title', rooms, bg, fg, accent }) {
  const rootRef = useRef(null)
  const valid = rooms?.filter((r) => r?.title || r?.no || r?.dates)
  const list = valid?.length ? valid : ROOMS

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-kin-row]')
      gsap.utils.toArray('[data-kin-row-text]', rootRef.current).forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          },
        )
      })
      return undefined
    },
    { scope: rootRef, dependencies: [list.length], revertOnUpdate: true },
  )

  return (
    <section
      ref={rootRef}
      id="rooms"
      data-kin-dark
      className="relative z-[45] min-h-svh px-[4.5vw] pt-[14svh] pb-[10svh] md:px-[1.25vw]"
      style={{ background: bg || '#141414', color: fg || '#e1e2de' }}
    >
      <h2 className="text-[3.3vw] leading-none md:text-[max(11px,0.82vw)]">{heading}</h2>
      <ul className="kin-room-list mt-[6svh] border-t" style={{ borderColor: HAIRLINE }}>
        {list.map((r, i) => (
          <li key={i} data-kin-row className="kin-room-row border-b" style={{ borderColor: HAIRLINE }}>
            <a href={r.href || '#'} className="grid grid-cols-[auto_1fr] items-baseline gap-x-[3vw] py-[2.4vw] md:grid-cols-[8vw_1fr_auto] md:py-[1.1vw]">
              <span className="text-[3.3vw] md:text-[max(11px,0.82vw)]">{r.no}</span>
              <span className="block overflow-hidden pb-[0.06em]">
                <span
                  data-kin-row-text
                  className="block text-[7.6vw] leading-[0.95] font-semibold uppercase md:text-[4.2vw]"
                  style={DISPLAY}
                >
                  <span className="kin-room-title flex items-center">
                    <span aria-hidden="true" className="kin-room-mark mr-[0.25em] inline-block h-[0.62em] w-[0.34em] shrink-0"
                      style={{ background: accent || '#e1371f' }}
                    />
                    {r.title}
                  </span>
                </span>
              </span>
              <span className="col-start-2 text-[3.3vw] md:col-start-auto md:text-[max(11px,0.82vw)]">{r.dates}</span>
            </a>
          </li>
        ))}
      </ul>
      <style>{`
        .kin-room-row { transition: opacity 320ms ease; }
        .kin-room-title { transition: transform 520ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); transform: translateX(-0.59em); }
        .kin-room-mark { transform: scaleY(0); transform-origin: 50% 100%; transition: transform 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        @media (hover: hover) {
          .kin-room-list:hover .kin-room-row { opacity: 0.35; }
          .kin-room-list .kin-room-row:hover { opacity: 1; }
          .kin-room-row:hover .kin-room-title { transform: translateX(0); }
          .kin-room-row:hover .kin-room-mark { transform: scaleY(1); }
        }
      `}</style>
    </section>
  )
}
