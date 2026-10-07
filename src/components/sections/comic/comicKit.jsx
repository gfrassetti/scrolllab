/**
 * comicKit — the pieces every chapter of the comic shares: the torn paper
 * curtain, the crumpled paper, the boiling white outline of the panels, the
 * speech bubble and the panel's crooked clip.
 */

/** A ragged top edge for the paper curtain: x in %, y in px, the same every render. */
export const TORN_TOP = (() => {
  let a = 7
  const rand = () => {
    a = (a * 16807) % 2147483647
    return a / 2147483647
  }
  const pts = Array.from({ length: 41 }, (_, i) => `${((i / 40) * 100).toFixed(2)}% ${(4 + rand() * 30).toFixed(1)}px`)
  return `polygon(${pts.join(', ')}, 100% 100%, 0 100%)`
})()

// crumpled grey paper: flat colour under a soft fractal-noise shading
export const PAPER = {
  backgroundColor: '#c3c1bd',
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.011 0.02' numOctaves='4' seed='3'/><feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.42  0 0 0 0 0.41  0 0 0 0.9 -0.18'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
}

/**
 * A ragged white outline drawn around a panel, a little outside its picture.
 * Three versions: the timeline swaps them as you scroll, so the paper cut
 * "boils" like hand-drawn animation.
 */
export const BOIL = [11, 23, 37].map((seed) => {
  let a = seed
  const rand = () => {
    a = (a * 16807) % 2147483647
    return a / 2147483647
  }
  const pts = []
  const jag = (base) => base + (rand() - 0.5) * 2.6
  for (let i = 0; i <= 12; i += 1) pts.push([-3 + i * (106 / 12), jag(-4)])
  for (let i = 1; i <= 4; i += 1) pts.push([jag(103), -4 + i * (108 / 4)])
  for (let i = 11; i >= 0; i -= 1) pts.push([-3 + i * (106 / 12), jag(104)])
  for (let i = 3; i >= 1; i -= 1) pts.push([jag(-3), -4 + i * (108 / 4)])
  return `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')} Z`
})

// the speech bubble's blob, in three hand-drawn takes (it boils too)
export const BUBBLE = [
  'M70 50 C120 10 250 0 320 30 C380 56 400 120 380 170 C356 226 270 244 190 236 C110 228 30 200 14 140 C2 100 30 72 70 50Z',
  'M64 56 C118 14 246 6 324 36 C384 62 396 124 374 176 C348 228 264 240 186 232 C104 224 26 196 12 134 C4 96 28 76 64 56Z',
  'M76 46 C126 8 256 2 316 26 C374 52 402 116 384 166 C362 222 276 246 194 238 C114 230 36 204 18 144 C4 104 34 68 76 46Z',
]

// the picture itself is cut a little crooked, like a clipping
export const PANEL_CLIP = 'polygon(0.4% 1.6%, 99.6% 0%, 100% 98.6%, 0% 100%)'

export function BoilOutline() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        data-boil
        d={BOIL[0]}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}


/**
 * A panel: crooked clip, boiling outline, and room above it for the characters
 * that stand out over the frame. `back` goes inside the clip; `children`
 * (absolutely placed) are not clipped at the top.
 */
export function TornCard({ back, children, className = '', aspect = 'aspect-[2.8/1]', size = 'w-[min(88vw,1500px)] max-md:w-[94vw]' }) {
  return (
    <div className={`relative ${size} ${aspect} ${className}`}>
      <BoilOutline />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: PANEL_CLIP }}>
        {back}
      </div>
      {children}
    </div>
  )
}

/** A speech bubble that boils with the outlines (`data-bubble-shape`). */
export function SpeechBubble({ line, className = '' }) {
  return (
    <div data-bubble className={`will-change-transform ${className}`}>
      <svg viewBox="0 0 400 240" className="block h-auto w-full drop-shadow-[0_10px_24px_rgba(30,20,20,0.25)]" aria-hidden="true">
        <path data-bubble-shape d={BUBBLE[0]} fill="#fbfaf7" />
      </svg>
      <p className="absolute inset-0 flex items-center justify-center px-[14%] text-center font-brico text-[clamp(11px,1.5vw,22px)] leading-tight font-bold text-[#1d1a18]">
        {line}
      </p>
    </div>
  )
}

/** Drives the boil on every outline and bubble inside `root`, from a 0→n proxy. */
export function boilTo(root, f) {
  const d = BOIL[Math.floor(f) % BOIL.length]
  root.querySelectorAll('[data-boil]').forEach((path) => path.setAttribute('d', d))
  const b = BUBBLE[Math.floor(f * 0.8) % BUBBLE.length]
  root.querySelectorAll('[data-bubble-shape]').forEach((path) => path.setAttribute('d', b))
}

/**
 * Pointer depth (the finger on a phone): each `[selector, depth]` layer drifts
 * by `depth` px toward the pointer, so the card reads in layers. Uses x / y, so
 * the timeline should move these layers with percents or a wrapper.
 */
export function hoverDepth(root, layers, { gsap, trackPointer, tilt = [] }) {
  const pointer = trackPointer()
  // whole cards lean toward the pointer, like a card held in the hand
  const tilts = tilt
    .map(([sel, deg]) =>
      [...root.querySelectorAll(sel)].map((el) => {
        gsap.set(el, { transformPerspective: 1400 })
        return {
          deg,
          ry: gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3.out' }),
          rx: gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3.out' }),
        }
      }),
    )
    .flat()
  const setters = layers
    .map(([sel, depth]) => {
      const els = root.querySelectorAll(sel)
      return [...els].map((el) => ({
        depth,
        x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' }),
      }))
    })
    .flat()
  const tick = () => {
    setters.forEach((l) => {
      l.x(pointer.x * l.depth)
      l.y(pointer.y * l.depth * 0.6)
    })
    tilts.forEach((t) => {
      t.ry(pointer.x * t.deg)
      t.rx(-pointer.y * t.deg * 0.6)
    })
  }
  gsap.ticker.add(tick)
  return () => {
    gsap.ticker.remove(tick)
    pointer.dispose?.()
  }
}

/** Dark paper, for the curtain and the page of the dark chapter. */
export const DARK_PAPER = {
  backgroundColor: '#1f1c1b',
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.011 0.02' numOctaves='4' seed='5'/><feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.28  0 0 0 0 0.27  0 0 0 0.5 -0.1'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
}

/** Red wood planks, for the closing chapter. */
export const WOOD = {
  backgroundColor: '#8a2a3a',
  backgroundImage:
    'repeating-linear-gradient(176deg, rgba(0,0,0,0) 0 118px, rgba(40,6,16,0.55) 118px 122px, rgba(0,0,0,0) 122px 240px), linear-gradient(135deg, #b8405a 0%, #7a2236 45%, #a83650 100%)',
}
