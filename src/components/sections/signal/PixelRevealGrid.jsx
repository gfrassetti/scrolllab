import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import motion01 from './assets/motion-01.webp'
import material01 from './assets/material-01.webp'

const GRID_SIZE = 7

const defaultCards = [
  {
    id: 'motion',
    src: motion01,
    alt: 'Long-exposure light trails circling a dark geometric form',
    title: 'Motion study',
    body: 'Light choreography shot in-camera — raw material for a title sequence.',
  },
  {
    id: 'material',
    src: material01,
    alt: 'Ink rolled across a print frame by hand',
    title: 'Material study',
    body: 'Analog texture references that feed the digital grain.',
  },
]

/**
 * PixelRevealGrid — each card sits behind a 7×7 grid of paper-colour tiles;
 * scrolling it into view dissolves the tiles in random order to uncover the
 * photo. DOM + GSAP only (no canvas) — same mechanic as Awwwards' pixelated
 * image reveal pattern. See docs/reference-analysis/signal.md.
 */
function Card({ card }) {
  const wrap = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      const tiles = gsap.utils.toArray('[data-tile]', wrap.current)
      if (!tiles.length) return

      ScrollTrigger.create({
        trigger: wrap.current,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          gsap.to(tiles, {
            opacity: 0,
            duration: 0.55,
            ease: 'power2.out',
            stagger: { each: 0.014, from: 'random' },
            onComplete: () => tiles.forEach((tile) => tile.remove()),
          })
        },
      })
    },
    { scope: wrap },
  )

  return (
    <figure ref={wrap} className="group relative">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-signal-paper">
        <img src={card.src} alt={card.alt} className="h-full w-full object-cover" loading="lazy" />
        {!reduced && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <span key={i} data-tile className="bg-signal-paper" />
            ))}
          </div>
        )}
      </div>
      <figcaption className="pt-5">
        <h3 className="font-grotesk text-sm font-medium tracking-[-0.01em] text-signal-ink uppercase">
          {card.title}
        </h3>
        <p className="mt-1.5 max-w-[38ch] text-[13px] leading-relaxed text-signal-ink/60">
          {card.body}
        </p>
      </figcaption>
    </figure>
  )
}

export default function PixelRevealGrid({
  cards = defaultCards,
  eyebrow = 'Studio process',
  title = 'Behind the signal',
}) {
  return (
    <section className="bg-signal-paper px-5 py-24 text-signal-ink md:px-10 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3 border-t border-signal-ink/15 pt-5 md:flex-row md:items-baseline md:justify-between">
          <p className="text-[11px] tracking-[0.28em] text-signal-ink/45 uppercase">{eyebrow}</p>
          <h2 className="font-grotesk text-[clamp(1.6rem,3.4vw,2.4rem)] font-medium tracking-[-0.02em]">
            {title}
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  )
}
