import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { tilt } from './rupture'
import { RuptureScript } from './RuptureOn'

const BANDS = [
  { id: 'white', titleKey: 'phrase', color: '#16110e', gap: 1, seed: 2 },
  { id: 'gray', titleKey: 'breakLine', color: '#656565', gap: 3, seed: 6 },
  { id: 'dark', titleKey: 'rulesLine', color: '#a3a3a3', gap: 2, seed: 10 },
  { id: 'darkest', titleKey: 'worthLine', color: '#d4cfc6', gap: 3, seed: 14 },
]

function Marked({ text, mark }) {
  if (!mark || !text.includes(mark)) return text
  const i = text.indexOf(mark)
  return (
    <>
      {text.slice(0, i)}
      <span className="underline underline-offset-[0.18em]">{mark}</span>
      {text.slice(i + mark.length)}
    </>
  )
}

/**
 * FitStack — notes, then a TALL tetris well (one row per viewport).
 * A cube falls into the gap of each row on scrub; scroll up rewinds.
 * Tall well: one row per viewport, a cube falls into the gap on scrub.
 */
export default function FitStack({
  noteLabel = '(Notes)',
  note1 = 'Type sits on the floor. Do not hang letters below the fold.',
  note1Mark = 'the fold',
  note2 = 'The cube keeps a square ratio while the slab grows with the last word.',
  note2Mark = 'square ratio',
  note3 = 'On the black field, four plates wait. One of them is the next chapter.',
  note3Mark = 'four plates',
  phrase = 'TYPE',
  breakLine = 'THE FOLD',
  rulesLine = 'THE RATIO',
  worthLine = '(BASELINE)',
  closer = '(HOLD THE LINE)',
  brand = 'Brand',
  studio = '',
  anchor = 'notes',
}) {
  const root = useRef(null)
  const titles = { phrase, breakLine, rulesLine, worthLine }

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('[data-fit-fall]', { y: 0, rotate: 0, force3D: false })
        return undefined
      }

      const bands = gsap.utils.toArray('[data-fit-band]', root.current)
      bands.forEach((band) => {
        const fall = band.querySelector('[data-fit-fall]')
        if (!fall) return

        const fromY = () => {
          const bandBox = band.getBoundingClientRect()
          const cellBox = fall.parentElement.getBoundingClientRect()
          return Math.round(bandBox.top - cellBox.bottom)
        }

        const tl = gsap.timeline({
          defaults: { ease: 'none', force3D: false },
          scrollTrigger: {
            trigger: band,
            start: 'top 85%',
            end: 'top top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        })

        tl.fromTo(
          fall,
          { y: fromY },
          {
            y: 0,
            duration: 1,
            modifiers: {
              y: (v) => `${Math.round(parseFloat(v))}px`,
            },
          },
        )
        // Hold seated so a small scroll-up does not unseat the row.
        tl.to({}, { duration: 0.55 })
      })
    },
    { scope: root, dependencies: [phrase, breakLine, rulesLine, worthLine] },
  )

  return (
    <section ref={root} id={anchor} className="relative z-20 bg-ratio-field text-ratio-paper">
      <div className="min-h-svh bg-ratio-paper px-5 pt-16 text-ratio-ink md:px-10 md:pt-20 lg:px-14">
        <p className="font-brico text-[13px] tracking-[0.02em] text-ratio-ink/45">{noteLabel}</p>
        <p className="mt-5 max-w-[38rem] font-brico text-[1.625rem] font-normal leading-[1.32] tracking-[-0.02em] md:max-w-[42rem] md:text-[2rem] md:leading-[1.3]">
          (1) <Marked text={note1} mark={note1Mark} /> (2) <Marked text={note2} mark={note2Mark} />{' '}
          (3) <Marked text={note3} mark={note3Mark} />
        </p>
      </div>

      {BANDS.map((band) => (
        <article
          key={band.id}
          data-fit-band={band.id}
          className="relative min-h-svh overflow-hidden bg-ratio-field"
        >
          <h2 className="pointer-events-none absolute top-[18%] left-0 z-10 max-w-[16ch] px-5 font-brico text-[clamp(2.2rem,7vw,6.2rem)] font-medium leading-[0.84] tracking-[-0.04em] uppercase md:px-10">
            <span className="relative inline-block">
              {titles[band.titleKey]}
              <RuptureScript className="absolute top-0 left-0 origin-left">
                {titles[band.titleKey]}
              </RuptureScript>
            </span>
          </h2>

          <div data-fit-grid className="absolute inset-x-0 bottom-0 grid grid-cols-4 gap-px px-px">
            {[0, 1, 2, 3].map((col) => {
              const isFall = col === band.gap
              return (
                <div
                  key={col}
                  className={`relative aspect-square ${isFall ? 'overflow-visible' : 'overflow-hidden'}`}
                >
                  {isFall ? (
                    <span
                      data-fit-fall
                      data-ratio-block
                      className="absolute inset-0"
                      style={{ ...tilt(band.seed + col, 1.1), backgroundColor: band.color }}
                    />
                  ) : (
                    <span
                      data-ratio-block
                      className="absolute inset-0"
                      style={{ ...tilt(band.seed + col, 1.1), backgroundColor: band.color }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </article>
      ))}

      <div
        data-fit-lid
        className="relative z-10 bg-ratio-field px-5 pb-8 pt-[clamp(3.4rem,9vw,7.5rem)] md:px-10 md:pb-10"
      >
        <h2 className="relative max-w-[18ch] font-brico text-[clamp(2.6rem,8.5vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.04em] uppercase text-ratio-paper/30">
          <span className="relative inline-block">
            {closer}
            <RuptureScript className="absolute top-0 left-0 origin-left">
              {closer}
            </RuptureScript>
          </span>
        </h2>
        <p className="mt-[clamp(2.6rem,7vw,5.5rem)]">
          <span className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase">
            <span aria-hidden="true" className="size-2 bg-ratio-paper" />
            {brand}
          </span>
          {studio ? (
            <span className="mt-1 block text-[11px] tracking-[0.18em] uppercase opacity-50">{studio}</span>
          ) : null}
        </p>
      </div>
    </section>
  )
}
