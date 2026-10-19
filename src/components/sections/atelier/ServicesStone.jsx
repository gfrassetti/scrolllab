import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { areaInterior, areaHomes, areaLandscape, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultAreas = [
  {
    title: 'Interior Atmosphere',
    body: 'Rooms planned around light and the way a household moves: joinery drawn to fit, materials chosen to age well, nothing added that does not earn its place.',
    img: areaInterior,
    href: '#projects',
  },
  {
    title: 'Contemporary Homes',
    body: 'New houses and careful extensions in brick, timber and stone. Each starts from the plot, the orientation and a long conversation about how you live.',
    img: areaHomes,
    href: '#projects',
  },
  {
    title: 'Landscape Integration',
    body: 'Terraces, planting and paths designed together with the building, so the house sits in its garden instead of on top of it.',
    img: areaLandscape,
    href: '#projects',
  },
]

/**
 * ServicesStone — "areas of expertise": a ruled list of three rows. Each row is
 * a title, a short paragraph, a photograph and a huge pale numeral. On a mouse
 * device the photograph slides open on hover; on touch it is always visible.
 */
export default function ServicesStone({
  eyebrow = 'What we do',
  title = 'Our areas of expertise',
  areas = defaultAreas,
  linkLabel = 'See related projects',
  bg,
  fg,
}) {
  const root = useRef(null)
  const items = (Array.isArray(areas) && areas.length ? areas : defaultAreas).slice(0, 6)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-area-row] > *', { y: 14, duration: 0.8 })
      const rows = gsap.utils.toArray('[data-area-row]')
      // Cada fila queda pegada arriba y la siguiente entra por encima: la de atrás
      // se apaga (velo) y se hunde un poco, más lento que el scroll.
      rows.slice(0, -1).forEach((row, i) => {
        const next = rows[i + 1]
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true },
        })
        tl.to(row.querySelector('[data-area-veil]'), { opacity: 0.32 }, 0)
        tl.to(row.querySelector('[data-area-inner]'), { yPercent: -7, scale: 0.97 }, 0)
      })
      return undefined
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="expertise"
      data-tone="light"
      className=""
      style={{ backgroundColor: bg || '#ffffff', color: fg || '#111111' }}
    >
      <div className="px-5 pt-24 pb-14 md:px-8 md:pt-36 md:pb-20">
        <header className="grid gap-4 md:grid-cols-12">
          <p className="text-sm font-medium md:col-span-2">{eyebrow}</p>
          <h2 className="text-[clamp(2.2rem,6vw,5.4rem)] leading-[0.98] font-medium tracking-[-0.045em] md:col-span-10">
            {title}
          </h2>
        </header>

      </div>

      <ul data-area-list>
        {items.map((a, i) => (
          <li
            key={`${a.title}-${i}`}
            data-area-row
            className="group relative sticky top-0 h-[92svh] min-h-[560px] overflow-clip border-t border-current/15 calm:static calm:h-auto"
            style={{ backgroundColor: bg || '#ffffff' }}
          >
            <a
              href={a.href || '#projects'}
              data-area-inner
              aria-label={`${a.title} — ${linkLabel}`}
              className="relative grid h-full origin-top grid-rows-[auto_1fr] gap-x-8 px-5 py-8 will-change-transform md:grid-cols-2 md:grid-rows-1 md:px-8 md:py-12"
            >
              <div className="flex flex-col justify-between gap-6 md:h-full">
                <h3 className="text-[clamp(1.9rem,3.4vw,3.4rem)] leading-[1.02] font-medium tracking-[-0.04em]">
                  {a.title}
                </h3>
                <span
                  aria-hidden="true"
                  className="hidden text-[clamp(9rem,20vw,19rem)] leading-[0.72] font-medium tracking-[-0.06em] opacity-[0.1] md:block"
                >
                  {i + 1}
                </span>
              </div>
              <div className="flex min-h-0 flex-col gap-6 md:gap-10">
                <p className="max-w-[34rem] text-[clamp(1.05rem,1.7vw,1.6rem)] leading-[1.22] tracking-[-0.02em]">
                  {a.body}
                </p>
                <div className="relative min-h-0 flex-1 overflow-hidden md:max-w-[62%]">
                  <img
                    {...imgAttrs(a.img, variants)}
                    sizes="(min-width: 768px) 40vw, 100vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                  />
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <span className="tpl-link">{linkLabel}</span>
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </a>
            <div
              data-area-veil
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0"
              style={{ backgroundColor: fg || '#111111' }}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
