import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import motion01 from './assets/motion-01.webp'
import material01 from './assets/material-01.webp'

const defaultWorks = [
  { index: '01', title: 'Nightline', category: 'Brand film', year: '2026', img: motion01 },
  { index: '02', title: 'Undertow', category: 'Sound design', year: '2025', img: material01 },
  { index: '03', title: 'Halftone', category: 'Title sequence', year: '2025', img: motion01 },
  { index: '04', title: 'Static Bloom', category: 'Sonic identity', year: '2024', img: material01 },
]

/**
 * SelectedWorkIndex — index-style list, cursor-trailing preview swaps per
 * hovered row. Same idiom as nocturne/WorkIndex.jsx, restyled for SIGNAL;
 * placed where Dolsten's own featured-work section sits (right after the
 * hero). Only 2 real photos exist today (Higgsfield credits are at zero),
 * so they repeat across rows — see docs/reference-analysis/signal.md.
 */
export default function SelectedWorkIndex({
  eyebrow = 'Selected work',
  works = defaultWorks,
}) {
  const root = useRef(null)
  const floatImg = useRef(null)
  const quick = useRef({ x: null, y: null })

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-work-row]', {
        y: 32,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.07,
        scrollTrigger: { trigger: root.current, start: 'top 78%', once: true },
      })

      quick.current.x = gsap.quickTo(floatImg.current, 'x', { duration: 0.45, ease: 'power3' })
      quick.current.y = gsap.quickTo(floatImg.current, 'y', { duration: 0.45, ease: 'power3' })
    },
    { scope: root },
  )

  const handleMove = (e) => {
    quick.current.x?.(e.clientX)
    quick.current.y?.(e.clientY)
  }
  const showPreview = (img) => {
    if (!floatImg.current) return
    floatImg.current.src = img
    gsap.to(floatImg.current, { autoAlpha: 1, scale: 1, duration: 0.35 })
  }
  const hidePreview = () => {
    if (!floatImg.current) return
    gsap.to(floatImg.current, { autoAlpha: 0, scale: 0.9, duration: 0.3 })
  }

  return (
    <section ref={root} className="bg-signal-paper px-5 py-24 text-signal-ink md:px-10 md:py-32">
      <p className="border-t border-signal-ink/15 pt-5 text-[11px] tracking-[0.28em] text-signal-ink/45 uppercase">
        {eyebrow}
      </p>

      <ul className="mt-10" onMouseMove={handleMove} onMouseLeave={hidePreview}>
        {works.map((work) => (
          <li key={work.index} data-work-row className="border-b border-signal-ink/15 first:border-t">
            <a
              href="#"
              onMouseEnter={() => showPreview(work.img)}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 md:grid-cols-[4.5rem_1fr_auto_5rem] md:gap-8 md:py-8"
            >
              <span className="font-mono text-[11px] tracking-[0.2em] text-signal-accent">
                {work.index}
              </span>
              <span className="min-w-0 truncate font-grotesk text-[clamp(1.6rem,4.2vw,3.2rem)] leading-none font-medium tracking-[-0.02em] transition-transform duration-300 group-hover:translate-x-2">
                {work.title}
              </span>
              <span className="hidden text-[11px] tracking-[0.24em] text-signal-ink/45 uppercase md:block">
                {work.category}
              </span>
              <span className="justify-self-end text-[11px] tracking-[0.24em] text-signal-ink/45">
                {work.year}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* cursor-trailing preview — desktop only */}
      <img
        ref={floatImg}
        src={works[0]?.img}
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-40 hidden aspect-[4/3] w-64 -translate-x-1/2 -translate-y-1/2 scale-90 object-cover opacity-0 invisible md:block lg:w-72"
      />
    </section>
  )
}
