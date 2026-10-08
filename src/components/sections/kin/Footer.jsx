import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'
import { prefersReducedMotion } from '../../../lib/motion'
import { BAR_H, WORD, accentBar, layoutWord } from './barGlyphs'

/**
 * KIN — Footer
 *
 * The end of the story. The hero's word came apart into a doorway; here
 * its bars come back. As the footer scrolls in, they slide in from both
 * sides, turning, and set themselves into the word again — full width,
 * paper on ink, the accent bar arriving last. Above it: an invitation in
 * big type with the contact button, three small columns, and a last row
 * with the credit, the local time and a "back to top" box.
 *
 * A full screen tall, like every closing section of the catalogue's new
 * templates. Calm (reduce motion): the word is simply there.
 */

const PAPER = '#e1e2de'
const ACCENT = '#e1371f'
const DISPLAY = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '125%', fontVariationSettings: "'wdth' 125" }

const INK = '#141414'

// Two text columns (one line per row) + a column of links. Editable as
// `columns` ({ title, text }) and `links` ({ label, href }) + `linksTitle`.
const TEXT_COLUMNS = [
  { title: 'Address', text: 'Lorem ipsum 1234\nCity, Country' },
  { title: 'Contact', text: 'hello@brand.com\n+00 000 000 000' },
]
const LINKS = [
  { label: 'Link 1', href: '#' },
  { label: 'Link 2', href: '#' },
  { label: 'Link 3', href: '#' },
]

function LocalTime({ place }) {
  const [now, setNow] = useState('')
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
    const tick = () => setNow(fmt.format(new Date()))
    tick()
    const id = window.setInterval(tick, 15000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <>
      {place} — <span className="tabular-nums">{now || '--:--'}</span>
    </>
  )
}

export default function Footer({
  word = WORD,
  lines = ['Headline 4—', 'Lorem ipsum dolor'],
  line1,
  line2,
  ctaLabel = 'Call to action',
  ctaHref = 'mailto:hello@brand.com',
  columns,
  linksTitle = 'Follow',
  links,
  credit = '© Brand 2026',
  place = 'City',
  topLabel = 'Back to top',
  bg,
  fg,
  accent: accentProp,
}) {
  const paper = fg || PAPER
  const ink = bg || INK
  const accentColor = accentProp || ACCENT
  const textCols = columns?.filter((c) => c?.title || c?.text)
  const linkList = links?.filter((l) => l?.label)
  const cols = [
    ...(textCols?.length ? textCols : TEXT_COLUMNS).slice(0, 3).map((c) => ({
      title: c.title || '',
      lines: String(c.text || '').split('\n').map((l) => l.trim()).filter(Boolean),
    })),
    { title: linksTitle, links: linkList?.length ? linkList : LINKS },
  ]
  const rootRef = useRef(null)
  const bandRef = useRef(null)
  const layout = useMemo(() => layoutWord(word), [word])
  const heading = [line1, line2].some(Boolean) ? [line1, line2].filter(Boolean) : lines
  const accent = useMemo(() => accentBar(layout), [layout])

  useGSAP(
    () => {
      const root = rootRef.current
      const band = bandRef.current
      if (!root || !band) return undefined
      const bars = layout.bars.map((_, i) => band.querySelector(`[data-kin-fbar='${i}']`))
      if (bars.some((b) => !b)) return undefined
      const calm = prefersReducedMotion()

      let tl = null
      const build = () => {
        tl?.scrollTrigger?.kill()
        tl?.kill()
        const w = band.clientWidth
        const s = w / layout.width
        const pose = (i) => {
          const b = layout.bars[i]
          return { x: b.cx * s, y: b.cy * s, rotation: b.r, scaleX: b.sx ?? 1, scaleY: b.sy }
        }
        gsap.set(bars, { width: s, height: BAR_H * s, xPercent: -50, yPercent: -50 })
        bars.forEach((bar, i) => gsap.set(bar, pose(i)))
        if (calm) return

        const vw = window.innerWidth
        const mid = layout.width / 2
        tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: root, start: 'top 75%', end: 'bottom bottom', scrub: 1 },
        })
        bars.forEach((bar, i) => {
          const b = layout.bars[i]
          const side = b.cx < mid ? -1 : 1
          const to = pose(i)
          const far = Math.abs(b.cx - mid) / mid // outer bars travel from further out
          const delay = i === accent ? 0.45 : (1 - far) * 0.25
          tl.fromTo(
            bar,
            {
              x: to.x + side * (vw * 0.55 + far * vw * 0.25),
              y: to.y - BAR_H * s * (0.4 + far * 0.6),
              rotation: to.rotation + side * (i === accent ? 90 : 200),
              scaleX: 0.6,
              scaleY: 0.6,
            },
            { ...to, duration: 1 - delay * 0.6, ease: 'power3.out' },
            delay,
          )
        })
      }
      build()

      let t = 0
      const onResize = () => {
        window.clearTimeout(t)
        t = window.setTimeout(build, 180)
      }
      window.addEventListener('resize', onResize)
      return () => {
        window.clearTimeout(t)
        window.removeEventListener('resize', onResize)
        tl?.scrollTrigger?.kill()
        tl?.kill()
      }
    },
    { scope: rootRef, dependencies: [layout, accent] },
  )

  const toTop = (e) => {
    e.preventDefault()
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { duration: 1.6 })
    else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <footer
      ref={rootRef}
      id="visit"
      className="relative z-[46] flex min-h-svh flex-col overflow-hidden px-[4.5vw] pt-[16vw] pb-[4.5vw] text-[3.3vw] leading-[1.2] md:px-[1.25vw] md:pt-[6vw] md:pb-[1.25vw] md:text-[max(11px,0.82vw)]"
      style={{ background: ink, color: paper, '--kin-ft-paper': paper, '--kin-ft-ink': ink }}
    >
      <div className="flex flex-col gap-[8vw] md:flex-row md:items-end md:justify-between md:gap-[2vw]">
        <div>
          <h2 className="text-[8.4vw] leading-[0.94] font-semibold uppercase md:text-[min(4.6vw,10svh)]" style={DISPLAY}>
            {heading.map((l, i) => (
              <span key={i} className="block">
                {l}
              </span>
            ))}
          </h2>
          <a
            href={ctaHref}
            className="kin-fcta tpl-hit relative mt-[6vw] inline-flex items-center gap-[0.6em] border border-current px-[0.9em] py-[0.7em] md:mt-[2vw]"
          >
            <span aria-hidden="true" className="inline-block h-[0.62em] w-[0.3em]" style={{ backgroundColor: accentColor }} />
            {ctaLabel}
          </a>
        </div>

        <div
          className="kin-ft-cols grid grid-cols-2 gap-[6vw] md:gap-[3vw]"
          style={{ '--kin-ft-cols': cols.length }}
        >
          {cols.map((c, ci) => (
            <div key={ci} className="min-w-0 break-words">
              <p className="mb-[0.8em] opacity-50">{c.title}</p>
              {c.lines?.map((l, li) => (
                <p key={li}>{l}</p>
              ))}
              {c.links && (
                <ul>
                  {c.links.map((l, li) => (
                    <li key={li}>
                      <a href={l.href || '#'} className="tpl-link tpl-hit relative">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* The word, rebuilt. */}
      <div className="mt-auto pt-[10vw] md:pt-[4vw]">
        <div
          ref={bandRef}
          aria-hidden="true"
          className="relative w-full"
          style={{ aspectRatio: `${layout.width} / ${layout.height}`, clipPath: 'inset(0px -100vw 0px -100vw)' }}
        >
          {layout.bars.map((b, i) => (
            <div
              key={i}
              data-kin-fbar={i}
              className="absolute left-0 top-0 will-change-transform"
              style={{ backgroundColor: i === accent ? accentColor : paper }}
            />
          ))}
        </div>
        <span className="sr-only">{word}</span>
        <div
          className="mt-[3vw] h-px md:mt-[1.25vw]"
          style={{ background: 'color-mix(in srgb, currentColor 40%, transparent)' }}
        />
        <div className="mt-[3vw] flex items-center justify-between gap-4 md:mt-[1.25vw]">
          <p>{credit}</p>
          <p className="hidden md:block">
            <LocalTime place={place} />
          </p>
          <a href="#top" onClick={toTop} className="kin-ftop tpl-hit relative inline-flex items-center gap-[0.5em] border border-current px-[0.8em] py-[0.55em] leading-none">
            {topLabel}
            <svg aria-hidden="true" viewBox="0 0 11 12" className="kin-ftop-arrow h-[0.85em] w-[0.85em]" fill="currentColor">
              <path d="M5.5 0 10.5 5.1v1.8L6.1 2.5V12H4.9V2.5L.5 6.9V5.1z" />
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        .kin-fcta, .kin-ftop { transition: background-color 320ms ease, color 320ms ease; }
        .kin-ftop-arrow { transition: transform 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        @media (hover: hover) {
          .kin-fcta:hover, .kin-ftop:hover { background-color: var(--kin-ft-paper); color: var(--kin-ft-ink); }
          .kin-ftop:hover .kin-ftop-arrow { transform: translateY(-0.25em); }
        }
        @media (min-width: 768px) { .kin-ft-cols { grid-template-columns: repeat(var(--kin-ft-cols), minmax(0, 1fr)); } }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .kin-ftop-arrow { transition: none; }
        }
      `}</style>
    </footer>
  )
}
