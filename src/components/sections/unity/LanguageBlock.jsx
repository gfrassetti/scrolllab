import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import joyA from './assets/joy-a.png'
import joyB from './assets/joy-b.png'
import joyC from './assets/joy-c.png'

/**
 * LanguageBlock — solid type/image block.
 * Each row is one continuous line: image window + type, no mid-row voids.
 * Image windows are slightly taller than the type.
 */
export default function LanguageBlock({
  eyebrow = 'EYEBROW 3',
  line1 = 'LINE 1',
  line2 = 'LINE 2',
  line3 = 'LINE 3',
  note = 'NOTE 1',
  bg = '#c9b896',
  fg = '#0a0a0a',
  img1 = joyA,
  img2 = joyB,
  img3 = joyC,
  anchor = 'lang-a',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const fitRows = () => {
        root.current?.querySelectorAll('[data-lang-row]').forEach((row) => {
          const type = row.querySelector('[data-lang-type]')
          const win = row.querySelector('[data-lang-window]')
          if (!type || !win) return
          gsap.set(type, { clearProps: 'transform' })
          const rowW = row.clientWidth
          const gap = 12
          const avail = rowW - win.offsetWidth - gap
          const natural = type.scrollWidth
          if (avail > 0 && natural > 0) {
            const s = Math.min(1.75, Math.max(0.5, avail / natural))
            gsap.set(type, {
              transformOrigin:
                row.dataset.align === 'end' ? 'right center' : 'left center',
              scale: s,
            })
          }
        })
      }

      // Fit after fonts/layout; keep on resize.
      const onResize = () => fitRows()
      document.fonts?.ready?.then(() => fitRows())
      requestAnimationFrame(() => fitRows())
      window.addEventListener('resize', onResize)

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.utils.toArray('[data-lang-window]', root.current).forEach((win) => {
          const img = win.querySelector('img')
          if (!img) return
          gsap.fromTo(
            img,
            { yPercent: -22 },
            {
              yPercent: 22,
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
      }

      return () => window.removeEventListener('resize', onResize)
    },
    { scope: root },
  )

  const rowClass = 'flex w-full flex-nowrap items-center gap-3'
  const typeClass =
    'font-oswald text-[clamp(2.4rem,8.2vw,6.75rem)] leading-none font-semibold tracking-[-0.03em] uppercase whitespace-nowrap will-change-transform'
  const winClass =
    'relative h-[1.15em] w-[min(32%,17rem)] shrink-0 overflow-hidden [font-size:clamp(2.4rem,8.2vw,6.75rem)]'

  return (
    <section
      ref={root}
      id={anchor}
      className="relative overflow-hidden px-4 py-16 md:px-8 md:py-24"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div className="mx-auto w-full max-w-[68rem]">
        <p className="mb-8 text-[11px] tracking-[0.28em] uppercase opacity-70 md:mb-10">
          {eyebrow}
        </p>

        <div className="flex w-full flex-col gap-2 md:gap-2.5">
          <div data-lang-row data-align="start" className={rowClass}>
            <div data-lang-window className={winClass}>
              <img
                src={img1}
                alt=""
                loading="lazy"
                className="absolute inset-[-40%_0] h-[180%] w-full object-cover will-change-transform"
              />
            </div>
            <h2 data-lang-type className={typeClass}>
              {line1}
            </h2>
          </div>

          <div data-lang-row data-align="end" className={`${rowClass} justify-end`}>
            <h2 data-lang-type className={typeClass}>
              {line2}
            </h2>
            <div data-lang-window className={winClass}>
              <img
                src={img2}
                alt=""
                loading="lazy"
                className="absolute inset-[-40%_0] h-[180%] w-full object-cover will-change-transform"
              />
            </div>
          </div>

          <div data-lang-row data-align="start" className={rowClass}>
            <div data-lang-window className={winClass}>
              <img
                src={img3}
                alt=""
                loading="lazy"
                className="absolute inset-[-40%_0] h-[180%] w-full object-cover will-change-transform"
              />
            </div>
            <h2 data-lang-type className={typeClass}>
              {line3}
            </h2>
          </div>
        </div>

        <p className="mt-8 text-right text-[10px] tracking-[0.28em] uppercase opacity-55 md:mt-10">
          {note}
        </p>
      </div>
    </section>
  )
}
