import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { work1, work2, work3, work4, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const PROJECTS = [
  {
    title: 'Project 01',
    body: 'Lorem ipsum dolor sit amet — placeholder project description.',
    tag: 'Placeholder tag',
    overlay: 'Overlay text.',
    tone: 'from-[#1a2330] via-[#3d5168] to-[#c5b8a5]',
    img: work1,
  },
  {
    title: 'Project 02',
    body: 'Lorem ipsum dolor sit amet — placeholder project description.',
    tag: 'Placeholder tag',
    overlay: 'Overlay text.',
    tone: 'from-[#2a2118] via-[#6b5344] to-[#e8d5c4]',
    img: work2,
  },
  {
    title: 'Project 03',
    body: 'Lorem ipsum dolor sit amet — placeholder project description.',
    tag: 'Placeholder tag',
    overlay: 'Overlay text.',
    tone: 'from-[#121816] via-[#2f4a3c] to-[#b8d4c4]',
    img: work3,
  },
  {
    title: 'Project 04',
    body: 'Lorem ipsum dolor sit amet — placeholder project description.',
    tag: 'Placeholder tag',
    overlay: 'Overlay text.',
    tone: 'from-[#1c1524] via-[#4a3a5c] to-[#d4c8e0]',
    img: work4,
  },
]

/**
 * SelectedWork — horizontal work slider (vertical scroll drives x).
 * Each card rises from below with a fade and joins the track.
 */
export default function SelectedWork({
  title = 'YOUR WORK TITLE',
  cta = 'Your CTA →',
  bg,
  fg,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const track = root.current?.querySelector('[data-work-track]')
      const cards = gsap.utils.toArray('[data-work-card]', root.current)
      if (!track || cards.length === 0) return

      // Calma: sin pin ni recorrido atado al scroll. Las tarjetas quedan en una
      // fila que se desliza con el dedo (CSS `calm:`); la fila entera entra con un
      // fundido (las tarjetas de afuera no esperan a un swipe para aparecer).
      if (prefersReducedMotion()) return calmReveal(track, { y: 16, duration: 0.9 })

      gsap.set(cards, { yPercent: 55, opacity: 0 })

      const getShift = () => {
        const overflow = track.scrollWidth - window.innerWidth
        return Math.max(overflow, 0)
      }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${Math.max(cards.length, 1) * 95}%`,
          pin: true,
          scrub: 0.65,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      // Intro: first card rises into place
      tl.to(
        cards[0],
        { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power2.out' },
        0,
      )
      tl.to({}, { duration: 0.2 })

      for (let i = 1; i < cards.length; i += 1) {
        const label = `card-${i}`
        // Next card rises from below into the strip
        tl.to(
          cards[i],
          { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
          label,
        )
        // Track shifts left so the new slide joins the horizontal slider
        tl.to(
          track,
          {
            x: () => -getShift() * (i / (cards.length - 1)),
            duration: 0.55,
            ease: 'power1.inOut',
          },
          label,
        )
        tl.to({}, { duration: 0.18 })
      }

      // Final hold / nudge to full width
      tl.to(
        track,
        { x: () => -getShift(), duration: 0.35, ease: 'power1.out' },
        '+=0.05',
      )
    },
    { scope: root },
  )

  return (
    <section
      id="work"
      ref={root}
      className="relative overflow-hidden bg-(--sec-bg) text-current"
      style={{
        '--sec-bg': bg || '#e8e8e6',
        color: fg || '#111214',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex justify-between px-5 md:px-10"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-full w-px bg-current/6" />
        ))}
      </div>

      <div className="relative flex h-svh flex-col justify-between pt-20 pb-10 md:pt-24 md:pb-16">
        <div className="flex items-end justify-between gap-6 px-5 md:px-10">
          <h2 className="max-w-[14ch] text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.1] font-medium tracking-[-0.03em]">
            {title}
          </h2>
          <a
            href="#facts"
            className="tpl-hit relative shrink-0 text-[11px] tracking-[0.2em] uppercase underline underline-offset-4 decoration-black/30 transition-[text-decoration-color] duration-300 hover:decoration-black"
          >
            {cta}
          </a>
        </div>

        <div className="relative mt-10 flex-1 overflow-hidden calm:snap-x calm:snap-mandatory calm:overflow-x-auto calm:overflow-y-hidden calm:scroll-px-5 calm:[scrollbar-width:none] calm:md:scroll-px-10 calm:[&::-webkit-scrollbar]:hidden">
          <div
            data-work-track
            className="flex h-full items-center gap-5 px-5 will-change-transform md:gap-7 md:px-10 calm:w-max"
          >
            {PROJECTS.map((project) => (
              <article
                key={project.title}
                data-work-card
                className="group relative w-[min(78vw,28rem)] shrink-0 will-change-transform md:w-[min(42vw,32rem)] calm:snap-start"
              >
                <div
                  className={`relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br ${project.tone}`}
                >
                  <img
                    {...imgAttrs(project.img, variants)}
                    sizes="(min-width: 768px) min(42vw, 32rem), min(78vw, 28rem)"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <p className="absolute top-5 left-5 z-10 max-w-[28ch] text-[11px] tracking-[0.18em] text-white/80 uppercase">
                    {project.tag}
                  </p>
                  <p className="absolute bottom-6 left-5 z-10 font-brico text-[clamp(1.6rem,3.2vw,2.6rem)] leading-none font-semibold tracking-[-0.03em] text-white">
                    {project.overlay}
                  </p>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium tracking-[-0.02em] md:text-xl">
                      {project.title}
                    </h3>
                    <p className="mt-1.5 max-w-[36ch] text-sm leading-relaxed text-current/55">
                      {project.body}
                    </p>
                  </div>
                  <a
                    href="#work"
                    className="tpl-hit relative shrink-0 pt-1 text-[11px] tracking-[0.18em] uppercase underline underline-offset-4 decoration-black/25 transition-[text-decoration-color] duration-300 hover:decoration-black"
                  >
                    Explore →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
