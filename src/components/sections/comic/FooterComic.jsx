import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { PAPER, TORN_TOP } from './comicKit'
import { DogHead, PigHead } from './StoryArt'

const DEFAULT_COLUMNS = [
  { heading: 'Chapters', items: ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4'] },
  { heading: 'Navigation', items: ['Link 1', 'Link 2', 'Link 3', 'Link 4'] },
  { heading: 'Legal', items: ['Legal 1', 'Legal 2'] },
]

/**
 * FooterComic — the back cover. A torn sheet of the comic's grey paper rises
 * over the last scene: a closing line with the CTA, three columns of links, a
 * contact line, and the brand set huge along the bottom with the dog and the
 * pig peeking over it.
 */
export default function FooterComic({
  brand = 'COMIC',
  headline = 'Headline 2 — your closing line.',
  cta = 'CTA',
  ctaHref = '#top',
  columns = DEFAULT_COLUMNS,
  email = 'hello@placeholder.studio',
  credit = '©2026 Placeholder — template, not a promise',
  backToTop = 'Back to top ↑',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-foot-reveal]')
      gsap.from('[data-foot-line]', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(1.8)',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 60%', once: true },
      })
      gsap.from('[data-foot-word] span', {
        yPercent: 110,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.05,
        scrollTrigger: { trigger: '[data-foot-word]', start: 'top 95%', once: true },
      })
      gsap.from('[data-foot-face]', {
        yPercent: 70,
        rotate: (i) => (i ? 12 : -12),
        duration: 1,
        ease: 'back.out(1.6)',
        stagger: 0.15,
        scrollTrigger: { trigger: '[data-foot-word]', start: 'top 95%', once: true },
      })
    },
    { scope: root },
  )

  const links = (column) =>
    column.items.map((label) => (
      <li key={label}>
        <a href="#top" className="tpl-link tpl-hit relative inline-block py-1 text-[15px] font-semibold md:text-base">
          {label}
        </a>
      </li>
    ))

  return (
    <footer
      id="contact"
      ref={root}
      className="relative -mt-[100svh] flex min-h-[115svh] flex-col overflow-hidden px-5 pt-28 text-[#1d1a18] calm:mt-0 md:px-10 md:pt-36"
      style={{ ...PAPER, clipPath: TORN_TOP }}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p data-foot-line data-foot-reveal className="font-hand text-[clamp(2.4rem,5vw,4.2rem)] leading-[0.92] font-black tracking-[0.01em] uppercase">
            {headline}
          </p>
          <a
            data-foot-line
            data-foot-reveal
            href={ctaHref}
            className="ui-press tpl-hit relative mt-8 inline-flex items-center gap-3 rounded-md bg-comic-flare px-6 py-4 text-[13px] font-bold tracking-[0.16em] text-white uppercase shadow-[0_10px_24px_rgba(232,90,36,0.4)] transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:rotate-[-1deg]"
          >
            {cta}
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:col-span-7">
          {columns.map((column) => (
            <div key={column.heading} data-foot-line data-foot-reveal>
              <p className="mb-3 text-[11px] font-bold tracking-[0.24em] text-[#1d1a18]/55 uppercase">{column.heading}</p>
              <ul className="space-y-1">{links(column)}</ul>
            </div>
          ))}
          <div data-foot-line data-foot-reveal className="col-span-2 sm:col-span-3">
            <p className="mb-3 text-[11px] font-bold tracking-[0.24em] text-[#1d1a18]/55 uppercase">Contact</p>
            <a href={`mailto:${email}`} className="tpl-link tpl-hit relative font-brico text-xl font-bold [overflow-wrap:anywhere] md:text-2xl">
              {email}
            </a>
          </div>
        </nav>
      </div>

      <div className="mx-auto mt-14 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-[#1d1a18]/20 pt-5 text-[12px] font-semibold">
        <p className="text-[#1d1a18]/60">{credit}</p>
        <a href="#top" className="tpl-link tpl-hit relative">
          {backToTop}
        </a>
      </div>

      {/* the brand, huge, with the two of them peeking over it */}
      <div className="relative mt-auto pt-24">
        <div data-foot-face className="absolute bottom-[58%] left-[12%] w-[min(18vw,230px)]">
          <DogHead mood="happy" className="block h-auto w-full" />
        </div>
        <div data-foot-face className="absolute right-[12%] bottom-[56%] w-[min(18vw,230px)]">
          <PigHead mood="calm" className="block h-auto w-full" />
        </div>
        <p
          data-foot-word
          aria-label={brand}
          className="relative -mx-2 -mb-[0.12em] overflow-hidden text-center font-hand text-[clamp(6rem,30vw,30rem)] leading-[0.8] font-black tracking-[0.01em] text-[#1d1311] uppercase"
        >
          {brand.split('').map((ch, i) => (
            <span key={i} aria-hidden="true" className="inline-block">
              {ch}
            </span>
          ))}
        </p>
      </div>
    </footer>
  )
}
