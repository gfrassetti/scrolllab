import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

/**
 * KIN — Intro
 *
 * A short statement set very large in the wide capitals, and three numbered
 * notes in a narrow column beside it, each a little lower than the last —
 * like the labels on a gallery wall. The statement's lines rise out of
 * their masks with the scroll; each note slides up as it arrives.
 *
 * The hero's bars build a doorway behind this section: the text uses
 * `mix-blend-mode: difference`, so it reads ink on paper and paper on the
 * bars.
 */

const DISPLAY = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '125%', fontVariationSettings: "'wdth' 125" }

const NOTES = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
]

export default function Intro({ lines = ['Headline 2—', 'Lorem ipsum', 'dolor sit amet'], line1, line2, line3, notes = NOTES }) {
  const rootRef = useRef(null)
  // The builder edits the statement line by line and the notes as {text} rows.
  const statement = [line1, line2, line3].some(Boolean) ? [line1, line2, line3].filter(Boolean) : lines
  const noteTexts = notes.map((n) => (typeof n === 'string' ? n : n?.text || ''))

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-kin-reveal]')
      gsap.utils.toArray('[data-kin-intro-line]', rootRef.current).forEach((line) => {
        gsap.fromTo(
          line,
          { yPercent: 105 },
          {
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: line, start: 'top 96%', end: 'top 70%', scrub: 0.6 },
          },
        )
      })
      gsap.utils.toArray('[data-kin-note]', rootRef.current).forEach((note) => {
        gsap.fromTo(
          note,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: { trigger: note, start: 'top 88%', once: true },
          },
        )
      })
      return undefined
    },
    { scope: rootRef },
  )

  return (
    <section
      ref={rootRef}
      id="about"
      className="relative z-40 min-h-[190svh] px-[4.5vw] pt-[30svh] text-white mix-blend-difference md:grid md:grid-cols-12 md:gap-x-[1.25vw] md:px-[1.25vw] md:pt-[32svh]"
    >
      <h2 data-kin-reveal className="text-[9vw] leading-[0.94] font-semibold uppercase md:col-span-8 md:text-[6vw]" style={DISPLAY}>
        {statement.map((l) => (
          <span key={l} className="block overflow-hidden pb-[0.05em]">
            <span data-kin-intro-line className="block">
              {l}
            </span>
          </span>
        ))}
      </h2>
      <ol className="mt-[14svh] flex flex-col gap-[10svh] text-[3.6vw] leading-[1.25] md:col-span-3 md:col-start-10 md:mt-[22svh] md:gap-[16svh] md:text-[0.95vw]">
        {noteTexts.map((n, i) => (
          <li key={n} data-kin-note data-kin-reveal className="border-t border-current pt-[0.8em]" style={{ marginLeft: `${i * 6}%` }}>
            <span className="tabular-nums">[{i + 1}]</span> {n}
          </li>
        ))}
      </ol>
    </section>
  )
}
