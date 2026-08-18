import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { tilt } from './rupture'
import { RuptureOn, RuptureScript } from './RuptureOn'

const BANDS = [
  { id: 'white', titleKey: 'phrase', color: '#ffffff', gap: 1, seed: 2 },
  { id: 'gray', titleKey: 'breakLine', color: '#9a9a9a', gap: 3, seed: 6 },
  { id: 'dark', titleKey: 'rulesLine', color: '#555555', gap: 2, seed: 10 },
  { id: 'darkest', titleKey: 'worthLine', color: '#222222', gap: 3, seed: 14 },
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
 * Layout from grids.obys.agency: huge type band + 4-col squares, next row below.
 */
export default function FitStack({
  noteLabel = '(Notes)',
  note1 = 'Type sits on the floor. Do not hang letters below the fold.',
  note1Mark = 'the fold',
  note2 = 'The cube keeps a square ratio while the slab grows with the last word.',
  note2Mark = 'square ratio',
  note3 = 'On the black field, four plates wait. One of them is the next chapter.',
  note3Mark = 'four plates',
  phrase = 'GRID',
  breakLine = 'THE FOLD',
  rulesLine = 'THE RATIO',
  worthLine = '(BASELINE)',
  closer = '(HOLD THE LINE)',
  brand = 'SCROLLLAB',
  studio = 'Guido — 2026',
  anchor = 'notes',
}) {
  const root = useRef(null)
  const titles = { phrase, breakLine, rulesLine, worthLine }

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('[data-fit-fall]', { y: 0, rotate: 0 })
        return undefined
      }

      const bands = gsap.utils.toArray('[data-fit-band]', root.current)
      bands.forEach((band) => {
        const fall = band.querySelector('[data-fit-fall]')
        if (!fall) return
        gsap.fromTo(
          fall,
          { y: () => -window.innerHeight * 0.92 },
          {
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: band,
              start: 'top 85%',
              end: 'top 18%',
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        )
      })
    },
    { scope: root, dependencies: [phrase, breakLine, rulesLine, worthLine] },
  )

  return (
    <section ref={root} id={anchor} className="relative z-20 bg-[#111] text-white">
      <div className="min-h-svh bg-white px-5 pt-16 text-[#111] md:px-10 md:pt-20 lg:px-14">
        <p className="font-grotesk text-[13px] tracking-[0.02em] text-[#111]/45">{noteLabel}</p>
        <p className="mt-5 max-w-[38rem] font-grotesk text-[1.625rem] font-normal leading-[1.32] tracking-[-0.02em] md:max-w-[42rem] md:text-[2rem] md:leading-[1.3]">
          (1) <Marked text={note1} mark={note1Mark} /> (2) <Marked text={note2} mark={note2Mark} />{' '}
          (3) <Marked text={note3} mark={note3Mark} />
        </p>
      </div>

      {BANDS.map((band) => (
        <article
          key={band.id}
          data-fit-band={band.id}
          className="relative min-h-svh bg-[#111]"
        >
          <h2 className="pointer-events-none absolute top-[14%] left-0 z-10 max-w-[16ch] px-5 font-grotesk text-[clamp(2.4rem,8vw,7rem)] font-medium leading-[0.84] tracking-[-0.045em] uppercase md:px-10">
            <span className="relative inline-block">
              {titles[band.titleKey]}
              <RuptureScript className="absolute top-0 left-0 origin-left">
                {titles[band.titleKey]}
              </RuptureScript>
            </span>
          </h2>

          <div className="absolute inset-x-0 bottom-[6%] grid grid-cols-4 gap-[3px] px-[3px]">
            {[0, 1, 2, 3].map((col) => {
              const isFall = col === band.gap
              return (
                <div key={col} className="relative aspect-square overflow-visible">
                  {isFall ? (
                    <span
                      data-fit-fall
                      data-ratio-block
                      className="absolute inset-0 will-change-transform"
                      style={tilt(band.seed + col, 1.1)}
                    >
                      <span
                        data-rupture-off
                        className="absolute inset-0"
                        style={{ backgroundColor: band.color }}
                      />
                      <RuptureOn index={band.seed + col} />
                    </span>
                  ) : (
                    <span
                      data-ratio-block
                      className="absolute inset-0"
                      style={tilt(band.seed + col, 1.1)}
                    >
                      <span
                        data-rupture-off
                        className="absolute inset-0"
                        style={{ backgroundColor: band.color }}
                      />
                      <RuptureOn index={band.seed + col} />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </article>
      ))}

      <div
        data-fit-lid
        className="relative z-10 bg-[#111] px-5 pb-8 pt-[clamp(3.4rem,9vw,7.5rem)] md:px-10 md:pb-10"
      >
        <h2 className="relative max-w-[18ch] font-grotesk text-[clamp(2.6rem,8.5vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.045em] uppercase text-[#3a3a3a]">
          <span className="relative inline-block">
            {closer}
            <RuptureScript className="absolute top-0 left-0 origin-left">
              {closer}
            </RuptureScript>
          </span>
        </h2>
        <p className="mt-[clamp(2.6rem,7vw,5.5rem)]">
          <span className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase">
            <span aria-hidden="true" className="size-2 bg-white" />
            {brand}
          </span>
          <span className="mt-1 block text-[11px] tracking-[0.18em] uppercase opacity-50">{studio}</span>
        </p>
      </div>
    </section>
  )
}
