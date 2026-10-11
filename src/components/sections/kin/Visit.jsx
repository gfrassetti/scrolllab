import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { DISPLAY, HAIRLINE, MORE_CSS, MoreLink, kinVars } from './shared'

/**
 * KIN — Visit
 *
 * What a visitor needs before coming: a few ruled facts on the left and the
 * week on the right, drawn as seven bars — the wordmark's bar again — each as
 * tall as that day is long. Today's bar is red (read from the visitor's
 * clock after mount, so the server and the first paint agree). A closed day
 * is a hairline. The bars grow from the baseline once, when the chart
 * arrives.
 *
 * The `days` list is always Monday to Sunday, in that order: the position is
 * what says which day is today.
 *
 * Calm (reduce motion): the bars are simply there.
 */

const ROWS = [
  { label: 'Admission', text: 'Free entry' },
  { label: 'Access', text: 'Step-free, all floors' },
  { label: 'Getting here', text: 'Line 1, stop name' },
]
const DAYS = [
  { label: 'Mon', open: '', close: '' },
  { label: 'Tue', open: '10', close: '18' },
  { label: 'Wed', open: '10', close: '18' },
  { label: 'Thu', open: '10', close: '20' },
  { label: 'Fri', open: '10', close: '20' },
  { label: 'Sat', open: '11', close: '19' },
  { label: 'Sun', open: '11', close: '17' },
]

const hourOf = (v) => {
  const m = /(\d{1,2})(?::(\d{2}))?/.exec(String(v ?? ''))
  return m ? Math.min(24, Number(m[1]) + (Number(m[2]) || 0) / 60) : NaN
}
const spanOf = (d) => {
  const a = hourOf(d.open)
  const b = hourOf(d.close)
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? b - a : 0
}

export default function Visit({
  lines = ['Headline 6—', 'Lorem ipsum'],
  line1,
  line2,
  rows,
  days,
  todayLabel = 'Today',
  closedLabel = 'Closed',
  ctaLabel = 'Learn more',
  ctaHref = '#',
  bg,
  fg,
  accent,
}) {
  const rootRef = useRef(null)
  const heading = [line1, line2].some(Boolean) ? [line1, line2].filter(Boolean) : lines
  const validRows = Array.isArray(rows) ? rows.filter((r) => r?.label || r?.text) : []
  const facts = validRows.length ? validRows : ROWS
  const validDays = Array.isArray(days) ? days.filter((d) => d && (d.label || d.open || d.close)) : []
  const week = (validDays.length ? validDays : DAYS).slice(0, 7)
  const longest = Math.max(1, ...week.map(spanOf))

  // Monday-first index of today, read after mount.
  const [today, setToday] = useState(-1)
  useEffect(() => {
    setToday((new Date().getDay() + 6) % 7)
  }, [])

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return undefined
      if (prefersReducedMotion()) return calmReveal('[data-kin-vrow]')
      const q = (sel) => gsap.utils.toArray(sel, root)
      q('[data-kin-vline]').forEach((el, i) => {
        gsap.fromTo(
          el,
          { yPercent: 105 },
          {
            yPercent: 0,
            duration: 1,
            delay: i * 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: root, start: 'top 70%', once: true },
          },
        )
      })
      gsap.fromTo(
        q('[data-kin-vrow]'),
        { autoAlpha: 0, y: 16 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: { trigger: root, start: 'top 55%', once: true },
        },
      )
      gsap.fromTo(
        q('[data-kin-vbar]'),
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 0.9,
          stagger: 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: q('[data-kin-chart]')[0], start: 'top 85%', once: true },
        },
      )
      return undefined
    },
    { scope: rootRef, dependencies: [facts.length, week.length], revertOnUpdate: true },
  )

  return (
    <section
      ref={rootRef}
      id="visit"
      className="relative z-[46] px-[4.5vw] pt-[16svh] pb-[14svh] md:grid md:grid-cols-12 md:gap-x-[1.25vw] md:px-[1.25vw] md:pt-[18svh]"
      style={kinVars({ bg, fg, accent })}
    >
      <div className="md:col-span-6">
        <h2 className="text-[8.4vw] leading-[0.94] font-semibold uppercase md:text-[min(4.2vw,10svh)]" style={DISPLAY}>
          {heading.map((l) => (
            <span key={l} className="block overflow-hidden pb-[0.06em]">
              <span data-kin-vline className="block">
                {l}
              </span>
            </span>
          ))}
        </h2>

        <dl className="mt-[8svh] text-[max(13px,3.6vw)] leading-[1.25] md:mt-[10svh] md:text-[max(13px,0.95vw)]">
          {facts.map((r, i) => (
            <div
              key={i}
              data-kin-vrow
              className="grid grid-cols-[34%_1fr] gap-x-[3vw] border-t py-[0.9em] md:grid-cols-[38%_1fr] md:gap-x-[1.25vw]"
              style={{ borderColor: HAIRLINE }}
            >
              <dt className="opacity-60">{r.label}</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere]">{r.text}</dd>
            </div>
          ))}
        </dl>

        <div data-kin-vrow className="mt-[5svh] text-[max(13px,3.6vw)] md:text-[max(13px,0.95vw)]">
          <MoreLink href={ctaHref}>{ctaLabel}</MoreLink>
        </div>
      </div>

      <div className="mt-[12svh] md:col-span-5 md:col-start-8 md:mt-0 md:self-end">
        <div data-kin-chart className="flex items-stretch gap-[2.2vw] md:gap-[0.9vw]" style={{ height: 'clamp(200px, 36svh, 420px)' }}>
          {week.map((d, i) => {
            const span = spanOf(d)
            const has = Boolean(String(d.open || '').trim() || String(d.close || '').trim())
            const height = span > 0 ? Math.max(8, (span / longest) * 100) : has ? 12 : 0
            const hours = has ? `${d.open || ''}–${d.close || ''}` : closedLabel
            return (
              <div key={i} className="flex min-w-0 flex-1 flex-col justify-end text-[max(11px,3vw)] leading-[1.15] md:text-[max(11px,0.82vw)]">
                <div className="flex min-h-0 flex-1 items-end">
                  <span
                    data-kin-vbar
                    data-today={i === today ? 'true' : 'false'}
                    aria-hidden="true"
                    className="kin-vbar block w-full origin-bottom"
                    style={height ? { height: `${height}%` } : { height: '2px' }}
                  />
                </div>
                <p className="mt-[0.9em] font-semibold">{d.label}</p>
                <p className="mt-[0.2em] opacity-70 tabular-nums [overflow-wrap:anywhere]">{hours}</p>
              </div>
            )
          })}
        </div>
        <p
          data-kin-vrow
          className="mt-[3svh] flex items-center gap-[0.6em] border-t pt-[1.4svh] text-[max(11px,3vw)] md:text-[max(11px,0.82vw)]"
          style={{ borderColor: HAIRLINE }}
        >
          <span aria-hidden="true" className="inline-block h-[0.9em] w-[0.34em]" style={{ background: 'var(--kin-accent)' }} />
          {todayLabel}
        </p>
      </div>
      <style>{`
        .kin-vbar { background: currentColor; transition: background-color 400ms ease; }
        .kin-vbar[data-today='true'] { background: var(--kin-accent); }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .kin-vbar { transition: none; }
        }
        ${MORE_CSS}
      `}</style>
    </section>
  )
}
