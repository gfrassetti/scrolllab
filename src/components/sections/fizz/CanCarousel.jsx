import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultCans = [
  { name: 'FLAVOR 01', note: 'Ingredient + ingredient', color: '#ffb02e' },
  { name: 'FLAVOR 02', note: 'Ingredient + ingredient', color: '#ff3ea5' },
  { name: 'FLAVOR 03', note: 'Ingredient + ingredient', color: '#3ddc97' },
  { name: 'FLAVOR 04', note: 'Ingredient + ingredient', color: '#ff6b35' },
  { name: 'FLAVOR 05', note: 'Ingredient + ingredient', color: '#5b3df0' },
]

/** Illustrated can, pure SVG — no image assets in the template. */
function CanIllustration({ color, label }) {
  return (
    <svg viewBox="0 0 120 200" className="h-44 w-auto md:h-52" aria-hidden="true">
      <ellipse cx="60" cy="14" rx="44" ry="10" fill="#d9d4cf" />
      <rect x="16" y="14" width="88" height="168" rx="14" fill={color} />
      <path
        d="M16 118 Q38 106 60 118 T104 118 L104 182 Q104 196 90 196 L30 196 Q16 196 16 182 Z"
        fill="#fff3e2"
        opacity="0.92"
      />
      <text
        x="60"
        y="72"
        textAnchor="middle"
        fontFamily="Bricolage Grotesque, sans-serif"
        fontWeight="800"
        fontSize={Math.min(26, Math.round(140 / Math.max(label.length, 1)))}
        fill="#241352"
      >
        {label}
      </text>
      <ellipse cx="60" cy="186" rx="44" ry="10" fill={color} opacity="0.55" />
      <rect x="50" y="6" width="20" height="6" rx="3" fill="#8f8a85" />
    </svg>
  )
}

/**
 * CanCarousel — snap-scrolling shelf of illustrated cans. Cards tilt
 * on hover and pop in with a stagger as the shelf enters the viewport.
 *
 * Per-can name/note/image are editable from the builder. With `canNImage`
 * set (URL or path), the placeholder SVG is replaced by that asset
 * (PNG / SVG / WebP / JPG). Drop files in `public/` after download.
 */
export default function CanCarousel({
  eyebrow = 'Section eyebrow',
  title = 'YOUR LINEUP TITLE',
  cta = 'Your CTA',
  canLabel = 'BRAND*',
  cans = defaultCans,
  can1Name,
  can1Note,
  can1Image,
  can2Name,
  can2Note,
  can2Image,
  can3Name,
  can3Note,
  can3Image,
  can4Name,
  can4Note,
  can4Image,
  can5Name,
  can5Note,
  can5Image,
}) {
  const root = useRef(null)

  const overrides = [
    { name: can1Name, note: can1Note, image: can1Image },
    { name: can2Name, note: can2Note, image: can2Image },
    { name: can3Name, note: can3Note, image: can3Image },
    { name: can4Name, note: can4Note, image: can4Image },
    { name: can5Name, note: can5Note, image: can5Image },
  ]
  const shelf = cans.map((can, i) => ({
    ...can,
    name: overrides[i]?.name || can.name,
    note: overrides[i]?.note || can.note,
    image: overrides[i]?.image || '',
  }))

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-can-card]', {
        x: 90,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: 'top 65%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="overflow-hidden py-24 md:py-36">
      <div className="px-5 md:px-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-foam/60 md:text-xs">
          {eyebrow}
        </p>
        <h2 className="mt-4 font-brico text-[clamp(2.2rem,6.5vw,5rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
          {title}
        </h2>
      </div>

      <ul className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 md:px-10 [scrollbar-width:thin]">
        {shelf.map((can, i) => (
          <li
            key={i}
            data-can-card
            className="group flex w-64 shrink-0 snap-start flex-col items-center rounded-3xl border border-foam/20 px-6 pt-10 pb-7 text-center transition-transform duration-300 hover:-rotate-2 md:w-72"
          >
            <div className="flex h-52 items-center justify-center transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-3">
              {can.image ? (
                <img
                  src={can.image}
                  alt=""
                  className="max-h-52 w-auto max-w-[7.5rem] object-contain"
                />
              ) : (
                <CanIllustration color={can.color} label={canLabel} />
              )}
            </div>
            <h3 className="mt-7 font-brico text-lg font-extrabold uppercase tracking-tight">
              {can.name}
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-foam/60">
              {can.note}
            </p>
            <a
              href="#"
              className="mt-6 rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-grape transition-transform duration-200 group-hover:scale-105"
              style={{ backgroundColor: can.color }}
            >
              {cta}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
