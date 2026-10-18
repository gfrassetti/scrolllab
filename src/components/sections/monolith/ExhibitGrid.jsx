import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { ex01, ex02, ex03, ex04, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'
import { themeVars } from '../../../lib/themeVars'

const defaultExhibits = [
  { code: 'EX-01', caption: 'Plinth with a Klein interior', img: ex01 },
  { code: 'EX-02', caption: 'Plate stack, raw steel', img: ex02 },
  { code: 'EX-03', caption: 'Column, cast in one pour', img: ex03 },
  { code: 'EX-04', caption: 'Frame, anodised aluminium', img: ex04 },
]

/**
 * ExhibitGrid — hard-bordered image grid. Cells reveal with a
 * stagger; images sit in grayscale until hovered.
 */
export default function ExhibitGrid({
  unit = '03',
  total = '05',
  label = 'Selected works',
  unitLabel = 'Unit',
  exhibits,
  /** Ancla de la sección: el nav apunta acá. */
  id = 'works',
  bg,
  fg,
  accent,
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

      // Las piezas se colocan como bloques en obra: caen a su celda una por una
      // y la foto se destapa de abajo hacia arriba.
      const cells = gsap.utils.toArray('[data-exhibit]', root.current)
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } })
        .from(cells, {
          yPercent: -35,
          autoAlpha: 0,
          duration: 0.7,
          stagger: { each: 0.1, grid: 'auto', from: 'start' },
          ease: 'power4.out',
        })
        .from(
          gsap.utils.toArray('[data-exhibit-media]', root.current),
          { clipPath: 'inset(100% 0 0 0)', duration: 0.9, stagger: 0.1, ease: 'power4.inOut' },
          0.15,
        )

      // La pieza que pasa por el medio de la pantalla toma color (en el teléfono no hay hover).
      const lit = cells.map((cell) =>
        ScrollTrigger.create({ trigger: cell, start: 'top 62%', end: 'bottom 38%', toggleClass: 'is-lit' }),
      )
      return () => lit.forEach((t) => t.kill())
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id={id}
      className="px-5 py-20 md:px-8 md:py-32"
      style={{ backgroundColor: bg || undefined, color: fg || undefined, ...themeVars({ carbon: fg, klein: accent, concrete: bg }) }}
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
            <div data-exhibit-media className="aspect-square overflow-hidden">
              {exhibit.img ? (
                <img
                  {...imgAttrs(exhibit.img, variants)}
                  sizes="(min-width: 768px) 25vw, 50vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0 group-[.is-lit]:grayscale-0"
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
