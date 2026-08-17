import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { tilt } from './rupture'

const FRAME_SHAPE = [
  { width: '9.5vw', height: '52vh' },
  { width: '13vw', height: '66vh' },
  { width: '8.2vw', height: '44vh' },
  { width: '11.4vw', height: '70vh' },
  { width: '10vw', height: '56vh' },
  { width: '7.6vw', height: '48vh' },
]

/**
 * FooterLedger — drawer under the last FitStack band, then P5 horizontal.
 * GSAP pin + scrub so scroll-up rewinds. No extra runway (that was empty white).
 */
export default function FooterLedger({
  title = 'INDEX &\nNOTES',
  ghost = 'INDEX',
  hint = 'Scroll down ¬',
  brand = 'RATIO',
  studio = 'SCROLLLAB — 2026',
  row1Label = 'Built as',
  row1Value = 'A SCROLLLAB template',
  row2Label = 'Say hi',
  row2Value = 'hello@studio.test',
  row3Label = 'Prev. 01',
  row3Value = 'PRINT SYSTEM',
  row4Label = 'Prev. 02',
  row4Value = 'MOTION PLATES',
  spine1Title = 'Grid',
  spine1Author = 'M. Hale',
  spine2Title = 'Fold',
  spine2Author = 'R. Chen',
  spine3Title = 'Ratio',
  spine3Author = 'A. Voss',
  spine4Title = 'Rules',
  spine4Author = 'L. Park',
  spine5Title = 'Baseline',
  spine5Author = 'S. Okada',
  anchor = 'index',
}) {
  const root = useRef(null)
  const spines = [
    { title: spine1Title, author: spine1Author },
    { title: spine2Title, author: spine2Author },
    { title: spine3Title, author: spine3Author },
    { title: spine4Title, author: spine4Author },
    { title: spine5Title, author: spine5Author },
    { title: 'Title six', author: 'Name six' },
  ]
  const letters = Array.from(String(ghost).replace(/\s/g, '').toUpperCase())
  const items = []
  const count = Math.max(spines.length, letters.length)
  for (let i = 0; i < count; i += 1) {
    if (spines[i]) items.push({ kind: 'frame', i, ...spines[i] })
    if (letters[i]) items.push({ kind: 'letter', i, ch: letters[i] })
  }

  const rows = [
    [row1Label, row1Value],
    [row2Label, row2Value],
    [row3Label, row3Value],
    [row4Label, row4Value],
  ]

  useGSAP(
    () => {
      const stage = root.current?.querySelector('[data-ledger-pin]')
      const track = root.current?.querySelector('[data-ledger-track]')
      if (!stage || !track) return undefined

      gsap.set(track, { x: 0 })

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        stage.style.overflowX = 'auto'
        return undefined
      }

      const distance = () => Math.max(0, track.scrollWidth - stage.clientWidth)

      gsap.fromTo(
        track,
        { x: 0 },
        {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: () => `+=${Math.max(distance(), 1)}`,
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        },
      )
    },
    {
      scope: root,
      dependencies: [
        title,
        ghost,
        hint,
        spine1Title,
        spine1Author,
        spine2Title,
        spine2Author,
        spine3Title,
        spine3Author,
        spine4Title,
        spine4Author,
        spine5Title,
        spine5Author,
      ],
    },
  )

  return (
    <footer ref={root} id={anchor} className="relative z-0 bg-white text-[#111]">
      <div data-ledger-pin className="relative h-svh overflow-hidden">
        <header className="pointer-events-none absolute inset-x-0 top-12 z-20 flex items-start justify-between gap-6 px-5 pt-5 md:px-8 md:pt-6">
          <h2 className="max-w-[12ch] font-grotesk text-[clamp(3.2rem,9vw,8rem)] font-medium leading-[0.8] tracking-[-0.055em] whitespace-pre-line uppercase">
            {title}
          </h2>
          <p className="shrink-0 pt-1 text-[11px] tracking-[0.16em] uppercase">{hint}</p>
        </header>

        <div
          data-ledger-track
          className="absolute inset-y-0 left-0 flex h-svh w-max items-end gap-[1.1vw] pr-[12vw] pl-[min(8vw,4rem)] pb-6 will-change-transform"
        >
          {items.map((item) => {
            if (item.kind === 'letter') {
              return (
                <span
                  key={`ch-${item.i}-${item.ch}`}
                  aria-hidden="true"
                  className="mb-[-0.08em] shrink-0 font-grotesk text-[clamp(7.5rem,42vh,22rem)] leading-none font-medium text-transparent uppercase [-webkit-text-stroke:2px_#111]"
                >
                  {item.ch}
                </span>
              )
            }

            const shape = FRAME_SHAPE[item.i % FRAME_SHAPE.length]
            return (
              <article
                key={`fr-${item.i}`}
                data-ratio-block
                className="flex shrink-0 flex-col justify-between border border-[#111] bg-white px-2 py-2.5"
                style={{
                  width: shape.width,
                  height: shape.height,
                  minWidth: '4.5rem',
                  ...tilt(item.i + 4, 1.4),
                }}
              >
                <p className="text-[10px] leading-tight tracking-[0.12em] uppercase">{item.title}</p>
                <p className="text-[10px] leading-tight tracking-[0.12em] uppercase opacity-55">
                  {item.author}
                </p>
              </article>
            )
          })}

          <dl className="mb-2 ml-[4vw] flex h-[44vh] w-[min(42vw,22rem)] shrink-0 flex-col justify-end">
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
      </div>
    </footer>
  )
}
