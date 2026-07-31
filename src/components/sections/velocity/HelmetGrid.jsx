import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const ITEMS = [
  {
    id: 'season',
    name: 'Season',
    year: '2025',
    img: 'https://picsum.photos/seed/helm-season/800/800',
    offset: 'md:mt-0',
  },
  {
    id: 'discoball',
    name: 'Discoball',
    year: '2024',
    img: 'https://picsum.photos/seed/helm-disco/800/800',
    offset: 'md:mt-16',
  },
  {
    id: 'dark',
    name: 'Dark Glitter',
    year: '2024',
    img: 'https://picsum.photos/seed/helm-dark/800/800',
    offset: 'md:mt-8',
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    year: '2024',
    img: 'https://picsum.photos/seed/helm-porc/800/800',
    offset: 'md:mt-20',
  },
  {
    id: 'japan',
    name: 'Japan',
    year: '2024',
    img: 'https://picsum.photos/seed/helm-japan/800/800',
    offset: 'md:mt-4',
  },
  {
    id: 'chrome',
    name: 'Chrome',
    year: '2023',
    img: 'https://picsum.photos/seed/helm-chrome/800/800',
    offset: 'md:mt-14',
  },
]

/** Notched frame path (viewBox 0 0 100 100). Label lives in the cut corner. */
function NotchFrame({ active }) {
  const pathRef = useRef(null)

  useGSAP(
    () => {
      const path = pathRef.current
      if (!path) return
      const length = path.getTotalLength()
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 1.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: path,
          start: 'top 88%',
        },
      })
    },
    { dependencies: [] },
  )

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d="M 3 3 H 97 V 68 H 58 V 97 H 3 Z"
        stroke={active ? 'var(--color-acid)' : 'rgba(236,233,226,0.28)'}
        strokeWidth="0.9"
        vectorEffect="non-scaling-stroke"
        className="transition-[stroke] duration-300"
      />
    </svg>
  )
}

/**
 * HelmetGrid — product hall like the cascos: notched frames,
 * staggered layout, lime hover, stroke draw-in on scroll.
 */
export default function HelmetGrid({
  eyebrow = 'Hall of Fame',
  title = 'Helmets',
  body = 'From seasonal liveries to one-off designs. Placeholder products — swap freely.',
}) {
  const root = useRef(null)
  const [active, setActive] = useState(ITEMS[0].id)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-helm-card]', {
        opacity: 0,
        y: 40,
        duration: 0.85,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
        },
      })
    },
    { scope: root },
  )

  return (
    <section
      id="hall"
      ref={root}
      className="scroll-mt-20 bg-black px-5 py-24 text-[#ece9e2] md:px-10 md:py-32"
    >
      <p className="text-[11px] tracking-[0.25em] text-acid uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-brico text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.9] font-semibold tracking-[-0.04em]">
        {title}
      </h2>
      <p className="mt-4 max-w-[44ch] text-sm text-white/55 md:text-base">
        {body}
      </p>

      <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-6">
        {ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <li
              key={item.id}
              data-helm-card
              className={item.offset}
            >
              <button
                type="button"
                onMouseEnter={() => setActive(item.id)}
                onFocus={() => setActive(item.id)}
                className="group relative w-full text-left"
              >
                <div className="relative aspect-square bg-black">
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                      clipPath:
                        'polygon(0 0, 100% 0, 100% 68%, 58% 68%, 58% 100%, 0 100%)',
                    }}
                  >
                    <img
                      src={item.img}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <NotchFrame active={isActive} />
                  <p
                    className={`absolute right-0 bottom-[2%] w-[40%] pl-2 text-[10px] leading-tight tracking-[0.18em] uppercase md:text-[11px] ${
                      isActive ? 'text-[#ece9e2]' : 'text-white/55'
                    }`}
                  >
                    {item.name}{' '}
                    <span className="text-acid">{item.year}</span>
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
