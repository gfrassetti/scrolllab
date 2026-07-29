import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultFigures = [
  {
    caption: 'Fig. 01 — Placeholder',
    img: 'https://picsum.photos/seed/edit-a/800/1000',
    speed: 0.85,
    className: 'col-span-7 md:col-span-4 md:col-start-1',
  },
  {
    caption: 'Fig. 02 — Placeholder',
    img: 'https://picsum.photos/seed/edit-b/800/600',
    speed: 1.2,
    className: 'col-span-5 col-start-8 mt-24 md:col-span-3 md:col-start-6 md:mt-48',
  },
  {
    caption: 'Fig. 03 — Placeholder',
    img: 'https://picsum.photos/seed/edit-c/800/1100',
    speed: 0.7,
    className: 'col-span-6 col-start-4 mt-16 md:col-span-4 md:col-start-9 md:-mt-16',
  },
  {
    caption: 'Fig. 04 — Placeholder',
    img: 'https://picsum.photos/seed/edit-d/900/700',
    speed: 1.1,
    className: 'col-span-8 col-start-2 mt-20 md:col-span-4 md:col-start-3 md:mt-40',
  },
]

/**
 * ParallaxEditorial — scattered editorial image grid where each
 * figure drifts vertically at its own speed while a huge outlined
 * word floats behind the composition.
 */
export default function ParallaxEditorial({
  chapter = '04',
  total = '06',
  label = 'Editorial drift',
  ghostWord = 'ARCHIVE',
  figures = defaultFigures,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.utils.toArray('[data-parallax]').forEach((el) => {
        const speed = parseFloat(el.dataset.parallax)
        gsap.to(el, {
          y: () => (1 - speed) * 320,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative overflow-hidden px-5 py-28 md:px-10 md:py-44">
      <div className="mb-14 flex items-baseline justify-between border-t border-ink/15 pt-4 md:mb-24">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
          Chapter {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <span
        aria-hidden="true"
        data-parallax="1.05"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[24vw] leading-none font-medium tracking-[-0.02em] text-transparent uppercase [-webkit-text-stroke:1px_rgba(22,20,18,0.18)]"
      >
        {ghostWord}
      </span>

      <div className="relative grid grid-cols-12 gap-4 md:gap-6">
        {figures.map((figure) => (
          <figure
            key={figure.caption}
            data-parallax={figure.speed}
            className={figure.className}
          >
            <img
              src={figure.img}
              alt=""
              loading="lazy"
              className="w-full object-cover"
            />
            <figcaption className="mt-2 text-[11px] uppercase tracking-[0.25em] text-ink/60">
              {figure.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
