import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { tilt } from './rupture'
import identity from './assets/case-identity.jpg'
import editorial from './assets/case-editorial.jpg'
import packaging from './assets/case-packaging.jpg'
import motion from './assets/case-motion.jpg'
import poster from './assets/detail-poster.jpg'

/**
 * FooterLedger — P6 parallax spines + outlined display word.
 * Closing credits: giant stroke type, five leaning plates, a hairline ledger.
 */
export default function FooterLedger({
  title = 'NOTES & CREDITS',
  ghost = 'NOTES',
  hint = 'Scroll down ¬',
  brand = 'RATIO',
  studio = 'SCROLLLAB — 2026',
  row1Label = 'Built as',
  row1Value = 'A SCROLLLAB template',
  row2Label = 'Say hi',
  row2Value = 'hello@studio.test',
  row3Label = 'Prev. 01',
  row3Value = 'UNITY',
  row4Label = 'Prev. 02',
  row4Value = 'ATELIER',
  spine1Title = 'TITLE 1',
  spine1Author = 'Author 1',
  spine2Title = 'TITLE 2',
  spine2Author = 'Author 2',
  spine3Title = 'TITLE 3',
  spine3Author = 'Author 3',
  spine4Title = 'TITLE 4',
  spine4Author = 'Author 4',
  spine5Title = 'TITLE 5',
  spine5Author = 'Author 5',
}) {
  const root = useRef(null)
  const spines = [
    { title: spine1Title, author: spine1Author, img: identity },
    { title: spine2Title, author: spine2Author, img: editorial },
    { title: spine3Title, author: spine3Author, img: packaging },
    { title: spine4Title, author: spine4Author, img: motion },
    { title: spine5Title, author: spine5Author, img: poster },
  ]

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.utils.toArray('[data-spine]', root.current).forEach((el, i) => {
        gsap.fromTo(
          el,
          { yPercent: i % 2 === 0 ? 18 : -14, rotate: i === 2 ? 8 : 0 },
          {
            yPercent: i % 2 === 0 ? -16 : 12,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        )
      })

      gsap.fromTo(
        '[data-ghost]',
        { yPercent: 12 },
        {
          yPercent: -18,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
    },
    { scope: root },
  )

  const rows = [
    [row1Label, row1Value],
    [row2Label, row2Value],
    [row3Label, row3Value],
    [row4Label, row4Value],
  ]

  return (
    <footer
      ref={root}
      id="notes"
      className="relative overflow-hidden bg-[#ebe6dc] text-[#111]"
    >
      <div className="flex items-end justify-between border-b border-[#111] px-4 pt-24 pb-4 md:px-8 md:pt-32">
        <h2 className="font-anton text-[clamp(2.2rem,7vw,5rem)] leading-[0.8] uppercase">
          {title}
        </h2>
        <p className="text-[10px] tracking-[0.2em] uppercase opacity-50">{hint}</p>
      </div>

      <div className="relative min-h-[70vh] px-4 py-10 md:px-8">
        <p
          data-ghost
          aria-hidden="true"
          className="pointer-events-none absolute top-8 left-0 font-anton text-[clamp(6rem,22vw,18rem)] leading-none text-transparent uppercase [-webkit-text-stroke:1px_#111]"
        >
          {ghost}
        </p>

        <div className="relative z-10 mt-[18vh] flex items-end justify-between gap-3">
          {spines.map((spine, i) => (
            <article
              key={spine.title}
              data-spine
              data-ratio-block
              className="flex w-[18%] flex-col border border-[#111] bg-[#ebe6dc] will-change-transform"
              style={{
                minHeight: `${220 + (i % 3) * 40}px`,
                ...tilt(i + 2, 1.8),
              }}
            >
              <p className="px-2 pt-2 text-[9px] tracking-[0.14em] uppercase">
                {spine.title}
              </p>
              <div className="mx-2 my-2 min-h-0 flex-1 overflow-hidden">
                <img
                  src={spine.img}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="px-2 pb-2 text-[9px] tracking-[0.14em] uppercase opacity-55">
                {spine.author}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-6 border-t border-[#111] px-4 py-8 md:grid-cols-2 md:px-8">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase">
            <span className="size-2 bg-[#111]" />
            {brand}
          </p>
          <p className="text-[11px] tracking-[0.18em] uppercase opacity-50">{studio}</p>
        </div>
        <dl>
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex items-baseline justify-between gap-4 border-b border-[#111]/30 py-2 text-[11px] tracking-[0.14em] uppercase"
            >
              <dt className="opacity-50">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </footer>
  )
}
