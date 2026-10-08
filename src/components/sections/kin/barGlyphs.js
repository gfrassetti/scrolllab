/**
 * KIN — a wordmark built from identical bars.
 *
 * Every letter is a handful of the same rectangle (1 wide × BAR_H tall, in
 * "bar units") placed at a centre and an angle. Nothing here knows about
 * pixels or animation: Hero.jsx scales these numbers to the viewport and
 * GSAP moves the bars between the layouts below.
 *
 * Change WORD to your brand. Letters that can be built from equal bars:
 *   A H I K L M N T V W X Y  1 7  (and a space)
 * Anything else falls back to an I. Bars are too thick for E, F, Z, B…; that's
 * the constraint that gives the mark its look.
 *
 * Units: x grows right, y grows down, angles are degrees clockwise (CSS
 * `rotate`). `sy` stretches a bar's length (diagonals overshoot the band
 * and get cut flat by it, like a stencil).
 */

export const WORD = 'KIN'

export const BAR_H = 1.86 // bar height / bar width
export const GAP = 0.09 // space between letters, in bar widths

const H = BAR_H
const rad = (d) => (d * Math.PI) / 180

const V = (x, sy = 1, cy = H / 2) => ({ cx: x, cy, r: 0, sy })
const HZ = (cx, cy, len) => ({ cx, cy, r: 90, sy: len / H })

// A bar whose end sits on point (x, y) and that leans `deg` from vertical,
// reaching `len` units away from that point.
function arm(x, y, deg, len) {
  const t = rad(deg)
  return { cx: x + (len / 2) * Math.sin(t), cy: y - (len / 2) * Math.cos(t), r: deg, sy: len / H }
}

// Diagonal through two points (both get overshot by `over` units).
function strut(x1, y1, x2, y2, over = 0.7) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) + over * 2
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI
  return { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, r: deg, sy: len / H }
}

const GLYPHS = {
  // Constructivist A: one leaning leg meeting a straight one at the top.
  A: () => [strut(0.35, H + 0.2, 1.75, 0.15, 0.55), V(2.05)],
  H: () => [V(0.5), V(2.6), HZ(1.55, H / 2, 1.6)],
  I: () => [V(0.5)],
  K: () => [V(0.5), arm(0.95, H * 0.56, 44, 2.2), arm(0.95, H * 0.44, 136, 2.2)],
  L: () => [V(0.5), HZ(1.35, H - 0.5, 1.7)],
  M: () => [V(0.5), strut(1.0, -0.1, 1.95, H * 0.62, 0.6), strut(2.9, -0.1, 1.95, H * 0.62, 0.6), V(3.4)],
  N: () => [V(0.5), V(2.75), strut(1.0, 0, 2.25, H, 0.75)],
  T: () => [HZ(1.3, 0.5, 2.6), V(1.3, 0.75, H * 0.62)],
  V: () => [strut(0.45, -0.1, 1.45, H, 0.55), strut(2.45, -0.1, 1.45, H, 0.55)],
  W: () => [
    strut(0.45, -0.1, 1.2, H, 0.5),
    strut(1.95, 0.35, 1.2, H, 0.45),
    strut(1.95, 0.35, 2.7, H, 0.45),
    strut(3.45, -0.1, 2.7, H, 0.5),
  ],
  X: () => [strut(0.4, 0, 2.4, H, 0.6), strut(2.4, 0, 0.4, H, 0.6)],
  Y: () => [strut(0.4, -0.1, 1.4, H * 0.55, 0.4), strut(2.4, -0.1, 1.4, H * 0.55, 0.4), V(1.4, 0.5, H * 0.75)],
  1: () => [arm(0.55, 0.55, -60, 0.9), V(1.0)],
  7: () => [HZ(1.25, 0.5, 2.5), strut(2.2, 0.6, 1.0, H, 0.4)],
}

// Corners of a bar (centre, angle, length) in the same units.
function corners({ cx, cy, r, sy }) {
  const t = rad(r)
  const hw = 0.5
  const hh = (H * sy) / 2
  const ux = Math.sin(t)
  const uy = -Math.cos(t) // along the bar (towards its top)
  const px = Math.cos(t)
  const py = Math.sin(t) // across the bar
  return [
    [cx + ux * hh + px * hw, cy + uy * hh + py * hw],
    [cx + ux * hh - px * hw, cy + uy * hh - py * hw],
    [cx - ux * hh - px * hw, cy - uy * hh - py * hw],
    [cx - ux * hh + px * hw, cy - uy * hh + py * hw],
  ]
}

// Horizontal extent of a bar once the band (0 ≤ y ≤ H) has cut it.
function clippedXRange(bar) {
  let poly = corners(bar)
  const clip = (pts, keep, edgeY) => {
    const out = []
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      const ina = keep(a[1])
      const inb = keep(b[1])
      if (ina) out.push(a)
      if (ina !== inb) {
        const k = (edgeY - a[1]) / (b[1] - a[1])
        out.push([a[0] + (b[0] - a[0]) * k, edgeY])
      }
    }
    return out
  }
  poly = clip(poly, (y) => y >= 0, 0)
  poly = clip(poly, (y) => y <= H, H)
  if (!poly.length) return null
  const xs = poly.map((p) => p[0])
  return [Math.min(...xs), Math.max(...xs)]
}

/**
 * The word laid out on one line, starting at x = 0.
 * Returns { bars: [{ cx, cy, r, sy, letter, li }], width, height, letters }.
 * `li` is the letter index: the hero uses it to spread the letters apart
 * when the band is wider than the word at the height it is allowed.
 */
export function layoutWord(word = WORD) {
  const bars = []
  const ranges = [] // each letter's [x0, x1], for the plinths under the word
  let x = 0
  let li = 0
  for (const ch of String(word).toUpperCase()) {
    if (ch === ' ') {
      x += 1.2
      continue
    }
    const glyph = (GLYPHS[ch] || GLYPHS.I)()
    let lo = Infinity
    let hi = -Infinity
    for (const b of glyph) {
      const range = clippedXRange(b)
      if (!range) continue
      lo = Math.min(lo, range[0])
      hi = Math.max(hi, range[1])
    }
    for (const b of glyph) bars.push({ ...b, cx: b.cx - lo + x, letter: ch, li })
    ranges.push({ x0: x, x1: x + hi - lo })
    li += 1
    x += hi - lo + GAP
  }
  return { bars, ranges, width: Math.max(0, x - GAP), height: H, letters: li }
}

/**
 * Where the bars go when the word comes apart: a doorway. Two pillars of
 * upright bars stacked on the ground and a lintel of bars lying end to end
 * across them; the middle bar of the lintel is the keystone (the accent
 * bar). `opening` is the empty doorway between the pillars — the hero
 * darkens it and walks through it.
 *
 * Origin = the ground, centred; y grows down (so the door is at y < 0).
 * Units are bar widths at scale 1. `sy` stretches a lintel bar only when a
 * very short word leaves a single bar to span the door.
 */
export function doorSlots(n) {
  if (n <= 0) return { slots: [], width: 0, height: 0, opening: null }
  const gap = 0.05
  const p = n >= 3 ? Math.max(1, Math.floor((n - 1) / 3)) : 1
  const l = Math.max(0, n - 2 * Math.min(p, Math.floor(n / 2)))
  const pillars = Math.min(p, Math.floor(n / 2))
  const lintelSy = l === 1 ? 3.6 / H : 1
  const L = Math.max(3.2, l * H * lintelSy + Math.max(0, l - 1) * gap)
  const slots = []
  for (const side of [-1, 1]) {
    for (let j = 0; j < pillars; j += 1) {
      slots.push({ cx: side * (L / 2 - 0.5), cy: -(H / 2 + j * (H + gap)), r: 0, sy: 1 })
    }
  }
  const pillarTop = pillars * H + Math.max(0, pillars - 1) * gap
  const lintelW = l * H * lintelSy + Math.max(0, l - 1) * gap
  for (let j = 0; j < l; j += 1) {
    slots.push({
      cx: -lintelW / 2 + (H * lintelSy) / 2 + j * (H * lintelSy + gap),
      cy: -(pillarTop + gap + 0.5),
      r: 90,
      sy: lintelSy,
      key: j === Math.floor(l / 2),
    })
  }
  if (!slots.some((sl) => sl.key)) slots[slots.length - 1].key = true
  return {
    slots,
    width: L,
    height: pillarTop + gap + 1,
    opening: { x0: -L / 2 + 1, x1: L / 2 - 1, y0: -pillarTop, y1: 0 },
  }
}

/** The bar that carries the accent colour: the one nearest the middle. */
export function accentBar(layout) {
  const mid = layout.width / 2
  return layout.bars.reduce(
    (best, b, i) => (Math.abs(b.cx - mid) < Math.abs(layout.bars[best].cx - mid) ? i : best),
    0,
  )
}
