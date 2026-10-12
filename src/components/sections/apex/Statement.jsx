import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'

/**
 * APEX — Statement (the "introduce" beat)
 *
 * After the film, a plain declaration, but not a wall of white: the same ink
 * as the hero's last frame, the sentence at poster scale and words that come
 * on with the scroll (each one from a ghost to full), then three figures that
 * count up and a single link. Words wrapped in *asterisks* take the accent.
 *
 * Everything is a field: eyebrow, the sentence, the figures (value + label),
 * the link, colours and the hairlines. Calm: the sentence is simply there and
 * the figures still count (nothing moves).
 */

const DISPLAY = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }
const LABEL = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '112%', fontVariationSettings: "'wdth' 112" }

const DEFAULT_STATS = [
  { value: '24', label: 'Lorem ipsum dolor sit' },
  { value: '480', label: 'Consectetur adipiscing elit' },
  { value: '1,200', label: 'Sed do eiusmod tempor' },
]

/** "1,100 km" → { prefix: '', num: 1100, suffix: ' km', text: '1,100' }; no digits → null. */
function parseValue(v) {
  const m = /^(\D*?)(\d[\d,.]*)(.*)$/.exec(String(v ?? '').trim())
  if (!m) return null
  const raw = m[2]
  const num = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(num)) return null
  return { prefix: m[1], num, suffix: m[3], grouped: raw.includes(',') }
}

export default function Statement({
  eyebrow = 'Section label',
  index = '01',
  statement = 'Headline 1 — lorem ipsum dolor sit amet, *consectetur* adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  stats = DEFAULT_STATS,
  linkLabel = 'Link label',
  linkHref = '#models',
  showLines = 'on',
  bg,
  fg,
  accent,
}) {
  const rootRef = useRef(null)
  const reduced = typeof window !== 'undefined' && prefersReducedMotion()

  const list = Array.isArray(stats) && stats.length ? stats : DEFAULT_STATS
  const words = String(statement)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const hot = /^\*.+\*[.,;:!?]*$/.test(w)
      return { text: w.replace(/\*/g, ''), hot }
    })

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return undefined
      // The figures count up the first time they are on screen (nothing moves,
      // so the calm version counts too). Thousands separators survive.
      root.querySelectorAll('[data-apex-num]').forEach((el) => {
        const to = Number(el.dataset.count)
        const grouped = el.dataset.grouped === 'true'
        const show = (v) => {
          const r = Math.round(v)
          el.textContent = grouped ? r.toLocaleString('en-US') : String(r)
        }
        show(0)
        const proxy = { v: 0 }
        ScrollTrigger.create({
          trigger: el,
          start: 'top 92%',
          once: true,
          onEnter: () =>
            gsap.to(proxy, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => show(proxy.v), onComplete: () => show(to) }),
        })
      })

      if (reduced) return undefined

      // The sentence: a ghost until the scroll reaches each word.
      const ws = root.querySelectorAll('[data-apex-word]')
      gsap.set(ws, { opacity: 0.14 })
      gsap.to(ws, {
        opacity: 1,
        ease: 'none',
        stagger: { each: 1 / Math.max(ws.length, 1), from: 'start' },
        scrollTrigger: { trigger: root.querySelector('[data-apex-sentence]'), start: 'top 82%', end: 'bottom 58%', scrub: true },
      })
      // Hairlines draw themselves; the eyebrow and figures rise.
      gsap.fromTo(
        '[data-apex-line]',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.4, ease: 'power3.inOut', stagger: 0.12, scrollTrigger: { trigger: root, start: 'top 75%', once: true } },
      )
      gsap.fromTo(
        '[data-apex-rise]',
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: root, start: 'top 70%', once: true } },
      )
      return undefined
    },
    { scope: rootRef, dependencies: [reduced] },
  )

  const vars = { '--st-bg': bg || '#04070d', '--st-fg': fg || '#e8edf6', '--st-accent': accent || '#9cc3ff' }
  const lines = showLines !== 'off'

  return (
    <section
      ref={rootRef}
      id="statement"
      className="apex-statement relative isolate flex min-h-svh flex-col justify-center overflow-hidden px-[5vw] py-[clamp(5rem,16svh,11rem)] md:px-[2.4vw]"
      style={{ ...vars, background: 'var(--st-bg)', color: 'var(--st-fg)' }}
    >
      {lines ? <span data-apex-line aria-hidden="true" className="absolute inset-x-[5vw] top-0 h-px origin-left bg-current opacity-25 md:inset-x-[2.4vw]" /> : null}

      <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-[1.6vw]">
        <p data-apex-rise className="flex items-baseline gap-4 text-[11px] tracking-[0.16em] uppercase md:col-span-3 lg:text-[max(10px,0.6vw)]" style={LABEL}>
          <span className="tabular-nums opacity-50">({index})</span>
          <span>{eyebrow}</span>
        </p>

        <h2
          data-apex-sentence
          className="text-[1.45rem] md:text-[clamp(1.85rem,5vw,5.6rem)] leading-[1.04] font-medium tracking-[-0.035em] md:col-span-9"
          style={DISPLAY}
        >
          {words.map((w, i) => (
            <span key={i}>
              <span data-apex-word className="inline-block" style={w.hot ? { color: 'var(--st-accent)' } : undefined}>
                {w.text}
              </span>
              {' '}
            </span>
          ))}
        </h2>

        <dl className="relative grid grid-cols-1 md:grid-cols-3 md:gap-x-[1.6vw] md:pt-7 md:col-span-9 md:col-start-4">
          {lines ? <span data-apex-line aria-hidden="true" className="absolute inset-x-0 top-0 hidden h-px origin-left bg-current opacity-25 md:block" /> : null}
          {list.map((s, i) => {
            const p = parseValue(s?.value)
            return (
              <div
                key={`${s?.label}-${i}`}
                data-apex-rise
                className={`min-w-0 flex items-baseline justify-between gap-6 py-4 md:block md:py-0 ${lines ? 'border-t border-current/20 md:border-0' : ''}`}
              >
                <dd className="order-1 text-[clamp(1.7rem,8vw,2.5rem)] leading-none font-medium tracking-[-0.04em] tabular-nums md:text-[clamp(1.9rem,5.2vw,5rem)]" style={DISPLAY}>
                  {p ? (
                    <>
                      {p.prefix}
                      <span data-apex-num data-count={p.num} data-grouped={p.grouped ? 'true' : 'false'}>
                        {p.grouped ? p.num.toLocaleString('en-US') : p.num}
                      </span>
                      {p.suffix}
                    </>
                  ) : (
                    String(s?.value ?? '')
                  )}
                </dd>
                <dt className="order-2 max-w-[18ch] text-right text-[11px] leading-[1.4] tracking-[0.1em] uppercase opacity-70 md:mt-3 md:max-w-[22ch] md:text-left md:tracking-[0.12em] lg:text-[max(10px,0.6vw)]" style={LABEL}>
                  {s?.label}
                </dt>
              </div>
            )
          })}
        </dl>

        <a
          data-apex-rise
          href={linkHref}
          className="apex-statement-link tpl-hit group relative inline-flex items-center gap-3 self-start uppercase tracking-[0.14em] md:col-span-9 md:col-start-4"
          style={LABEL}
        >
          <span className="tpl-link py-1 text-[11px] md:text-[max(11px,0.74vw)]">{linkLabel}</span>
          <span aria-hidden="true" className="apex-statement-arrow inline-block h-px w-8 bg-current" />
        </a>
      </div>

      <style>{`
        .apex-statement-arrow { transform-origin: left center; transition: transform 520ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        @media (hover: hover) { .apex-statement-link:hover .apex-statement-arrow { transform: scaleX(1.7); } }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .apex-statement-arrow { transition: none; }
        }
      `}</style>
    </section>
  )
}
