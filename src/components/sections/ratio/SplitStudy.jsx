import { useRef } from 'react'
import identity from './assets/case-identity.jpg'
import editorial from './assets/case-editorial.jpg'

/**
 * SplitStudy — sticky spec ledger on the left, two full-height case
 * panels scrolling on the right. Handoff from the FourPlates white square.
 */
export default function SplitStudy({
  kicker = 'Print system',
  meta = 'Studio — 2026',
  index = '01',
  specLabel = 'format',
  specValue = 'A4 / A5',
  spec2Label = 'grid',
  spec2Value = '12 col',
  spec3Label = 'stock',
  spec3Value = 'cotton 600',
  spec4Label = 'finish',
  spec4Value = 'blind stamp',
  quote = 'The cube keeps the fold. Type sits on the floor until the ratio locks.',
  quoteBy = 'Press room',
  quoteRole = 'Shop floor',
  panel2Label = 'Spread',
  panel2Size = '1920 × 1080',
  img = identity,
  img2 = editorial,
  anchor = 'study',
}) {
  const root = useRef(null)
  const specs = [
    [specLabel, specValue],
    [spec2Label, spec2Value],
    [spec3Label, spec3Value],
    [spec4Label, spec4Value],
  ]

  return (
    <section ref={root} id={anchor} className="relative bg-ratio-paper text-ratio-ink">
      <div className="flex flex-col lg:flex-row">
        <aside className="lg:sticky lg:top-12 lg:h-[calc(100svh-3rem)] lg:w-[38%] lg:shrink-0">
          <div className="flex h-full flex-col bg-ratio-paper px-5 py-8 lg:border-r lg:border-ratio-ink lg:px-8 lg:py-10">
            <header className="flex items-start justify-between gap-4 border-b border-ratio-ink pb-4">
              <div>
                <p className="font-brico text-[12px] tracking-[0.04em]">
                  <span className="mr-2 text-ratio-mark">●</span>
                  {kicker}
                </p>
                <p className="mt-2 font-brico text-[12px] tracking-[0.04em] opacity-50">{meta}</p>
              </div>
              <span className="font-brico text-[12px] tracking-[0.08em] opacity-50">({index})</span>
            </header>
            <dl className="mt-1">
              {specs.map(([label, value], i) => (
                <div
                  key={`${label}-${i}`}
                  className="flex items-baseline justify-between gap-4 border-b border-ratio-ink py-3 font-brico text-[13px] tracking-[0.03em]"
                >
                  <dt className="opacity-45">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-ratio-field text-ratio-paper">
          <article className="flex min-h-[100svh] flex-col justify-center px-4 py-10 md:px-8 lg:px-10">
            <div className="grid min-h-[72svh] bg-ratio-paper text-ratio-ink md:grid-cols-2">
              <div className="flex flex-col justify-between gap-10 px-5 py-8 md:px-9 md:py-10">
                <p className="font-display max-w-[16ch] text-[clamp(1.4rem,2.5vw,2.2rem)] leading-[1.28] italic">
                  {quote}
                </p>
                <p className="flex items-center gap-3 font-brico text-[11px] tracking-[0.08em] uppercase">
                  <span aria-hidden="true" className="size-9 shrink-0 overflow-hidden rounded-full bg-ratio-field">
                    <img src={img} alt="" className="size-full object-cover grayscale opacity-80" />
                  </span>
                  <span>
                    <span className="block">{quoteBy}</span>
                    <span className="mt-0.5 block opacity-45">{quoteRole}</span>
                  </span>
                </p>
              </div>
              <figure className="min-h-[38vh] md:min-h-0">
                <img src={img} alt="" className="h-full w-full object-cover grayscale" />
              </figure>
            </div>
          </article>

          <article className="flex min-h-[100svh] flex-col px-4 py-10 md:px-8 lg:px-10">
            <p className="mb-3 flex items-baseline justify-between font-brico text-[11px] tracking-[0.14em] uppercase opacity-65">
              <span>{panel2Label}</span>
              <span>{panel2Size}</span>
            </p>
            <figure className="relative min-h-0 flex-1 overflow-hidden">
              <img src={img2} alt="" className="h-full min-h-[74svh] w-full object-cover grayscale" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent 0, transparent calc(8.333% - 1px), rgb(255 255 255 / 0.4) calc(8.333% - 1px), rgb(255 255 255 / 0.4) 8.333%)',
                }}
              />
            </figure>
          </article>
        </div>
      </div>
    </section>
  )
}
