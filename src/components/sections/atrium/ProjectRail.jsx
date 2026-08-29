import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import civic from './assets/civic.jpg'
import tower from './assets/tower.jpg'
import courtyard from './assets/courtyard.jpg'
import gallery from './assets/gallery.jpg'
import heroHouse from './assets/hero-house.jpg'
import interior from './assets/interior.jpg'

/**
 * Cada obra ocupa un ancho y una banda distintos: la pagina se lee como un
 * indice suelto, no como una grilla. `x` / `w` van en % del contenedor,
 * `gap` en svh, y `speed` gradua el parallax de cada foto.
 */
const defaultWorks = [
  { title: 'Placeholder Project 01', meta: '000 m²', img: civic, x: 54, w: 46, ratio: '16 / 7', gap: 0, speed: 1 },
  { title: 'Placeholder Project 02', meta: '000 m²', img: tower, x: 34, w: 38, ratio: '4 / 3', gap: 6, speed: 1.35 },
  { title: 'Placeholder Project 03', meta: '000 m²', img: courtyard, x: 0, w: 25, ratio: '3 / 4', gap: -14, speed: 0.75 },
  { title: 'Placeholder Project 04', meta: '000 m²', img: gallery, x: 46, w: 54, ratio: '16 / 9', gap: 4, speed: 1.15 },
  { title: 'Placeholder Project 05', meta: '000 m²', img: heroHouse, x: 8, w: 32, ratio: '5 / 4', gap: -10, speed: 0.9 },
  { title: 'Placeholder Project 06', meta: '000 m²', img: interior, x: 52, w: 44, ratio: '4 / 3', gap: 2, speed: 1.3 },
]

/**
 * ProjectRail — work index. Photographs of different widths land on their
 * own bands; each one drifts inside its crop (P2) and carries a caption
 * row: name on the left, area on the right.
 */
export default function ProjectRail({
  kicker = '(6)',
  title = 'Selected Projects',
  works = defaultWorks,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-work-head]', {
        yPercent: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 80%', once: true },
      })

      gsap.utils.toArray('[data-work-item]').forEach((item) => {
        const media = item.querySelector('[data-work-media]')
        const speed = Number(item.dataset.speed) || 1

        gsap.fromTo(
          media,
          { yPercent: -9 * speed },
          {
            yPercent: 9 * speed,
            ease: 'none',
            scrollTrigger: {
              trigger: item,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.5,
            },
          },
        )

        gsap.from(item, {
          opacity: 0,
          y: 40,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: item, start: 'top 88%', once: true },
        })
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="work"
      className="bg-atrium-paper px-5 pt-[8svh] pb-[24svh] text-atrium-ink md:px-10 md:pb-[30svh]"
    >
      <h2 data-work-head className="atrium-mid mb-[14svh] flex items-start gap-3">
        <span>{title}</span>
        {kicker ? (
          <span className="atrium-note font-display text-atrium-ink/65">{kicker}</span>
        ) : null}
      </h2>

      <div>
        {works.map((work) => (
          <figure
            key={work.title}
            data-work-item
            data-speed={work.speed}
            style={{
              '--work-x': `${work.x}%`,
              '--work-w': `${work.w}%`,
              '--work-gap': `${work.gap}svh`,
            }}
            className="mt-[8svh] ml-0 w-full first:mt-0 md:mt-[calc(9svh+var(--work-gap))] md:ml-[var(--work-x)] md:w-[var(--work-w)]"
          >
            <div
              className="relative overflow-hidden"
              style={{ aspectRatio: work.ratio }}
            >
              <img
                data-work-media
                src={work.img}
                alt=""
                loading="lazy"
                className="absolute top-1/2 left-0 h-[122%] w-full max-w-none -translate-y-1/2 object-cover will-change-transform"
              />
            </div>
            <figcaption className="atrium-note mt-3 flex items-baseline justify-between gap-6">
              <span>{work.title}</span>
              <span className="font-display text-atrium-ink/65">{work.meta}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
