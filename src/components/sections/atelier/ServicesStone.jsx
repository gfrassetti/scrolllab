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
      if (prefersReducedMotion()) return calmReveal('[data-area-row]', { y: 14, duration: 0.8 })
      gsap.from('[data-area-row]', {
        autoAlpha: 0,
        y: 36,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '[data-area-list]', start: 'top 80%' },
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
      className="px-5 py-24 md:px-8 md:py-36"
      style={{ backgroundColor: bg || '#ffffff', color: fg || '#111111' }}
    >
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-14 grid gap-4 md:mb-24 md:grid-cols-12">
          <p className="text-sm font-medium md:col-span-2">{eyebrow}</p>
          <h2 className="text-[clamp(2.2rem,6vw,5.4rem)] leading-[0.98] font-medium tracking-[-0.045em] md:col-span-10">
            {title}
          </h2>
        </header>

        <ul data-area-list className="border-t border-current/20">
          {items.map((a, i) => (
            <li key={`${a.title}-${i}`} data-area-row className="group border-b border-current/20">
              <a
                href={a.href || '#projects'}
                className="relative grid items-start gap-6 py-8 md:grid-cols-12 md:gap-8 md:py-12"
                aria-label={`${a.title} — ${linkLabel}`}
              >
                <span className="text-sm font-medium tabular-nums md:col-span-1">{String(i + 1).padStart(2, '0')}</span>
                <div className="md:col-span-5">
                  <h3 className="text-[clamp(1.7rem,3.2vw,3rem)] leading-[1.02] font-medium tracking-[-0.04em]">
                    {a.title}
                  </h3>
                  <p className="mt-5 max-w-[32rem] text-base leading-snug opacity-70 md:text-[1.05rem]">{a.body}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                    <span className="tpl-link">{linkLabel}</span>
                    <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
                <div className="overflow-hidden md:col-span-3 md:aspect-[4/5] md:max-h-[26rem]">
                  <img
                    {...imgAttrs(a.img, variants)}
                    sizes="(min-width: 768px) 25vw, 100vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/2] h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] md:aspect-auto"
                  />
                </div>
                <span
                  aria-hidden="true"
                  className="hidden self-end text-right text-[clamp(5rem,13vw,12rem)] leading-[0.8] font-medium tracking-[-0.06em] opacity-[0.1] md:col-span-3 md:block"
                >
                  {i + 1}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
