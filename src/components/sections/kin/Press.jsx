import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { DISPLAY, HAIRLINE, INK, MaskedWords, PAPER, kinVars, pad } from './shared'

/**
 * KIN — Press
 *
 * The second dark room: one voice at a time, set very large. The section is
 * tall and its stage is `position: sticky` (no GSAP pin, so the builder can
 * remount it without a spacer in the way). Scrolling hands the stage from one
 * quote to the next: the words of the old one rise out of their masks, the
 * words of the new one rise in, a red bar — the wordmark's bar — shrinks and
 * grows between them, and a row of bars counts the voices (the current one
 * red and taller, like the collection's counter).
 *
 * Calm (reduce motion): no stage — the quotes are simply stacked, all
 * readable, ruled apart.
 *
 * Flow (`flow`, only LAB's iframe passes it): the same stack, but each voice
 * rises into its place as it reaches the screen. A hosted widget has no scroll
 * of its own for a sticky stage to use.
 */

const QUOTES = [
  { text: 'The most generous museum in the north: free, quiet, and full of surprises.', source: 'Nordic Art Review, 2026' },
  { text: 'A small house with very big rooms. Go on a weekday morning and stay for lunch.', source: 'The Weekend Paper, 2026' },
  { text: 'Kin shows how a museum can feel like home without losing its nerve.', source: 'Design Quarterly, 2025' },
]

// One slot of scroll per quote: words in, hold, words out.
const SLOT = 1.2
const ENTER = 0.4
const EXIT = 0.3

export default function Press({ quotes, flow = false, bg, fg, accent }) {
  const rootRef = useRef(null)
  const countRef = useRef(null)
  const [calm] = useState(() => prefersReducedMotion())
  const valid = Array.isArray(quotes) ? quotes.filter((r) => r?.text) : []
  const list = valid.length ? valid : QUOTES
  const n = list.length

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root || calm) return undefined
      const q = (sel) => gsap.utils.toArray(sel, root)
      if (flow) {
        q('[data-kin-q]').forEach((fig) => {
          const words = fig.querySelectorAll('[data-kin-w]')
          const src = fig.querySelector('[data-kin-qsrc]')
          const trigger = { trigger: fig, start: 'top 85%', once: true }
          gsap.fromTo(
            words,
            { yPercent: 115 },
            { yPercent: 0, duration: 0.9, stagger: Math.min(0.04, 0.4 / Math.max(1, words.length)), ease: 'power3.out', scrollTrigger: trigger },
          )
          gsap.fromTo(src, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, delay: 0.3, ease: 'power2.out', scrollTrigger: trigger })
        })
        gsap.fromTo(
          q('[data-kin-qbar]'),
          { scaleY: 0 },
          { scaleY: 1, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: root, start: 'top 85%', once: true } },
        )
        return undefined
      }
      const layers = q('[data-kin-q]')
      const ticks = q('[data-kin-ptick]')
      const bar = q('[data-kin-pbar]')[0]

      let current = -1
      const setActive = (i) => {
        if (i === current) return
        current = i
        if (countRef.current) countRef.current.textContent = pad(i + 1)
        ticks.forEach((t, k) => {
          t.dataset.state = k < i ? 'past' : k === i ? 'on' : 'next'
        })
      }
      setActive(0)

      layers.forEach((l) => {
        gsap.set(l.querySelectorAll('[data-kin-w]'), { yPercent: 115 })
        gsap.set(l.querySelector('[data-kin-qsrc]'), { autoAlpha: 0 })
      })
      if (bar) gsap.set(bar, { scaleY: 0 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top 70%',
          end: 'bottom bottom',
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: () => setActive(Math.max(0, Math.min(n - 1, Math.floor(tl.time() / SLOT + 0.2)))),
        },
      })
      layers.forEach((l, i) => {
        const words = l.querySelectorAll('[data-kin-w]')
        const src = l.querySelector('[data-kin-qsrc]')
        const at = i * SLOT
        const each = Math.min(0.03, 0.2 / Math.max(1, words.length))
        tl.to(words, { yPercent: 0, duration: ENTER, stagger: each, ease: 'power3.out' }, at)
        tl.to(src, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, at + 0.3)
        if (bar) tl.to(bar, { scaleY: 1, duration: 0.35, ease: 'power3.out' }, at)
        if (i < n - 1) {
          const out = at + SLOT - EXIT - 0.05
          tl.to(words, { yPercent: -115, duration: EXIT, stagger: each / 2, ease: 'power2.in' }, out)
          tl.to(src, { autoAlpha: 0, duration: 0.2 }, out)
          if (bar) tl.to(bar, { scaleY: 0.25, duration: EXIT, ease: 'power2.in' }, out)
        }
      })
      // Keep the last voice up until the stage lets go.
      tl.to({}, { duration: 0.01 }, n * SLOT)
      return undefined
    },
    { scope: rootRef, dependencies: [calm, flow, n], revertOnUpdate: true },
  )

  const vars = kinVars({ bg, fg, accent }, { bg: INK, fg: PAPER })

  if (calm || flow) {
    return (
      <section ref={rootRef} id="press" className="relative z-[46] px-[4.5vw] py-[12svh] md:px-[1.25vw]" style={vars}>
        <ul>
          {list.map((r, i) => (
            <li key={i} className="border-t py-[6svh]" style={{ borderColor: HAIRLINE }}>
              <figure data-kin-q>
                {flow && (
                  <span
                    data-kin-qbar
                    aria-hidden="true"
                    className="mb-[3svh] block h-[6svh] w-[1.6vw] origin-bottom md:w-[0.55vw]"
                    style={{ background: 'var(--kin-accent)' }}
                  />
                )}
                <blockquote
                  className="text-[7.2vw] leading-[0.98] font-semibold uppercase [overflow-wrap:anywhere] md:max-w-[88%] md:text-[min(4.6vw,11svh)]"
                  style={DISPLAY}
                >
                  {calm ? r.text : <MaskedWords text={r.text} />}
                </blockquote>
                <figcaption data-kin-qsrc className="mt-[3svh] text-[max(11px,3.3vw)] md:text-[max(11px,0.82vw)]">
                  {r.source}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section ref={rootRef} id="press" className="relative z-[46]" style={{ ...vars, height: `${100 + (n - 1) * 90}svh` }}>
      <div className="sticky top-0 flex h-svh flex-col justify-between px-[4.5vw] pt-[calc(52px+4svh)] pb-[5svh] md:px-[1.25vw] md:pt-[calc(52px+3svh)] md:pb-[4svh]">
        <span
          data-kin-pbar
          aria-hidden="true"
          className="block h-[8svh] w-[1.6vw] origin-bottom md:w-[0.55vw]"
          style={{ background: 'var(--kin-accent)' }}
        />

        <div className="relative min-h-0 flex-1">
          {list.map((r, i) => (
            <figure key={i} data-kin-q className="absolute inset-0 flex flex-col justify-center">
              <blockquote
                className="text-[7.2vw] leading-[0.98] font-semibold uppercase [overflow-wrap:anywhere] md:max-w-[88%] md:text-[min(4.6vw,11svh)]"
                style={DISPLAY}
              >
                <MaskedWords text={r.text} />
              </blockquote>
              <figcaption data-kin-qsrc className="mt-[4svh] text-[max(11px,3.3vw)] md:text-[max(11px,0.82vw)]">
                {r.source}
              </figcaption>
            </figure>
          ))}
        </div>

        <div
          className="flex items-center justify-between border-t pt-[1.6svh] text-[max(11px,3.3vw)] md:text-[max(11px,0.82vw)]"
          style={{ borderColor: HAIRLINE }}
        >
          <span className="flex items-end gap-[0.35em]" aria-hidden="true">
            {list.map((_, i) => (
              <span key={i} data-kin-ptick data-state={i === 0 ? 'on' : 'next'} className="kin-ptick inline-block h-[0.9em] w-[0.32em]" />
            ))}
          </span>
          <p className="tabular-nums">
            <span ref={countRef}>01</span> / {pad(n)}
          </p>
        </div>
      </div>
      <style>{`
        .kin-ptick { background: currentColor; opacity: 0.25; transform-origin: 50% 100%; transition: opacity 300ms ease, transform 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)), background-color 300ms ease; }
        .kin-ptick[data-state='past'] { opacity: 1; }
        .kin-ptick[data-state='on'] { opacity: 1; background: var(--kin-accent); transform: scaleY(1.45); }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .kin-ptick { transition: none; }
        }
      `}</style>
    </section>
  )
}
