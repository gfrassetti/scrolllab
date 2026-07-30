import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultWorks = [
  {
    index: '001',
    title: 'Placeholder film',
    category: 'Direction',
    year: '2026',
    img: 'https://picsum.photos/seed/work-a/800/1000',
  },
  {
    index: '002',
    title: 'Generic sequence',
    category: 'Editorial',
    year: '2025',
    img: 'https://picsum.photos/seed/work-b/800/1000',
  },
  {
    index: '003',
    title: 'Untitled cut',
    category: 'Motion',
    year: '2025',
    img: 'https://picsum.photos/seed/work-c/800/1000',
  },
  {
    index: '004',
    title: 'Working title',
    category: 'Photography',
    year: '2024',
    img: 'https://picsum.photos/seed/work-d/800/1000',
  },
]

/**
 * WorkIndex — index-style list of works. On desktop, a floating
 * preview image trails the cursor and swaps per hovered row.
 * On mobile each row carries its own inline thumbnail.
 */
export default function WorkIndex({
  seq = '04',
  total = '06',
  label = 'The index',
  works = defaultWorks,
}) {
  const root = useRef(null)
  const floatImg = useRef(null)
  const quick = useRef({ x: null, y: null })

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-work-row]', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
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
    <section ref={root} className="px-5 py-24 md:px-10 md:py-36">
      <div className="mb-10 flex items-baseline justify-between border-t border-salt/20 pt-4 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs">
          Seq. {seq} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.3em] md:text-xs">{label}</p>
      </div>

      <ul onMouseMove={handleMove} onMouseLeave={hidePreview}>
        {works.map((work) => (
          <li key={work.index} className="border-b border-salt/15 first:border-t">
            <a
              href="#"
              onMouseEnter={() => showPreview(work.img)}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 md:grid-cols-[6rem_1fr_auto_6rem] md:gap-8 md:py-8"
            >
              <span className="text-[11px] tracking-[0.3em] text-salt/40 md:text-xs">
                {work.index}
              </span>

              <span className="flex min-w-0 items-center gap-4">
                <img
                  src={work.img}
                  alt=""
                  loading="lazy"
                  className="h-14 w-11 shrink-0 object-cover md:hidden"
                />
                <span className="min-w-0 break-words font-brico text-[clamp(1.6rem,4.5vw,3.8rem)] leading-none font-extrabold tracking-[-0.02em] uppercase transition-all duration-300 group-hover:translate-x-2 group-hover:text-acid">
                  {work.title}
                </span>
              </span>

              <span className="hidden text-[11px] uppercase tracking-[0.3em] text-salt/40 md:block md:text-xs">
                {work.category}
              </span>
              <span className="justify-self-end text-[11px] tracking-[0.3em] text-salt/40 md:text-xs">
                {work.year}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* Cursor-trailing preview — desktop only */}
      <img
        ref={floatImg}
        src={works[0]?.img}
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-40 hidden w-56 -translate-x-1/2 -translate-y-1/2 scale-90 object-cover opacity-0 invisible md:block lg:w-64"
      />
    </section>
  )
}
