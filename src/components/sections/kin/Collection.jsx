import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { ARTWORKS } from './artworks'

/**
 * KIN — Collection
 *
 *  1. Triptych — the first three works arrive side by side, each a full
 *     third of the screen and full height, rising in one after another.
 *  2. Fold — pinned, the middle and right works slide left and tuck in
 *     behind the first one, which widens into the left half (a stack is
 *     born). The headline rises slowly line by line; then the counter, the
 *     names and the link fade in.
 *  3. Stack — every stretch of scroll slides the next work up over the last
 *     one, which sinks back and darkens. The counter is a row of bars (the
 *     bar of the wordmark) with the current one in red; a red marker jumps
 *     to the current name.
 *
 * The works run the full height of the screen. Grain sits over them (and
 * over real photos, if you swap them in). On a phone the same beat runs
 * with the stack on top and the text below.
 *
 * Calm (reduce motion): no pin — the works sit in a grid, every name
 * visible, nothing hidden.
 */

const INK = '#141414'
const ACCENT = '#e1371f'
const DISPLAY = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '125%', fontVariationSettings: "'wdth' 125" }
const pad = (n) => String(n).padStart(2, '0')

function Work({ item }) {
  if (!item) return null
  if (item.src) return <img src={item.src} alt={item.alt || item.name} className="block h-full w-full object-cover" />
  const { Art } = item
  return Art ? <Art /> : null
}

export default function Collection({
  lines = ['Headline 3—', 'Lorem ipsum'],
  line1,
  line2,
  label = 'Collection',
  featuredLabel = 'Featured:',
  items = ARTWORKS,
  ctaLabel = 'Learn more',
  ctaHref = '#',
  bg,
  fg,
  accent: accentProp,
}) {
  // Papel (bg), tinta (fg) y acento editables. Las clases leen --kin-*; lo
  // que anima GSAP usa los valores resueltos.
  const inkColor = fg || INK
  const accentColor = accentProp || ACCENT
  const kinVars = {
    background: bg || undefined,
    color: inkColor,
    '--kin-ink': inkColor,
    '--kin-paper': bg || '#e1e2de',
    '--kin-accent': accentColor,
  }
  const rootRef = useRef(null)
  const pinRef = useRef(null)
  const frameRef = useRef(null)
  const countRef = useRef(null)
  // Decided before the first render: switching layouts after GSAP has
  // wrapped the pinned box in its spacer would tear the DOM out from under
  // React.
  const [calm] = useState(() => prefersReducedMotion())
  const heading = [line1, line2].some(Boolean) ? [line1, line2].filter(Boolean) : lines

  useGSAP(
    () => {
      const root = rootRef.current
      const pin = pinRef.current
      const frame = frameRef.current
      if (!root || !pin || !frame || calm) return undefined
      const q = (sel) => gsap.utils.toArray(sel, root)
      const works = q('[data-kin-work]')
      const inners = q('[data-kin-work-inner]')
      const shades = q('[data-kin-work-shade]')
      const tris = q('[data-kin-tri]')
      const triShades = q('[data-kin-tri-shade]')
      const titleLines = q('[data-kin-cl-line]')
      const late = q('[data-kin-cl-late]')
      const ticks = q('[data-kin-tick]')
      const names = q('[data-kin-name]')
      const n = works.length

      // Which work is in front: counter, ticks and names follow it.
      let current = -1
      const setActive = (i) => {
        if (i === current) return
        current = i
        if (countRef.current) countRef.current.textContent = pad(i + 1)
        ticks.forEach((t, k) => t.setAttribute('data-state', k < i ? 'past' : k === i ? 'on' : 'next'))
        names.forEach((el, k) => el.setAttribute('data-on', String(k === i)))
      }
      setActive(0)

      gsap.set(works.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' })
      gsap.set(works, { transformOrigin: '50% 0%' })
      gsap.set(shades, { opacity: 0 })
      gsap.set(titleLines, { yPercent: 105 })
      gsap.set(late, { autoAlpha: 0 })

      // 1. Triptych: the three panels rise in one after another.
      const panels = [frame, ...tris]
      const enter = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root, start: 'top bottom', end: 'top top', scrub: 0.8 },
      })
      panels.forEach((el, k) => {
        enter.fromTo(el, { yPercent: 22 }, { yPercent: 0, duration: 1, ease: 'power2.out' }, k * 0.18)
      })

      // 2 + 3. Pinned: fold the triptych into the stack, then stack.
      const mm = gsap.matchMedia()
      mm.add({ phone: '(max-width: 767px)', desk: '(min-width: 768px)' }, (ctx) => {
        const { phone } = ctx.conditions
        const FOLD = 1.3
        const TEXT = 1.2
        const stackStart = FOLD + TEXT
        const total = stackStart + (n - 1)

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${total * window.innerHeight * 0.6}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: () => {
              const t = tl.time() - stackStart
              setActive(Math.max(0, Math.min(n - 1, Math.round(t))))
            },
          },
        })

        // Fold: the side panels slide left under the first one…
        tris.forEach((el, k) => {
          // On a phone the column also shortens; the side panels follow so
          // they never peek out under it.
          const fold = { xPercent: -100 * (k + 1), scale: 0.92, duration: FOLD, ease: 'power2.inOut' }
          tl.to(el, phone ? { ...fold, height: '55%' } : fold, k * 0.12)
          tl.to(triShades[k], { opacity: 0.6, duration: FOLD }, k * 0.12)
        })
        tl.set(tris, { autoAlpha: 0 }, FOLD + 0.25)
        // …which widens into the column (on a phone: the top of the screen).
        tl.to(
          frame,
          phone ? { width: '100%', height: '55%', duration: FOLD, ease: 'power2.inOut' } : { width: '50%', duration: FOLD, ease: 'power2.inOut' },
          0,
        )
        // The headline rises slowly, then the rest arrives.
        tl.to(titleLines, { yPercent: 0, duration: 1, stagger: 0.25, ease: 'power2.out' }, FOLD - 0.2)
        tl.to(late, { autoAlpha: 1, duration: 0.5, stagger: 0.1 }, FOLD + TEXT - 0.5)

        // Stack: one stretch per work.
        for (let i = 1; i < n; i += 1) {
          const at = stackStart + i - 1
          tl.to(works[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, at)
          tl.fromTo(inners[i], { scale: 1.18 }, { scale: 1, duration: 1.1, ease: 'power1.out' }, at)
          tl.to(works[i - 1], { scale: 0.9, yPercent: -3, duration: 1, ease: 'power2.inOut' }, at)
          tl.to(shades[i - 1], { opacity: 0.55, duration: 1 }, at)
        }
        return () => {
          gsap.set(frame, { clearProps: 'width,height' })
          gsap.set(tris, { clearProps: 'height' })
        }
      })
      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [calm, items.length] },
  )

  const total = items.length

  const names = (
    <div data-kin-cl-late className="flex gap-[2em]">
      <p className="shrink-0 tabular-nums">
        [{pad(total)}] {featuredLabel}
      </p>
      <ul>
        {items.map((it) => (
          <li key={it.name} data-kin-name data-on="false" className="kin-name flex items-center gap-[0.5em]">
            <span aria-hidden="true" className="kin-name-mark inline-block h-[0.62em] w-[0.3em]" style={{ backgroundColor: 'var(--kin-accent, #e1371f)' }} />
            {it.name}
          </li>
        ))}
      </ul>
    </div>
  )

  const cta = (
    <a data-kin-cl-late href={ctaHref} className="kin-more tpl-hit relative flex w-full max-w-[30em] items-center justify-between py-[0.6em]">
      <span aria-hidden="true" className="kin-more-line absolute inset-x-0 top-0 h-px bg-(--kin-ink)" />
      <span>{ctaLabel}</span>
      <span aria-hidden="true" className="relative inline-block h-[1em] w-[1.2em] overflow-hidden">
        <svg viewBox="0 0 14 12" className="kin-more-arrow absolute inset-0 h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M0 6h12.5M7.5 1l5 5-5 5" />
        </svg>
        <svg viewBox="0 0 14 12" className="kin-more-arrow-in absolute inset-0 h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M0 6h12.5M7.5 1l5 5-5 5" />
        </svg>
      </span>
    </a>
  )

  if (calm) {
    return (
      <section
        ref={rootRef}
        id="collection"
        className="relative z-[46] bg-(--kin-paper) px-[4.5vw] py-[14svh] text-(--kin-ink) md:px-[1.25vw]"
        style={kinVars}
      >
        <h2 className="text-[9vw] leading-[0.94] font-semibold uppercase md:text-[5.4vw]" style={DISPLAY}>
          {heading.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </h2>
        <ul className="mt-[8svh] grid grid-cols-2 gap-[4.5vw] md:grid-cols-3 md:gap-[1.25vw]">
          {items.map((it, i) => (
            <li key={it.name}>
              <div className="kin-grain relative aspect-[4/5] overflow-hidden">
                <Work item={it} />
              </div>
              <p className="mt-2 text-[3.3vw] md:text-[max(11px,0.82vw)]">
                {pad(i + 1)} {it.name}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-[6svh] text-[3.3vw] md:w-[30em] md:text-[max(11px,0.82vw)]">{cta}</div>
        <style>{STYLES}</style>
      </section>
    )
  }

  return (
    <section
      ref={rootRef}
      id="collection"
      className="relative z-[46] bg-(--kin-paper)"
      style={kinVars}
    >
      <div ref={pinRef} className="relative h-svh overflow-hidden">
        {/* Triptych side panels: the 2nd and 3rd works, full height. */}
        {[1, 2].map((k) => (
          <div
            key={k}
            data-kin-tri
            className="kin-grain absolute top-0 h-full overflow-hidden bg-(--kin-ink)"
            style={{ left: `${(k * 100) / 3}%`, width: `${100 / 3 + 0.05}%` }}
          >
            <div className="h-full w-full">
              <Work item={items[k]} />
            </div>
            <div data-kin-tri-shade className="pointer-events-none absolute inset-0 bg-(--kin-ink) opacity-0" />
          </div>
        ))}

        {/* The stack: first third of the triptych, then the left column. */}
        <div ref={frameRef} className="kin-grain absolute top-0 left-0 z-10 h-full w-[33.34%] overflow-hidden bg-(--kin-ink)">
          {items.map((it, i) => (
            <div key={it.name} data-kin-work className="absolute inset-0 overflow-hidden" style={{ zIndex: i }}>
              <div data-kin-work-inner className="h-full w-full">
                <Work item={it} />
              </div>
              <div data-kin-work-shade className="pointer-events-none absolute inset-0 bg-(--kin-ink) opacity-0" />
            </div>
          ))}
        </div>

        {/* The text: right of the column (phone: under it). */}
        <div className="absolute inset-x-0 top-[55%] bottom-0 flex flex-col justify-between gap-3 px-[4.5vw] pt-3 pb-[4.5vw] text-[3.3vw] leading-[1.15] md:inset-y-0 md:right-0 md:left-1/2 md:gap-0 md:px-[1.6vw] md:pt-[4.4vw] md:pb-[1.25vw] md:text-[max(11px,0.82vw)]">
          <div data-kin-cl-late className="flex items-center justify-between">
            <p>
              {label} ({pad(total)})
            </p>
            <div className="flex items-center gap-[1em]">
              <span className="flex items-end gap-[0.35em]" aria-hidden="true">
                {items.map((it, i) => (
                  <span key={it.name} data-kin-tick data-state={i === 0 ? 'on' : 'next'} className="kin-tick inline-block h-[0.9em] w-[0.32em]" />
                ))}
              </span>
              <p className="tabular-nums">
                <span ref={countRef}>01</span> / {pad(total)}
              </p>
            </div>
          </div>

          <h2 className="text-[8.4vw] leading-[0.94] font-semibold uppercase md:text-[min(5vw,10svh)]" style={DISPLAY}>
            {heading.map((l) => (
              <span key={l} className="block overflow-hidden pb-[0.06em]">
                <span data-kin-cl-line className="block">
                  {l}
                </span>
              </span>
            ))}
          </h2>

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-[1.6vw]">
            <div className="md:w-[45%]">{cta}</div>
            {names}
          </div>
        </div>
      </div>
      <style>{STYLES}</style>
    </section>
  )
}

const NOISE = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)

const STYLES = `
  .kin-grain::after {
    content: ''; position: absolute; inset: -40%; z-index: 50; pointer-events: none;
    background-image: url("data:image/svg+xml;utf8,${NOISE}");
    opacity: 0.32; mix-blend-mode: multiply;
    animation: kin-grain 0.9s steps(5) infinite;
  }
  @keyframes kin-grain {
    0% { transform: translate(0, 0); } 20% { transform: translate(-3%, 2%); } 40% { transform: translate(2%, -3%); }
    60% { transform: translate(-2%, -1%); } 80% { transform: translate(3%, 3%); } 100% { transform: translate(0, 0); }
  }
  .kin-tick { background: currentColor; opacity: 0.2; transform-origin: 50% 100%; transition: opacity 300ms ease, transform 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)), background-color 300ms ease; }
  .kin-tick[data-state='past'] { opacity: 1; }
  .kin-tick[data-state='on'] { opacity: 1; background: var(--kin-accent, #e1371f); transform: scaleY(1.45); }
  .kin-name { opacity: 0.32; transition: opacity 420ms ease; }
  .kin-name[data-on='true'] { opacity: 1; }
  .kin-name-mark { transform: scaleY(0); transform-origin: 50% 100%; transition: transform 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
  .kin-name[data-on='true'] .kin-name-mark { transform: scaleY(1); }
  .kin-more-line { transform-origin: 100% 50%; }
  .kin-more-arrow, .kin-more-arrow-in { transition: transform 520ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
  .kin-more-arrow-in { transform: translateX(-120%); }
  @media (hover: hover) {
    .kin-more:hover .kin-more-line { animation: kin-sweep 820ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
    .kin-more:hover .kin-more-arrow { transform: translateX(120%); }
    .kin-more:hover .kin-more-arrow-in { transform: translateX(0); }
  }
  @keyframes kin-sweep {
    0% { transform: scaleX(1); transform-origin: 100% 50%; }
    45% { transform: scaleX(0); transform-origin: 100% 50%; }
    46% { transform: scaleX(0); transform-origin: 0% 50%; }
    100% { transform: scaleX(1); transform-origin: 0% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    :where(:root:not([data-motion='full'])) .kin-grain::after { animation: none; }
    :where(:root:not([data-motion='full'])) .kin-more-arrow,
    :where(:root:not([data-motion='full'])) .kin-more-arrow-in { transition: none; }
    :where(:root:not([data-motion='full'])) .kin-more-line { animation: none; }
  }
`
