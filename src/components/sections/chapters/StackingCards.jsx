import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultCards = [
  {
    index: '01',
    title: 'Placeholder principle',
    body: 'Each card is one idea. As the next one arrives, this one settles back into the stack — scale, not clutter.',
    theme: 'bg-ink text-bone',
  },
  {
    index: '02',
    title: 'Another principle',
    body: 'Generic copy waiting for a real voice. The stacking rhythm keeps long lists readable and cinematic.',
    theme: 'bg-accent text-ink',
  },
  {
    index: '03',
    title: 'Third principle',
    body: 'Swap themes per card to alternate contrast. Everything is a Tailwind class away.',
    theme: 'bg-bone text-ink border border-ink/20',
  },
  {
    index: '04',
    title: 'Final principle',
    body: 'The last card stays on top. End the chapter with your strongest statement.',
    theme: 'bg-ink text-bone',
  },
]

/**
 * StackingCards — cards pin via position:sticky and pile on top of
 * each other; GSAP gently scales each card down as the next covers it.
 */
export default function StackingCards({
  chapter = '05',
  total = '06',
  label = 'The stack',
  cards = defaultCards,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const wrappers = gsap.utils.toArray('[data-card-wrap]')

      wrappers.forEach((wrapper, i) => {
        if (i === wrappers.length - 1) return
        const card = wrapper.querySelector('[data-card]')
        gsap.to(card, {
          scale: 0.94,
          opacity: 0.55,
          transformOrigin: 'center top',
          ease: 'none',
          scrollTrigger: {
            trigger: wrappers[i + 1],
            start: 'top bottom',
            end: 'top top',
            scrub: true,
          },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="px-5 py-28 md:px-10 md:py-44">
      <div className="mb-10 flex items-baseline justify-between border-t border-ink/15 pt-4 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
          Chapter {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <div>
        {cards.map((card) => (
          <div key={card.index} data-card-wrap className="h-svh">
            <article
              data-card
              className={`sticky top-[10svh] flex h-[80svh] flex-col justify-between p-6 will-change-transform md:p-12 ${card.theme}`}
            >
              <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.25em] opacity-60 md:text-xs">
                <span>{card.index}</span>
                <span>Placeholder card</span>
              </div>

              <div className="space-y-6">
                <h3 className="max-w-[14ch] text-[clamp(2.2rem,6vw,5.5rem)] leading-[0.95] font-medium tracking-[-0.02em]">
                  {card.title}
                </h3>
                <p className="max-w-[44ch] text-sm leading-relaxed opacity-70 md:text-base">
                  {card.body}
                </p>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  )
}
