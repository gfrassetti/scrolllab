import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { imgAttrs } from '../../../lib/responsiveImage'
import { craft, lounge, variants } from './assets/images'

/**
 * APEX — Story (mission / vision)
 *
 * Two (up to three) chapters of plain text and one picture each, stacked with
 * parallax in three depths: a giant word far behind drifts sideways, the
 * picture slides inside its frame, the text sits still in front. The blocks
 * alternate sides so the page does not read as a column of cards.
 *
 * Every word is a placeholder meant to be replaced (builder fields).
 * Calm: no scrub — the same layout, still.
 */

const DISPLAY = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }
const LABEL = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '112%', fontVariationSettings: "'wdth' 112" }

const DEFAULT_BLOCKS = [
  {
    label: 'Section label',
    title: 'Headline 1 — lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    image: craft,
    word: 'Mission',
  },
  {
    label: 'Section label',
    title: 'Headline 2 — duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
    text: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    image: lounge,
    word: 'Vision',
  },
]

export default function Story({ blocks, showWord = 'on', showLines = 'on', bg, fg, accent }) {
  const rootRef = useRef(null)
  const reduced = typeof window !== 'undefined' && prefersReducedMotion()

  const edited = Array.isArray(blocks)
    ? blocks
        .map((b, i) => ({
          label: b?.label || '',
          title: b?.title || '',
          text: b?.text || '',
          image: b?.image || DEFAULT_BLOCKS[i % DEFAULT_BLOCKS.length].image,
          word: b?.word || '',
        }))
        .filter((b) => b.title || b.text)
    : []
  const list = edited.length ? edited : DEFAULT_BLOCKS

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root || reduced) return undefined
      root.querySelectorAll('[data-story]').forEach((block, i) => {
        const dir = i % 2 ? -1 : 1
        gsap.fromTo(
          block.querySelector('[data-story-word]'),
          { xPercent: -6 * dir },
          { xPercent: 6 * dir, ease: 'none', scrollTrigger: { trigger: block, start: 'top bottom', end: 'bottom top', scrub: true } },
        )
        gsap.fromTo(
          block.querySelector('[data-story-img]'),
          { yPercent: -9 },
          { yPercent: 9, ease: 'none', scrollTrigger: { trigger: block.querySelector('[data-story-frame]'), start: 'top bottom', end: 'bottom top', scrub: true } },
        )
        gsap.fromTo(
          block.querySelectorAll('[data-story-rise]'),
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: block, start: 'top 72%', once: true } },
        )
        const line = block.querySelector('[data-story-line]')
        if (line) {
          gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: line, start: 'top 85%', once: true } })
        }
      })
      return undefined
    },
    { scope: rootRef, dependencies: [reduced, list.length] },
  )

  const vars = { '--sy-bg': bg || '#04070d', '--sy-fg': fg || '#e8edf6', '--sy-accent': accent || '#9cc3ff' }

  return (
    <section
      ref={rootRef}
      id="story"
      className="apex-story relative isolate overflow-hidden"
      style={{ ...vars, background: 'var(--sy-bg)', color: 'var(--sy-fg)' }}
    >
      {list.map((b, i) => {
        const flip = i % 2 === 1
        return (
          <article key={i} data-story className="relative px-[5vw] py-[clamp(4.5rem,14svh,10rem)] md:px-[2.4vw]">
            {showWord !== 'off' && b.word ? (
              <span
                data-story-word
                aria-hidden="true"
                className={`pointer-events-none absolute top-1/2 -z-10 -translate-y-1/2 text-[28vw] leading-none font-extrabold tracking-[-0.05em] whitespace-nowrap select-none md:text-[24vw] ${flip ? 'right-[-6vw]' : 'left-[-6vw]'}`}
                style={{ ...LABEL, fontWeight: 800, color: 'color-mix(in srgb, var(--sy-fg) 4%, transparent)' }}
              >
                {b.word}
              </span>
            ) : null}

            <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-[1.6vw]">
              <p data-story-rise className="flex items-baseline gap-3 text-[11px] tracking-[0.16em] uppercase md:col-span-4 lg:text-[max(10px,0.6vw)]" style={{ ...LABEL, color: 'var(--sy-accent)' }}>
                <span aria-hidden="true">/</span>
                <span>{b.label}</span>
                <span aria-hidden="true">/</span>
              </p>
              <h2
                data-story-rise
                className="text-[1.3rem] md:text-[clamp(1.6rem,3.1vw,3.4rem)] leading-[1.08] font-medium tracking-[-0.03em] md:col-span-8 md:col-start-5"
                style={DISPLAY}
              >
                {b.title}
              </h2>

              <div
                data-story-frame
                className={`relative aspect-[3/2] overflow-hidden md:col-span-7 md:mt-[6vw] ${flip ? 'md:order-2 md:col-start-6' : ''}`}
              >
                <img
                  data-story-img
                  {...imgAttrs(b.image, variants)}
                  sizes="(min-width: 768px) 58vw, 90vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover"
                />
              </div>

              <div
                data-story-rise
                className={`self-end md:col-span-4 md:mt-[6vw] ${flip ? 'md:order-1 md:col-start-1' : 'md:col-start-9'}`}
              >
                {showLines !== 'off' ? (
                  <span data-story-line aria-hidden="true" className="mb-6 block h-px origin-left" style={{ background: 'var(--sy-accent)' }} />
                ) : null}
                <p className="max-w-[40ch] text-[14px] leading-[1.55] opacity-85 md:text-[max(14px,1.05vw)]">{b.text}</p>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
