import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { editA, editB, editC, editD, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultFigures = [
  {
    caption: 'Fig. 01 — Placeholder',
    img: editA,
    speed: 0.85,
    className: 'col-span-7 md:col-span-4 md:col-start-1',
  },
  {
    caption: 'Fig. 02 — Placeholder',
    img: editB,
    speed: 1.2,
    className: 'col-span-5 col-start-8 mt-24 md:col-span-3 md:col-start-6 md:mt-48',
  },
  {
    caption: 'Fig. 03 — Placeholder',
    img: editC,
    speed: 0.7,
    className: 'col-span-6 col-start-4 mt-16 md:col-span-4 md:col-start-9 md:-mt-16',
  },
  {
    caption: 'Fig. 04 — Placeholder',
    img: editD,
    speed: 1.1,
    className: 'col-span-8 col-start-2 mt-20 md:col-span-4 md:col-start-3 md:mt-40',
  },
]

/**
 * ParallaxEditorial — scattered editorial image grid where each
 * figure drifts vertically at its own speed while a huge outlined
 * word floats behind the composition.
 *
 * Calma: cada figura queda en su lugar (sin deriva) y entra con un fundido.
 *
 * Editable: `figures` ({ caption, img }) — position and drift speed come
 * from the four slots above, by order, so any photos keep the composition.
 */
export default function ParallaxEditorial({
  chapter = '04',
  total = '06',
  label = 'Editorial drift',
  ghostWord = 'ARCHIVE',
  figures,
  chapterLabel = 'Chapter',
  bg,
  fg,
}) {
  const root = useRef(null)
  const valid = figures?.filter((f) => f?.img || f?.caption)
  const list = valid?.length
    ? valid.slice(0, defaultFigures.length).map((f, i) => ({ ...defaultFigures[i], caption: f.caption || '', img: f.img || '' }))
    : defaultFigures

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('figure', { y: 18, stagger: 0.12 })

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
    { scope: root, dependencies: [list.length], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      className="relative overflow-hidden px-5 py-28 md:px-10 md:py-44"
      style={{ background: bg || undefined, color: fg || undefined }}
    >
      <div
        className="mb-14 flex items-baseline justify-between border-t pt-4 md:mb-24"
        style={{ borderColor: 'color-mix(in srgb, currentColor 15%, transparent)' }}
      >
        <p className="text-[11px] uppercase tracking-[0.25em] opacity-60 md:text-xs">
          {chapterLabel} {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <span
        aria-hidden="true"
        data-parallax="1.05"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[24vw] leading-none font-medium tracking-[-0.02em] text-transparent uppercase"
        style={{ WebkitTextStroke: '1px color-mix(in srgb, currentColor 18%, transparent)' }}
      >
        {ghostWord}
      </span>

      <div className="relative grid grid-cols-12 gap-4 md:gap-6">
        {list.map((figure, i) => (
          <figure
            key={i}
            data-parallax={figure.speed}
            className={figure.className}
          >
            {figure.img ? (
              <img
                {...imgAttrs(figure.img, variants)}
                sizes="(min-width: 768px) 34vw, 66vw"
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="aspect-[4/5] w-full"
                style={{ background: 'color-mix(in srgb, currentColor 8%, transparent)' }}
              />
            )}
            <figcaption className="mt-2 text-[11px] uppercase tracking-[0.25em] opacity-60">
              {figure.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
