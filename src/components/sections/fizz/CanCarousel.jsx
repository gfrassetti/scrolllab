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
  // Label must stay inside the can body (88 wide) whatever the font that loads,
  // so size it by length and pin the run length with textLength.
  const text = String(label || '')
  const maxWidth = 70
  const chars = Math.max(text.length, 1)
  const fontSize = Math.max(9, Math.min(24, Math.round(maxWidth / (chars * 0.62))))
  const runLength = Math.min(fontSize * 0.62 * chars, maxWidth)

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
        y="70"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Bricolage Grotesque, sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        textLength={runLength}
        lengthAdjust="spacingAndGlyphs"
        fill="#241352"
      >
        {text}
      </text>
      <ellipse cx="60" cy="186" rx="44" ry="10" fill={color} opacity="0.55" />
      <rect x="50" y="6" width="20" height="6" rx="3" fill="#8f8a85" />
    </svg>
  )
}

/**
 * CanCarousel — snap-scrolling shelf of illustrated cans.
 * On hover the flavor color softly fills the card (and a soft outer glow),
 * like the MANA product shelf.
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
            className="group relative flex w-64 shrink-0 snap-start flex-col items-center overflow-hidden rounded-3xl border border-foam/25 px-6 pt-10 pb-7 text-center md:w-72"
          >
            {/* Soft outer wash */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 rounded-[2rem] opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-45"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${can.color}, transparent 70%)`,
              }}
            />
            {/* Solid fill that fades in */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              style={{ backgroundColor: can.color }}
            />

            <div className="relative z-10 flex h-52 items-center justify-center transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:rotate-3">
              {can.image ? (
                <img
                  src={can.image}
                  alt=""
                  className="max-h-52 w-auto max-w-[7.5rem] object-contain drop-shadow-md"
                />
              ) : (
                <CanIllustration color={can.color} label={canLabel} />
              )}
            </div>
            <h3 className="relative z-10 mt-7 font-brico text-lg font-extrabold uppercase tracking-tight text-foam transition-colors duration-500 group-hover:text-grape">
              {can.name}
            </h3>
            <p className="relative z-10 mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-foam/60 transition-colors duration-500 group-hover:text-grape/70">
              {can.note}
            </p>
            <a
              href="#"
              className="relative z-10 mt-6 rounded-full border border-transparent bg-foam/15 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-foam transition-[transform,background-color,color,border-color] duration-300 group-hover:scale-105 group-hover:border-grape/20 group-hover:bg-grape group-hover:text-foam"
            >
              {cta}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
