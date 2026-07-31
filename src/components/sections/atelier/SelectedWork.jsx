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
]

/**
 * SelectedWork — light pinned-title / scrolling project column
 * (continuation after VisionShutter wash).
 */
export default function SelectedWork({
  title = 'YOUR WORK TITLE',
  cta = 'Your CTA →',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-work-card]', {
        y: 56,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 65%',
        },
      })
    },
    { scope: root },
  )

  return (
    <section
      id="work"
      ref={root}
      className="relative bg-[#e8e8e6] text-[#111214]"
    >
      {/* Grid guides */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex justify-between px-5 md:px-10"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-full w-px bg-black/6" />
        ))}
      </div>

      <div className="relative mx-auto grid max-w-[1400px] gap-12 px-5 py-20 md:grid-cols-12 md:gap-8 md:px-10 md:py-28">
        <aside className="md:col-span-4 md:self-start md:sticky md:top-28">
          <h2 className="max-w-[12ch] text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.1] font-medium tracking-[-0.03em]">
            {title}
          </h2>
          <a
            href="#facts"
            className="mt-8 inline-block text-[11px] tracking-[0.2em] uppercase underline underline-offset-4 decoration-black/30 hover:decoration-black"
          >
            {cta}
          </a>
        </aside>

        <div className="flex flex-col gap-16 md:col-span-8 md:gap-24">
          {PROJECTS.map((project) => (
            <article key={project.title} data-work-card className="group">
              <div
                className={`relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br ${project.tone}`}
              >
                <p className="absolute top-5 left-5 max-w-[28ch] text-[10px] tracking-[0.18em] text-white/80 uppercase md:text-[11px]">
                  {project.tag}
                </p>
                <p className="absolute bottom-6 left-5 font-brico text-[clamp(1.8rem,4vw,3rem)] leading-none font-semibold tracking-[-0.03em] text-white">
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
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-medium tracking-[-0.02em] md:text-2xl">
                    {project.title}
                  </h3>
                  <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-black/55">
                    {project.body}
                  </p>
                </div>
                <a
                  href="#work"
                  className="shrink-0 text-[11px] tracking-[0.18em] uppercase underline underline-offset-4 decoration-black/25 hover:decoration-black"
                >
                  Explore project →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
