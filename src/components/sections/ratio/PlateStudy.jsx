import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import Plate from './Plate'
import { tilt } from './rupture'
import identity from './assets/case-identity.jpg'
import editorial from './assets/case-editorial.jpg'

/**
 * PlateStudy — P1 pin + P2 zoom of the case + P3 crossfade notes.
 * One chapter of the four systems: construction drawing, then the work
 * scales in, then two steps and a note. Used four times with different props.
 */
export default function PlateStudy({
  index = '01',
  title = 'GRID',
  variant = 'column',
  specLabel = 'format',
  specValue = 'A4',
  spec2Label = 'ratio',
  spec2Value = '1.6',
  spec3Label = 'plates',
  spec3Value = '4',
  spec4Label = 'finish',
  spec4Value = 'fold',
  caseTitle = 'CASE 01',
  caseMeta = 'Studio — 2026',
  img = identity,
  img2 = editorial,
  step1Label = 'Draw',
  step1Body = 'Type sits on the floor. The cube keeps a square.',
  step2Label = 'Fold',
  step2Body = 'The slab grows with the last word, then the plates take over.',
  notes = '(1) Hold the fold. (2) Lock the ratio before the next chapter opens.',
  invert = false,
  anchor = 'plate-01',
}) {
  const root = useRef(null)
  const bg = invert ? '#111' : '#ffffff'
  const fg = invert ? '#ffffff' : '#111'

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.set('[data-case]', { scale: 0.22, autoAlpha: 0 })
      gsap.set('[data-study-copy]', { autoAlpha: 0, y: 24 })
      gsap.set('[data-study-notes]', { autoAlpha: 0, y: 18 })

      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=260%',
            pin: '[data-study-pin]',
            scrub: 0.5,
          },
        })

        tl.to('[data-case]', { autoAlpha: 1, scale: 1, ease: 'none' }, 0)
          .to('[data-plate-draw]', { opacity: 0.18, ease: 'none' }, 0)
          .to('[data-study-copy]', { autoAlpha: 1, y: 0, ease: 'none' }, 0.28)
          .to('[data-study-notes]', { autoAlpha: 1, y: 0, ease: 'none' }, 0.48)
          .to('[data-case]', { scale: 1.12, ease: 'none' }, 0.7)
          .to('[data-case-b]', { autoAlpha: 1, ease: 'none' }, 0.72)
      })

      mm.add('(max-width: 767px)', () => {
        gsap.set('[data-case], [data-study-copy], [data-study-notes], [data-case-b]', {
          autoAlpha: 1,
          y: 0,
          scale: 1,
        })
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id={anchor}
      className="relative"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div data-study-pin className="relative flex h-svh flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1">
          <div
            data-plate-draw
            className="absolute inset-3 text-current/30 md:inset-6"
          >
            <Plate variant={variant} />
          </div>

          <div
            data-case
            data-ratio-block
            className="absolute top-[12%] right-[8%] z-10 w-[min(52%,34rem)] overflow-hidden border border-current will-change-transform"
            style={tilt(Number(index) || 1, 1.1)}
          >
            <img src={img} alt="" className="aspect-[16/9] w-full object-cover" />
            <img
              data-case-b
              src={img2}
              alt=""
              className="absolute inset-0 aspect-[16/9] w-full object-cover opacity-0"
            />
          </div>

          <aside
            data-study-copy
            className="absolute bottom-[28%] left-4 z-10 w-[min(42%,22rem)] text-[11px] tracking-[0.12em] uppercase md:left-8"
          >
            <p className="mb-3 flex items-center justify-between border-b border-current/30 pb-2">
              <span>● {caseTitle}</span>
              <span>({index})</span>
            </p>
            <p className="mb-3 opacity-60">{caseMeta}</p>
            <dl className="space-y-1 border-t border-current/30 pt-2">
              {[
                [specLabel, specValue],
                [spec2Label, spec2Value],
                [spec3Label, spec3Value],
                [spec4Label, spec4Value],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-current/20 py-1">
                  <dt className="opacity-50">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <div className="z-10 border-t border-current px-4 py-3 md:px-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-anton text-[clamp(2.2rem,8vw,5.5rem)] leading-[0.8] uppercase">
              {title}
            </h2>
            <span className="font-anton text-[clamp(2.2rem,8vw,5.5rem)] leading-[0.8]">
              {index}
            </span>
          </div>
          <div data-study-notes className="grid gap-4 md:grid-cols-2">
            <div className="text-[11px] tracking-[0.14em] uppercase">
              <p className="flex justify-between border-b border-current/30 py-1.5">
                <span>(Step 1) {step1Label}</span>
                <span className="opacity-55">{step1Body}</span>
              </p>
              <p className="flex justify-between border-b border-current/30 py-1.5">
                <span>(Step 2) {step2Label}</span>
                <span className="opacity-55">{step2Body}</span>
              </p>
            </div>
            <p className="max-w-[62ch] text-[12px] leading-snug md:text-[15px]">{notes}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
