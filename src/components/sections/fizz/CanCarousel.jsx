import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import {
  sodaBottle01 as bottle01,
  sodaBottle02 as bottle02,
  sodaBottle03 as bottle03,
  sodaBottle04 as bottle04,
  sodaBottle05 as bottle05,
  variants,
} from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultCans = [
  { name: 'FLAVOR 01', note: 'Ingredient + ingredient', color: '#ffb02e', image: bottle01 },
  { name: 'FLAVOR 02', note: 'Ingredient + ingredient', color: '#ff3ea5', image: bottle02 },
  { name: 'FLAVOR 03', note: 'Ingredient + ingredient', color: '#3ddc97', image: bottle03 },
  { name: 'FLAVOR 04', note: 'Ingredient + ingredient', color: '#ff6b35', image: bottle04 },
  { name: 'FLAVOR 05', note: 'Ingredient + ingredient', color: '#5b3df0', image: bottle05 },
]

/** Fallback SVG if a bottle has no image override and no default asset. */
function CanIllustration({ color, label }) {
  // Label text must stay inside the label band whatever font loads, so size it
  // by length and pin the run length with textLength.
  const text = String(label || '')
  const maxWidth = 40
  const chars = Math.max(text.length, 1)
  const fontSize = Math.max(7, Math.min(16, Math.round(maxWidth / (chars * 0.62))))
  const runLength = Math.min(fontSize * 0.62 * chars, maxWidth)

  return (
    <svg viewBox="0 0 60 230" className="h-52 w-auto md:h-60" aria-hidden="true">
      <path d="M26 6 h8 v8 q0 3 -1 5 v9 q1 4 1 8 q8 14 10 30 v140 q0 12 -8 14 h-12 q-8 -2 -8 -14 v-140 q2 -16 10 -30 q0 -4 1 -8 v-9 q-1 -2 -1 -5 z" fill={color} opacity="0.85" />
      <path d="M26 6 h8 v6 h-8 z" fill="#fff3e2" />
      <rect x="14" y="112" width="32" height="62" fill="#fff3e2" opacity="0.95" />
      <text x="30" y="143" textAnchor="middle" dominantBaseline="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize={fontSize} textLength={runLength} lengthAdjust="spacingAndGlyphs" fill="#241352">{text}</text>
    </svg>
  )
}

/**
 * CanCarousel — photorealistic bottle shelf (PNG cutouts) in a wrapping grid.
 * (The file/id keeps its old name so saved builder compositions still load.)
 * On hover the flavor color softly fills the card (and a soft outer glow),
 * like the MANA product shelf.
 *
 * Defaults ship with local `assets/soda-bottle-0N.webp` (rendered from the
 * same 3D bottle as the hero). Builder `canNImage`
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

              <div className="relative z-10 flex h-60 items-center justify-center transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:rotate-3">
                {can.image ? (
                  <img
                    {...imgAttrs(can.image, variants)}
                    sizes="96px"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="max-h-60 w-auto max-w-[6rem] select-none object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)]"
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
                className="ui-press tpl-hit relative z-10 mt-6 rounded-full border border-transparent bg-foam/15 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-foam transition-[transform,background-color,color,border-color] duration-300 group-hover:scale-105 group-hover:border-grape/20 group-hover:bg-grape group-hover:text-foam"
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
