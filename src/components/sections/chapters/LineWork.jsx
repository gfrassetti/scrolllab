import { useEffect, useRef } from 'react'
import { gsap } from '../../../lib/gsap'

/**
 * LineWork — a drawing made of one continuous line, drawn in the background of
 * a chapter by the scroll and then undrawn by it (the pen comes in, finishes
 * the figure and the line leaves from where it started). It sits behind the
 * content (the section needs `relative isolate`) and takes the section's text
 * colour. The drawing lives in a layer stuck to the screen for as long as the
 * section lasts, so a tall section still shows the whole figure.
 *
 *   variant="squares"  a line comes down the page and turns into squares
 *   variant="frames"   a line runs across and builds a row of frames
 *   variant="word"     a diagonal that writes the word (`word`) in one stroke
 *
 * The path is built in pixels for the section's real size (the squares stay
 * square) and rebuilt when the section changes size.
 *
 *   <LineWork variant="squares" />
 *   drawLineWork(root, { trigger: root, start: 'top 80%', end: 'bottom 20%', scrub: true })
 */
export default function LineWork({ variant = 'squares', word = 'CHAPTERS', hidden = false }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    const host = svg?.parentElement
    if (!svg || !host) return undefined
    const draw = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      svg.querySelector('path')?.setAttribute('d', buildPath(variant, w, h, word))
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(host)
    return () => ro.disconnect()
  }, [variant, word])

  // El dibujo va en una capa pegada a la pantalla mientras dura la sección:
  // se ve entero mientras se dibuja y se borra, aunque la sección sea alta.
  return (
    <div aria-hidden="true" aria-label={variant === 'word' ? word : undefined} className={`pointer-events-none absolute inset-0 -z-10 ${hidden ? 'hidden' : ''}`}>
      <div className="sticky top-0 h-svh max-h-full w-full">
        <svg ref={svgRef} data-linework className="absolute inset-0 h-full w-full overflow-visible text-current">
          <path
            data-line
            pathLength="1"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.32"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 1"
            strokeDashoffset="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  )
}

/**
 * The line along `scrollTrigger`: it is drawn during the first part of the
 * scroll and undrawn during the last (dash offset 1 → 0 → -1).
 */
export function drawLineWork(scope, scrollTrigger) {
  const path = scope?.querySelector?.('[data-linework] [data-line]')
  if (!path) return null
  return gsap.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: -1, ease: 'none', scrollTrigger })
}

// —— las figuras ——

const toD = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

/** Monoline letters on a 4 × 6 grid, each one a single stroke (retracing where it has to). */
const GLYPHS = {
  A: [
    [0, 6],
    [0, 0],
    [4, 0],
    [4, 6],
    [4, 3],
    [0, 3],
  ],
  B: [
    [0, 6],
    [0, 0],
    [3, 0],
    [4, 1],
    [3, 3],
    [0, 3],
    [4, 4],
    [3, 6],
    [0, 6],
  ],
  C: [
    [4, 0],
    [0, 0],
    [0, 6],
    [4, 6],
  ],
  D: [
    [0, 6],
    [0, 0],
    [3, 0],
    [4, 2],
    [4, 4],
    [3, 6],
    [0, 6],
  ],
  E: [
    [4, 0],
    [0, 0],
    [0, 3],
    [3, 3],
    [0, 3],
    [0, 6],
    [4, 6],
  ],
  F: [
    [4, 0],
    [0, 0],
    [0, 3],
    [3, 3],
    [0, 3],
    [0, 6],
  ],
  G: [
    [4, 0],
    [0, 0],
    [0, 6],
    [4, 6],
    [4, 3],
    [2, 3],
  ],
  H: [
    [0, 0],
    [0, 6],
    [0, 3],
    [4, 3],
    [4, 0],
    [4, 6],
  ],
  I: [
    [2, 0],
    [2, 6],
  ],
  K: [
    [0, 0],
    [0, 6],
    [0, 3],
    [4, 0],
    [0, 3],
    [4, 6],
  ],
  L: [
    [0, 0],
    [0, 6],
    [4, 6],
  ],
  M: [
    [0, 6],
    [0, 0],
    [2, 3],
    [4, 0],
    [4, 6],
  ],
  N: [
    [0, 6],
    [0, 0],
    [4, 6],
    [4, 0],
  ],
  O: [
    [0, 0],
    [4, 0],
    [4, 6],
    [0, 6],
    [0, 0],
  ],
  P: [
    [0, 6],
    [0, 0],
    [4, 0],
    [4, 3],
    [0, 3],
  ],
  R: [
    [0, 6],
    [0, 0],
    [4, 0],
    [4, 3],
    [0, 3],
    [4, 6],
  ],
  S: [
    [4, 0],
    [0, 0],
    [0, 3],
    [4, 3],
    [4, 6],
    [0, 6],
  ],
  T: [
    [0, 0],
    [4, 0],
    [2, 0],
    [2, 6],
  ],
  U: [
    [0, 0],
    [0, 6],
    [4, 6],
    [4, 0],
  ],
  V: [
    [0, 0],
    [2, 6],
    [4, 0],
  ],
  W: [
    [0, 0],
    [1, 6],
    [2, 3],
    [3, 6],
    [4, 0],
  ],
  Y: [
    [0, 0],
    [2, 3],
    [4, 0],
    [2, 3],
    [2, 6],
  ],
}

function buildPath(variant, w, h, word) {
  const m = Math.min(w, h)
  if (variant === 'frames') {
    // una línea entra por la izquierda y, a lo largo, arma cuadros que crecen
    const y = h * 0.86
    const pts = [[-20, y]]
    const n = 7
    for (let i = 0; i < n; i += 1) {
      const x = w * (0.08 + (i / (n - 1)) * 0.82)
      const s = m * (0.06 + 0.04 * Math.sin((i / (n - 1)) * Math.PI))
      pts.push([x, y], [x, y - s], [x + s, y - s], [x + s, y], [x + s * 1.6, y])
    }
    pts.push([w + 20, y])
    return toD(pts)
  }
  if (variant === 'word') {
    // una diagonal que llega, escribe la palabra en un trazo y sigue
    const letters = [...String(word).toUpperCase()].filter((c) => GLYPHS[c] || c === ' ')
    const units = letters.length * 6 - 2
    const u = Math.min((w * 0.72) / units, (h * 0.16) / 6)
    const x0 = (w - units * u) / 2
    const y0 = h * 0.5 - 3 * u
    const pts = [
      [-20, h + 20],
      [x0, y0 + 6 * u],
    ]
    letters.forEach((c, i) => {
      const g = GLYPHS[c]
      if (!g) return
      for (const [gx, gy] of g) pts.push([x0 + (i * 6 + gx) * u, y0 + gy * u])
    })
    pts.push([w + 20, -20])
    return toD(pts)
  }
  // squares: baja por la izquierda, se vuelve cuadrados, cruza abajo y sube por la derecha
  const s = m * 0.07
  const xl = w * 0.06
  const xr = w * 0.86
  const pts = [[xl, -20]]
  const steps = 5
  for (let i = 0; i < steps; i += 1) {
    const y = h * (0.12 + (i / steps) * 0.7)
    const k = s * (0.6 + i * 0.25)
    pts.push([xl, y], [xl + k, y], [xl + k, y + k], [xl, y + k])
  }
  pts.push([xl, h * 0.94], [xr, h * 0.94])
  for (let i = 0; i < steps; i += 1) {
    const y = h * (0.86 - (i / steps) * 0.7)
    const k = s * (1.6 - i * 0.25)
    pts.push([xr, y], [xr - k, y], [xr - k, y - k], [xr, y - k])
  }
  pts.push([xr, -20])
  return toD(pts)
}
