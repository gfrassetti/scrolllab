import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { ex01, ex02, ex03, ex04, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultExhibits = [
  { code: 'EX-01', caption: 'Placeholder exhibit', img: ex01 },
  { code: 'EX-02', caption: 'Generic artifact', img: ex02 },
  { code: 'EX-03', caption: 'Untitled block', img: ex03 },
  { code: 'EX-04', caption: 'Working sample', img: ex04 },
]

/**
 * ExhibitGrid — hard-bordered image grid. Cells reveal with a
 * stagger; images sit in grayscale until hovered.
 */
export default function ExhibitGrid({
  unit = '03',
  total = '05',
  label = 'The exhibits',
  unitLabel = 'Unit',
  exhibits,
  bg,
  fg,
}) {
  const root = useRef(null)
  const rows =
    Array.isArray(exhibits) && exhibits.length
      ? exhibits.map((e, i) => ({
          ...e,
          img: e.img || defaultExhibits[i % defaultExhibits.length].img,
        }))
      : defaultExhibits

  useGSAP(
    () => {
      // Calma: cada pieza entra con un fundido en vez de abrirse con una máscara.
      if (prefersReducedMotion()) return calmReveal('[data-exhibit]', { y: 14, stagger: 0.08 })

      gsap.from('[data-exhibit]', {
        clipPath: 'inset(0 0 100% 0)',
        duration: 1,
        stagger: 0.12,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="px-5 py-20 md:px-8 md:py-32"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
        <p>
          {unitLabel} {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <div className="grid grid-cols-2 gap-[2px] border-2 border-carbon bg-carbon md:grid-cols-4">
        {rows.map((exhibit, i) => (
          <figure key={i} data-exhibit className="group bg-concrete">
            <div className="aspect-square overflow-hidden">
              {exhibit.img ? (
                <img
                  {...imgAttrs(exhibit.img, variants)}
                  sizes="(min-width: 768px) 25vw, 50vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                />
              ) : null}
            </div>
            <figcaption className="flex items-baseline justify-between gap-3 border-t-2 border-carbon px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
              <span className="whitespace-nowrap text-klein">{exhibit.code}</span>
              <span className="text-right">{exhibit.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
