import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import helm1 from './assets/helm-1.png'
import helm2 from './assets/helm-2.png'
import helm3 from './assets/helm-3.png'
import helm4 from './assets/helm-4.png'
import helm5 from './assets/helm-5.png'
import helm6 from './assets/helm-6.png'

/** Varied notch / irregular masks — storytelling “hall of fame” feel. */
const MASKS = [
  'polygon(0 0, 100% 0, 100% 70%, 62% 70%, 62% 100%, 0 100%)',
  'polygon(0 0, 100% 0, 100% 100%, 38% 100%, 38% 72%, 0 72%)',
  'polygon(0 8%, 100% 0, 100% 100%, 0 100%)',
  'polygon(0 0, 100% 0, 92% 100%, 0 88%)',
  'polygon(6% 0, 100% 0, 100% 100%, 0 100%, 0 22%)',
  'polygon(0 0, 100% 12%, 100% 100%, 0 100%)',
]

const STROKE_PATHS = [
  'M 3 3 H 97 V 70 H 62 V 97 H 3 Z',
  'M 3 3 H 97 V 97 H 38 V 72 H 3 Z',
  'M 3 10 H 97 V 97 H 3 Z',
  'M 3 3 H 97 V 97 L 3 88 Z',
  'M 8 3 H 97 V 97 H 3 V 24 Z',
  'M 3 3 H 97 L 97 97 H 3 Z',
]

const defaultItems = [
  {
    id: 'item-1',
    name: 'Title 1',
    year: '01',
    img: helm1,
    hover: helm1,
    offset: 'md:mt-0',
    mask: 0,
  },
  {
    id: 'item-2',
    name: 'Title 2',
    year: '02',
    img: helm2,
    hover: helm2,
    offset: 'md:mt-16',
    mask: 1,
  },
  {
    id: 'item-3',
    name: 'Title 3',
    year: '03',
    img: helm3,
    hover: helm3,
    offset: 'md:mt-8',
    mask: 2,
  },
  {
    id: 'item-4',
    name: 'Title 4',
    year: '04',
    img: helm4,
    hover: helm4,
    offset: 'md:mt-20',
    mask: 3,
  },
  {
    id: 'item-5',
    name: 'Title 5',
    year: '05',
    img: helm5,
    hover: helm5,
    offset: 'md:mt-4',
    mask: 4,
  },
  {
    id: 'item-6',
    name: 'Title 6',
    year: '06',
    img: helm6,
    hover: helm6,
    offset: 'md:mt-14',
    mask: 5,
  },
]

function NotchStroke({ active, maskIndex }) {
  const pathRef = useRef(null)

  useGSAP(
    () => {
      const path = pathRef.current
      if (!path) return
      const length = path.getTotalLength()
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 1.15,
        ease: 'power2.out',
        scrollTrigger: { trigger: path, start: 'top 88%' },
      })
    },
    { dependencies: [maskIndex] },
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
        d={STROKE_PATHS[maskIndex] || STROKE_PATHS[0]}
        stroke={active ? 'var(--color-acid)' : 'rgba(236,233,226,0.28)'}
        strokeWidth="0.9"
        vectorEffect="non-scaling-stroke"
        className="transition-[stroke] duration-300"
      />
    </svg>
  )
}

function HelmCard({ item, isActive, onActivate }) {
  const [hovered, setHovered] = useState(false)

  return (
    <li data-helm-card className={item.offset}>
      <button
        type="button"
        onMouseEnter={() => {
          onActivate()
          setHovered(true)
        }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          onActivate()
          setHovered(true)
        }}
        onBlur={() => setHovered(false)}
        className="group relative w-full text-left"
      >
        <div className="relative aspect-square bg-black">
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: MASKS[item.mask] }}
          >
            {item.img ? (
              <img
                src={item.img}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
            ) : null}
            <div
              className="absolute inset-0"
              style={{
                clipPath: hovered
                  ? 'ellipse(78% 78% at 50% 50%)'
                  : 'ellipse(0% 0% at 50% 50%)',
                opacity: hovered ? 1 : 0,
                transition: 'clip-path 0.55s ease, opacity 0.35s ease',
              }}
            >
              {item.hover ? (
                <img
                  src={item.hover}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </div>
          <NotchStroke active={isActive} maskIndex={item.mask} />
          <p
            className={`absolute right-0 bottom-[2%] w-[42%] pl-2 text-[10px] leading-tight tracking-[0.18em] uppercase md:text-[11px] ${
              isActive ? 'text-[#ece9e2]' : 'text-white/55'
            }`}
          >
            {item.name} <span className="text-acid">{item.year}</span>
          </p>
        </div>
      </button>
    </li>
  )
}

/**
 * HelmetGrid — irregular clip masks + hover photo reveal (ellipse wipe).
 */
export default function HelmetGrid({
  eyebrow = 'Section label',
  title = 'Title grid',
  body = 'Body 1 — replace with hall copy.',
  items,
  bg,
  fg,
}) {
  const root = useRef(null)
  const [active, setActive] = useState(0)

  // Lista editable `{ name, year, img }`. offset/mask (visual) salen por índice
  // del set de ejemplo; `hover` reusa la misma imagen.
  const rows =
    Array.isArray(items) && items.length
      ? items.slice(0, 6).map((it, i) => {
          const d = defaultItems[i % defaultItems.length]
          const img = it.img || d.img
          return { name: it.name || d.name, year: it.year || d.year, img, hover: img, offset: d.offset, mask: d.mask }
        })
      : defaultItems

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-helm-card]', {
        opacity: 0,
        y: 48,
        rotate: 1.5,
        duration: 0.9,
        stagger: { each: 0.07, from: 'start' },
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 72%',
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
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
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
        {rows.map((item, i) => (
          <HelmCard
            key={i}
            item={item}
            isActive={active === i}
            onActivate={() => setActive(i)}
          />
        ))}
      </ul>
    </section>
  )
}
