import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import can01 from './assets/soda-can-01.png'
import can02 from './assets/soda-can-02.png'
import can03 from './assets/soda-can-03.png'
import can04 from './assets/soda-can-04.png'
import can05 from './assets/soda-can-05.png'

const defaultCans = [
  { name: 'FLAVOR 01', note: 'Ingredient + ingredient', color: '#ffb02e', image: can01 },
  { name: 'FLAVOR 02', note: 'Ingredient + ingredient', color: '#ff3ea5', image: can02 },
  { name: 'FLAVOR 03', note: 'Ingredient + ingredient', color: '#3ddc97', image: can03 },
  { name: 'FLAVOR 04', note: 'Ingredient + ingredient', color: '#ff6b35', image: can04 },
  { name: 'FLAVOR 05', note: 'Ingredient + ingredient', color: '#5b3df0', image: can05 },
]

/** Fallback SVG if a can has no image override and no default asset. */
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
 * CanCarousel — photorealistic can shelf (PNG cutouts) in a wrapping grid.
 * On hover the flavor color softly fills the card (and a soft outer glow),
 * like the MANA product shelf.
 *
 * Defaults ship with local `assets/soda-can-0N.png`. Builder `canNImage`
 * overrides any slot (PNG / SVG / WebP / JPG).
 */
export default function CanCarousel({
  eyebrow = 'Section eyebrow',
  title = 'YOUR LINEUP TITLE',
  cta = 'Your CTA',
  canLabel = 'BRAND*',
  cans,
  bg,
  fg,
}) {
  const root = useRef(null)

  // Lista editable `{ name, note, color, image }`. Sin imagen (o con la default
  // stubeada en el embed) cae al SVG `CanIllustration`.
  const shelf = (Array.isArray(cans) && cans.length ? cans : defaultCans).map((can) => ({
    name: can.name,
    note: can.note,
    color: can.color || '#5b3df0',
    image: can.image || '',
  }))

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-can-card]', {
        y: 36,
        opacity: 0,
        scale: 0.94,
        duration: 0.85,
        ease: 'back.out(1.5)',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 65%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="py-24 md:py-36"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div className="mx-auto max-w-7xl px-5 text-center md:px-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-foam/60 md:text-xs">
          {eyebrow}
        </p>
        <h2 className="mt-4 font-brico text-[clamp(2.2rem,6.5vw,5rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
          {title}
        </h2>

        <ul className="mt-12 grid grid-cols-1 justify-items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {shelf.map((can, i) => (
            <li
              key={i}
              data-can-card
              className="group relative flex w-full flex-col items-center overflow-hidden rounded-3xl border border-foam/25 px-5 pt-10 pb-7 text-center sm:px-6"
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
                    draggable={false}
                    className="max-h-52 w-auto max-w-[8.5rem] select-none object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)]"
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
      </div>
    </section>
  )
}
