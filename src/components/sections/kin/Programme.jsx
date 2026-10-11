import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { DISPLAY, HAIRLINE, clamp01, kinVars } from './shared'

/**
 * KIN — Programme
 *
 * The year as a ruler. Twelve months run across, every show is a bar of its
 * own length on its own row, and a red bar — the same bar the wordmark is
 * made of — walks the ruler from January to December while the section is
 * pinned. Each show's bar fills as the red bar crosses it and its title
 * lights up; the month under the marker turns red.
 *
 * One scrubbed proxy (`m`, in months) drives everything, written straight to
 * the DOM in `onUpdate`: no React renders while scrolling. On a phone the
 * same beat runs with the title above each bar.
 *
 * Calm (reduce motion): no pin — the whole year is drawn at once, every bar
 * full, no marker, nothing hidden.
 */

const ITEMS = [
  { no: '01', title: 'Headline 1', dates: 'Subheadline', from: '1', to: '3' },
  { no: '02', title: 'Headline 2', dates: 'Subheadline', from: '3', to: '5' },
  { no: '03', title: 'Headline 3', dates: 'Subheadline', from: '5', to: '8' },
  { no: '04', title: 'Headline 4', dates: 'Subheadline', from: '8', to: '10' },
  { no: '05', title: 'Headline 5', dates: 'Subheadline', from: '10', to: '12' },
]
const MONTHS = 'J F M A M J J A S O N D'

const toMonth = (v, fallback) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? Math.max(1, Math.min(12, n)) : fallback
}

export default function Programme({
  lines = ['Headline 5—', 'Lorem ipsum'],
  line1,
  line2,
  year = '2026',
  months = MONTHS,
  items,
  bg,
  fg,
  accent,
}) {
  const rootRef = useRef(null)
  const pinRef = useRef(null)
  // Decided before the first render: switching layouts after GSAP wrapped
  // the pinned box in its spacer would tear the DOM out from under React.
  const [calm] = useState(() => prefersReducedMotion())
  const heading = [line1, line2].some(Boolean) ? [line1, line2].filter(Boolean) : lines
  const valid = Array.isArray(items) ? items.filter((r) => r?.title || r?.no || r?.dates) : []
  const list = valid.length ? valid : ITEMS
  const letters = String(months || MONTHS).split(/\s+/).filter(Boolean)
  const spans = list.map((r, i) => {
    const from = toMonth(r.from, ((i * 2) % 12) + 1)
    const to = Math.max(from, toMonth(r.to, Math.min(12, from + 1)))
    return { from, to }
  })
  const spansKey = spans.map((s) => `${s.from}-${s.to}`).join()

  useGSAP(
    () => {
      const root = rootRef.current
      const pin = pinRef.current
      if (!root || !pin) return undefined
      if (calm) return calmReveal('[data-kin-prow]')
      const q = (sel) => gsap.utils.toArray(sel, root)
      const rows = q('[data-kin-prow]')
      const fills = q('[data-kin-pfill]')
      const marks = q('[data-kin-pmark]')
      const titles = q('[data-kin-ptitle]')
      const monthEls = q('[data-kin-pmonth]')
      const headLines = q('[data-kin-pline]')
      const axis = q('[data-kin-paxis]')

      const p = { m: 0 }
      const apply = () => {
        const m = p.m
        const x = `translate3d(${(clamp01(m / 12) * 100).toFixed(3)}%, 0, 0)`
        marks.forEach((el) => {
          el.style.transform = x
        })
        spans.forEach((s, i) => {
          const prog = clamp01((m - (s.from - 1)) / (s.to - s.from + 1))
          if (fills[i]) fills[i].style.transform = `scaleX(${prog.toFixed(4)})`
          const lit = clamp01((m - (s.from - 1) + 0.25) / 0.25)
          if (titles[i]) titles[i].style.opacity = String(0.35 + 0.65 * lit)
        })
        const cur = Math.max(0, Math.min(11, Math.floor(m)))
        monthEls.forEach((el, k) => {
          const state = k < cur ? 'past' : k === cur ? 'on' : 'next'
          if (el.dataset.state !== state) el.dataset.state = state
        })
      }
      apply()

      // Arrival: the headline rises out of its mask, the ruler and rows fade in.
      gsap
        .timeline({ scrollTrigger: { trigger: root, start: 'top 78%', once: true } })
        .fromTo(headLines, { yPercent: 105 }, { yPercent: 0, duration: 1, ease: 'power3.out', stagger: 0.12 })
        .fromTo([...axis, ...rows], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'power2.out', stagger: 0.05 }, 0.2)

      // The year walks by while the section is pinned.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * 1.6)}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      })
      tl.to(p, { m: 12, duration: 1, onUpdate: apply }, 0.06)
      tl.to({}, { duration: 0.06 }, 1.06)
      return undefined
    },
    { scope: rootRef, dependencies: [calm, list.length, spansKey, letters.length], revertOnUpdate: true },
  )

  const trackGrid = {
    backgroundImage: `linear-gradient(to right, ${HAIRLINE} 1px, transparent 1px)`,
    backgroundSize: 'calc(100% / 12) 100%',
  }

  return (
    <section ref={rootRef} id="programme" className="relative z-[46]" style={kinVars({ bg, fg, accent })}>
      <div
        ref={pinRef}
        className={`relative flex flex-col px-[4.5vw] md:px-[1.25vw] ${
          calm ? 'min-h-svh py-[12svh]' : 'h-svh pt-[9svh] pb-[5svh] md:pt-[10svh] md:pb-[4svh]'
        }`}
      >
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-[8.4vw] leading-[0.94] font-semibold uppercase md:text-[min(5vw,9svh)]" style={DISPLAY}>
            {heading.map((l) => (
              <span key={l} className="block overflow-hidden pb-[0.06em]">
                <span data-kin-pline className="block">
                  {l}
                </span>
              </span>
            ))}
          </h2>
          <p className="pt-[0.4em] text-[max(11px,3.3vw)] tabular-nums md:text-[max(11px,0.82vw)]">{year}</p>
        </header>

        <div className="mt-[4svh] flex min-h-0 flex-1 flex-col text-[max(11px,3.3vw)] leading-[1.15] md:mt-[6svh] md:text-[max(11px,0.82vw)]">
          <div data-kin-paxis className="grid grid-cols-12 pb-[1.2svh] md:ml-[24%]" aria-hidden="true">
            {letters.slice(0, 12).map((l, i) => (
              <span key={i} data-kin-pmonth data-state={calm ? 'past' : 'next'} className="kin-pm text-center">
                {l}
              </span>
            ))}
          </div>
          <ol className="flex min-h-0 flex-1 flex-col">
            {list.map((r, i) => {
              const s = spans[i]
              const left = ((s.from - 1) / 12) * 100
              const width = ((s.to - s.from + 1) / 12) * 100
              return (
                <li
                  key={i}
                  data-kin-prow
                  className={`relative flex min-h-0 flex-col justify-center border-t md:flex-row md:items-center ${calm ? 'py-[2.4svh]' : 'flex-1'}`}
                  style={{ borderColor: HAIRLINE }}
                >
                  <div data-kin-ptitle className="flex min-w-0 items-baseline gap-[2.5vw] md:w-[24%] md:shrink-0 md:gap-[0.8vw] md:pr-[1.25vw]">
                    <span className="tabular-nums">{r.no}</span>
                    <div className="flex min-w-0 flex-1 items-baseline justify-between gap-[2.5vw] md:block">
                      <a
                        href={r.href || '#'}
                        className="tpl-link tpl-hit relative block min-w-0 text-[4.6vw] leading-[0.98] font-semibold uppercase [overflow-wrap:anywhere] md:text-[max(14px,1.45vw)]"
                        style={DISPLAY}
                      >
                        {r.title}
                      </a>
                      <span className="shrink-0 text-right opacity-60 md:mt-[0.5em] md:block md:text-left">{r.dates}</span>
                    </div>
                  </div>
                  <div className="relative mt-[1.2svh] md:mt-0 md:flex-1">
                    <div className="relative w-full" style={{ height: 'clamp(10px, 2.4svh, 26px)', ...trackGrid }}>
                      <span aria-hidden="true" className="absolute inset-y-0 bg-current opacity-[0.16]" style={{ left: `${left}%`, width: `${width}%` }} />
                      <span
                        data-kin-pfill
                        aria-hidden="true"
                        className="absolute inset-y-0 origin-left bg-current"
                        style={{ left: `${left}%`, width: `${width}%`, transform: calm ? undefined : 'scaleX(0)' }}
                      />
                      {!calm && (
                        <span data-kin-pmark aria-hidden="true" className="pointer-events-none absolute inset-0 will-change-transform">
                          <span
                            className="absolute top-[-45%] left-0 h-[190%] w-[0.34em] -translate-x-1/2"
                            style={{ background: 'var(--kin-accent)' }}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      <style>{`
        .kin-pm { opacity: 0.35; transition: opacity 300ms ease, color 300ms ease; }
        .kin-pm[data-state='past'] { opacity: 1; }
        .kin-pm[data-state='on'] { opacity: 1; color: var(--kin-accent); }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .kin-pm { transition: none; }
        }
      `}</style>
    </section>
  )
}
