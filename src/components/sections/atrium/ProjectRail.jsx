import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import civic from './assets/civic.jpg'
import tower from './assets/tower.jpg'
import courtyard from './assets/courtyard.jpg'
import gallery from './assets/gallery.jpg'
import heroHouse from './assets/hero-house.jpg'
import heroField from './assets/hero-field.jpg'

const defaultWorks = [
  { index: '01', title: 'North Civic Hall', meta: '1,240 m²', img: civic },
  { index: '02', title: 'Harbour Court', meta: '8,400 m²', img: tower },
  { index: '03', title: 'Olive House', meta: '420 m²', img: courtyard },
  { index: '04', title: 'Daylight Gallery', meta: '2,100 m²', img: gallery },
  { index: '05', title: 'Ridge Residence', meta: '610 m²', img: heroHouse },
  { index: '06', title: 'Field Pavilion', meta: '3,800 m²', img: heroField },
]

/**
 * ProjectRail — work index. Desktop: a photograph trails the cursor.
 * Mobile: each row carries its own thumbnail.
 */
export default function ProjectRail({
  kicker = 'Selected work',
  title = 'Projects',
  works = defaultWorks,
}) {
  const root = useRef(null)
  const floatImg = useRef(null)
  const quick = useRef({ x: null, y: null })

  useGSAP(
    () => {
      gsap.set(floatImg.current, {
        autoAlpha: 0,
        scale: 0.92,
        xPercent: -50,
        yPercent: -50,
      })

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-work-row]', {
        y: 36,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.07,
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })

      quick.current.x = gsap.quickTo(floatImg.current, 'x', {
        duration: 0.45,
        ease: 'power3',
      })
      quick.current.y = gsap.quickTo(floatImg.current, 'y', {
        duration: 0.45,
        ease: 'power3',
      })

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onLeave: () => hidePreview(),
        onLeaveBack: () => hidePreview(),
      })
    },
    { scope: root },
  )

  const handleMove = (e) => {
    quick.current.x?.(e.clientX)
    quick.current.y?.(e.clientY)
  }

  const showPreview = (img, e) => {
    if (!floatImg.current) return
    floatImg.current.src = img
    if (e) gsap.set(floatImg.current, { x: e.clientX, y: e.clientY })
    gsap.to(floatImg.current, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power3.out' })
  }

  const hidePreview = () => {
    if (!floatImg.current) return
    gsap.to(floatImg.current, { autoAlpha: 0, scale: 0.92, duration: 0.28, ease: 'power2.out' })
  }

  return (
    <section ref={root} id="work" className="px-5 py-24 md:px-10 md:py-36">
      <div className="mb-12 flex items-end justify-between gap-6 border-t border-[#111]/12 pt-5">
        <p className="text-[11px] tracking-[0.28em] text-[#111]/45 uppercase">{kicker}</p>
        <h2 className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-none">{title}</h2>
      </div>

      <ul onMouseMove={handleMove} onMouseLeave={hidePreview}>
        {works.map((work) => (
          <li key={work.index} data-work-row className="border-b border-[#111]/12 first:border-t">
            <a
              href="#work"
              onMouseEnter={(e) => showPreview(work.img, e)}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 md:grid-cols-[4.5rem_1fr_auto] md:gap-8 md:py-8"
            >
              <span className="text-[11px] tracking-[0.22em] text-[#111]/40">{work.index}</span>
              <span className="flex min-w-0 items-center gap-4">
                <img
                  src={work.img}
                  alt=""
                  loading="lazy"
                  className="h-14 w-16 shrink-0 object-cover md:hidden"
                />
                <span className="min-w-0 font-display text-[clamp(1.45rem,3.6vw,2.8rem)] leading-[0.95] tracking-[-0.03em] transition-transform duration-300 ease-out-strong group-hover:translate-x-2">
                  {work.title}
                </span>
              </span>
              <span className="justify-self-end text-[11px] tracking-[0.18em] text-[#111]/40 uppercase">
                {work.meta}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <img
        ref={floatImg}
        src={works[0]?.img}
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-40 hidden h-36 w-56 object-cover md:block lg:h-48 lg:w-72"
      />
    </section>
  )
}
