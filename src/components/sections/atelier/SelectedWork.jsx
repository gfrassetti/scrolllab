import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const PROJECTS = [
  {
    title: 'Project 01',
    body: 'Lorem ipsum dolor sit amet — placeholder project description.',
    tag: 'Placeholder tag',
    overlay: 'Overlay text.',
    tone: 'from-[#1a2330] via-[#3d5168] to-[#c5b8a5]',
  },
  {
    title: 'Project 02',
    body: 'Lorem ipsum dolor sit amet — placeholder project description.',
    tag: 'Placeholder tag',
    overlay: 'Overlay text.',
    tone: 'from-[#2a2118] via-[#6b5344] to-[#e8d5c4]',
  },
  {
    title: 'Project 03',
    body: 'Lorem ipsum dolor sit amet — placeholder project description.',
    tag: 'Placeholder tag',
    overlay: 'Overlay text.',
    tone: 'from-[#121816] via-[#2f4a3c] to-[#b8d4c4]',
  },
  {
    title: 'Project 04',
    body: 'Lorem ipsum dolor sit amet — placeholder project description.',
    tag: 'Placeholder tag',
    overlay: 'Overlay text.',
    tone: 'from-[#1c1524] via-[#4a3a5c] to-[#d4c8e0]',
  },
]

/**
 * SelectedWork — horizontal work slider (vertical scroll drives x).
 * Each card rises from below with a fade and joins the track.
 */
export default function SelectedWork({
  title = 'YOUR WORK TITLE',
  cta = 'Your CTA →',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const track = root.current?.querySelector('[data-work-track]')
      const cards = gsap.utils.toArray('[data-work-card]', root.current)
      if (!track || cards.length === 0) return

      if (reduced) {
        gsap.set(cards, { opacity: 1, y: 0 })
        return
      }

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
      className="relative overflow-hidden bg-[#e8e8e6] text-[#111214]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex justify-between px-5 md:px-10"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-full w-px bg-black/6" />
        ))}
      </div>

      <div className="relative flex h-svh flex-col justify-between py-20 md:py-24">
        <div className="flex items-end justify-between gap-6 px-5 md:px-10">
          <h2 className="max-w-[14ch] text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.1] font-medium tracking-[-0.03em]">
            {title}
          </h2>
          <a
            href="#facts"
            className="shrink-0 text-[11px] tracking-[0.2em] uppercase underline underline-offset-4 decoration-black/30 hover:decoration-black"
          >
            {cta}
          </a>
        </div>

        <div className="relative mt-10 flex-1 overflow-hidden">
          <div
            data-work-track
            className="flex h-full items-center gap-5 px-5 will-change-transform md:gap-7 md:px-10"
          >
            {PROJECTS.map((project) => (
              <article
                key={project.title}
                data-work-card
                className="group relative w-[min(78vw,28rem)] shrink-0 will-change-transform md:w-[min(42vw,32rem)]"
              >
                <div
                  className={`relative aspect-[16/11] overflow-hidden rounded-2xl bg-gradient-to-br ${project.tone}`}
                >
                  <p className="absolute top-5 left-5 max-w-[28ch] text-[10px] tracking-[0.18em] text-white/80 uppercase md:text-[11px]">
                    {project.tag}
                  </p>
                  <p className="absolute bottom-6 left-5 font-brico text-[clamp(1.6rem,3.2vw,2.6rem)] leading-none font-semibold tracking-[-0.03em] text-white">
                    {project.overlay}
                  </p>
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-45"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 45%)',
                    }}
                  />
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium tracking-[-0.02em] md:text-xl">
                      {project.title}
                    </h3>
                    <p className="mt-1.5 max-w-[36ch] text-sm leading-relaxed text-black/55">
                      {project.body}
                    </p>
                  </div>
                  <a
                    href="#work"
                    className="shrink-0 pt-1 text-[10px] tracking-[0.18em] uppercase underline underline-offset-4 decoration-black/25 hover:decoration-black"
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
