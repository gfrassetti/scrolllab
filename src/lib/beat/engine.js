/**
 * SCROLLLAB Beat engine — seek + CSS offset-path.
 *
 * Learned from Readymag’s viewer (not shipped): the live ref does NOT use
 * GSAP / MotionPathPlugin / anime.js. It uses:
 *   1. CSS Motion Path — offset-path + offset-distance + offset-rotate: 0deg
 *   2. Quadratic ease-in / ease-out inside timeline.seek() (not GSAP power2)
 *   3. bezier-easing only for custom cubic arrays
 *
 * Public API: src/lib/beat/index.js · docs: docs/scrolllab-beat.md
 */
import { pathLength, supportsOffsetPath } from './motionPath.js'

export const MAG_W = 1024
export const MAG_SCROLL = 6901

export function magScale(width) {
  return width / MAG_W
}

/** c-JXU5QGRQ.js getBezierPath */
export function getBezierPath(start, c1, c2, end, origin = { x: 0, y: 0 }) {
  const o = origin
  return `M ${start.x + o.x} ${start.y + o.y} C ${c1.x + o.x} ${c1.y + o.y}, ${c2.x + o.x} ${c2.y + o.y}, ${end.x + o.x} ${end.y + o.y}`
}

/** c-JXU5QGRQ.js estimateCubicBezierLength — de Casteljau subdivision */
export function estimateCubicBezierLength(p0, p1, p2, p3, eps = 0.01) {
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  const split = (a, b, c, d, t) => {
    const ab = lerp(a, b, t)
    const bc = lerp(b, c, t)
    const cd = lerp(c, d, t)
    const abbc = lerp(ab, bc, t)
    const bccd = lerp(bc, cd, t)
    const mid = lerp(abbc, bccd, t)
    return [mid, ab, abbc, bccd, cd]
  }
  const measure = (a, b, c, d, t) => {
    const parts = split(a, b, c, d, 0.5)
    const left = dist(a, parts[1]) + dist(parts[1], parts[2]) + dist(parts[2], parts[0])
    const right = dist(parts[0], parts[3]) + dist(parts[3], parts[4]) + dist(parts[4], d)
    const chord = dist(a, d)
    const sum = left + right
    if (Math.abs(sum - chord) > t) {
      return measure(a, parts[1], parts[2], parts[0], t) + measure(parts[0], parts[3], parts[4], d, t)
    }
    return sum
  }
  return measure(p0, p1, p2, p3, eps)
}

/** c-3UUYSFCD.js seek() mixer — not GSAP power2 */
export function rmEase(t, acc) {
  if (Array.isArray(acc) && acc.length === 4) {
    return bezierY(acc, t)
  }
  if (!acc || acc === 'none') return t
  if (acc === 'ease-in') return t * t
  if (acc === 'ease-out') return t * (2 - t)
  if (acc === 'ease-both') return t < 0.5 ? t * t * 2 : 2 * t * (2 - t) - 1
  return t
}

function bezierY([x1, y1, x2, y2], t) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  let u = t
  for (let i = 0; i < 8; i += 1) {
    const x = ((ax * u + bx) * u + cx) * u - t
    const dx = (3 * ax * u + 2 * bx) * u + cx
    if (Math.abs(dx) < 1e-6) break
    u -= x / dx
  }
  return ((ay * u + by) * u + cy) * u
}

function mix(a, b, t, acc) {
  if (a === b) return a
  return a + (b - a) * rmEase(t, acc)
}

/** Scroll step duration in screen px. Idle steps last 300/speed. */
function calcedDuration(step, prev) {
  const dx = (step.dx ?? 0) - (prev.dx ?? 0)
  const dy = (step.dy ?? 0) - (prev.dy ?? 0)
  const raw = dx !== 0 || dy !== 0
    ? Math.hypot(dx, dy) / (step.speed || 1)
    : 300 / (step.speed || 1)
  return Math.ceil(raw)
}

/**
 * Scale mag dx/dy, fill curves, compute calcedDelay / calcedDuration.
 * Mirrors getNormalizedAnimation for type === 'scroll'.
 */
export function normalizeScrollSteps(rawSteps, s) {
  const out = []
  let prev = { dx: 0, dy: 0 }
  rawSteps.forEach((raw, i) => {
    const step = {
      use_move: raw.use_move !== false && (raw.dx != null || raw.dy != null),
      use_rotate: raw.rot != null || raw.use_rotate,
      dx: (raw.dx ?? prev.dx) * s,
      dy: (raw.dy ?? prev.dy) * s,
      from_rotate: raw.from ?? 0,
      rotate: raw.rot ?? prev.rotate ?? 0,
      from_opacity: 100,
      opacity: 100,
      from_scale: 100,
      scale: 100,
      speed: raw.speed || 1,
      acceleration: raw.acc || 'none',
      delay_px: raw.delay_px,
    }
    if (!step.use_move) {
      step.dx = prev.dx
      step.dy = prev.dy
    }
    step.curve = {
      c1: { x: prev.dx, y: prev.dy },
      c2: { x: step.dx, y: step.dy },
    }
    step.calcedDuration = calcedDuration(step, prev)
    step.calcedDelay = step.delay_px ? step.delay_px * s : 0
    if (i === 0) step.from_rotate = raw.from ?? 0
    out.push(step)
    prev = step
  })
  return out
}

export function createOffsetPath(el, steps, origin) {
  const segs = []
  let cursor = { x: 0, y: 0 }
  steps.forEach((step) => {
    const dest = { x: step.dx ?? 0, y: step.dy ?? 0 }
    if (step.use_move && step.curve) {
      segs.push(getBezierPath(cursor, step.curve.c1, step.curve.c2, dest, origin))
      cursor = dest
    } else {
      segs.push(`M ${cursor.x + origin.x} ${cursor.y + origin.y}`)
    }
  })
  const d = segs.join(' ')
  el.style.setProperty('offset-path', segs.length ? `path('${d}')` : 'none')
  el.style.setProperty('offset-rotate', '0deg')
  return d
}

export function generateScrollFrames(steps) {
  let t = 0
  let dist = 0
  let cursor = { x: 0, y: 0 }
  const frames = [
    {
      ind: 0,
      isDelay: false,
      params: {
        dx: 0,
        dy: 0,
        opacity: steps[0]?.from_opacity ?? 100,
        rotate: steps[0]?.from_rotate ?? 0,
        scale: steps[0]?.from_scale ?? 100,
        offsetDistance: 0,
      },
    },
  ]
  let last = frames[0].params
  steps.forEach((step) => {
    if (step.calcedDelay) {
      frames.push({ ind: t + 1, isDelay: true, params: last })
      t += step.calcedDelay
    }
    if (step.use_move && step.curve) {
      const dest = { x: step.dx, y: step.dy }
      dist += estimateCubicBezierLength(cursor, step.curve.c1, step.curve.c2, dest)
      cursor = dest
    }
    last = {
      dx: step.dx,
      dy: step.dy,
      opacity: step.opacity,
      rotate: step.rotate,
      scale: step.scale,
      acceleration: step.acceleration,
      offsetDistance: dist,
    }
    frames.push({ ind: t + 1, isDelay: false, params: last })
    t += step.calcedDuration
  })
  return { frames, duration: t }
}

function paint(el, params, pathD, offsetOn) {
  const rotate = params.rotate ?? 0
  const scale = (params.scale ?? 100) / 100
  el.style.opacity = params.opacity === 0 ? '0' : String(params.opacity / 100)
  if (offsetOn) {
    el.style.setProperty('offset-distance', `${params.offsetDistance}px`)
    el.style.transform = `rotate(${rotate}deg) scale(${scale})`
    return
  }
  const len = pathLength(pathD) || 1
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  p.setAttribute('d', pathD)
  const a = p.getPointAtLength(0)
  const pt = p.getPointAtLength(Math.min(params.offsetDistance, len))
  el.style.transform = `translate(${pt.x - a.x}px, ${pt.y - a.y}px) rotate(${rotate}deg) scale(${scale})`
}

function interp(from, to, local, span) {
  if (local === 0) return from
  if (local === span - 1) return to
  const t = local / (span - 1)
  const acc = to.acceleration
  return {
    dx: mix(from.dx, to.dx, t, acc),
    dy: mix(from.dy, to.dy, t, acc),
    opacity: mix(from.opacity, to.opacity, t, acc),
    rotate: mix(from.rotate, to.rotate, t, acc),
    scale: mix(from.scale, to.scale, t, acc),
    offsetDistance: mix(from.offsetDistance, to.offsetDistance, t, acc),
  }
}

/** timeline.seek(scrollPx) — isFixed widgets pass raw scrollTop. */
export function seek(scrollPx, frames, duration) {
  const e = Math.max(Math.min(scrollPx, duration), 0)
  const n = frames.length
  let t = 0
  for (; t < n; t += 1) {
    if (frames[t].ind > e) break
  }
  t -= 1
  if (t < 0) t = 0
  if (frames[t].isDelay) return interp(frames[t].params, frames[t].params, 0, 1)
  const start = t ? frames[t].ind - 1 : 0
  const end = t === n - 1 ? duration : frames[t + 1].ind - 1
  const prev = frames[t ? t - 1 : 0].params
  return interp(prev, frames[t].params, e - start, end - start + 1)
}

export function attachScroll(el, rawSteps, s) {
  const steps = normalizeScrollSteps(rawSteps, s)
  const origin = { x: el.offsetWidth / 2, y: el.offsetHeight / 2 }
  const offsetOn = supportsOffsetPath()
  const d = createOffsetPath(el, steps, origin)
  const { frames, duration } = generateScrollFrames(steps)
  const apply = (px) => paint(el, seek(px, frames, duration), d, offsetOn)
  apply(0)
  return { seek: apply, duration, frames }
}

export function placeMag(el, { x, y, w, h, z }, s) {
  el.style.position = 'absolute'
  el.style.left = '50%'
  el.style.top = 'auto'
  el.style.right = 'auto'
  el.style.width = `${w * s}px`
  el.style.height = `${h * s}px`
  el.style.bottom = `${y * s}px`
  el.style.marginLeft = `${x * s - (w * s) / 2}px`
  el.style.marginTop = '0px'
  el.style.zIndex = String(z)
  el.style.pointerEvents = 'none'
}

export function nestInner(el) {
  el.style.position = 'absolute'
  el.style.left = '0px'
  el.style.top = '0px'
  el.style.right = 'auto'
  el.style.bottom = 'auto'
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.marginLeft = '0px'
  el.style.marginTop = '0px'
}

/**
 * On-Load: CSS @keyframes like generateKeyframeAnimation.
 * Delay is baked as a hold at 0%..(delay/total)%.
 */
export function playLoadPath(el, step, s) {
  if (!step) return
  const steps = normalizeScrollSteps(
    [{ dx: step.dx, dy: step.dy, rot: step.rot, from: step.from, acc: step.acc, speed: 1 }],
    s,
  )
  const origin = { x: el.offsetWidth / 2, y: el.offsetHeight / 2 }
  createOffsetPath(el, steps, origin)
  const hop = steps[0]
  const delay = step.delay || 0
  const dur = step.dur ?? 0.6
  const total = delay + dur
  const hold = total <= 0 ? 0 : (delay / total) * 100
  const name = `rm_load_${Math.random().toString(36).slice(2, 8)}`
  const dist = estimateCubicBezierLength(
    { x: 0, y: 0 },
    hop.curve.c1,
    hop.curve.c2,
    { x: hop.dx, y: hop.dy },
  )
  const fromRot = step.from ?? 0
  const toRot = step.rot ?? 0
  const style = document.createElement('style')
  // On Load: start at the step offset (hop) and land at rest.
  style.textContent = `@keyframes ${name} {
  0%, ${hold}% { transform: rotate(${fromRot}deg) scale(1); opacity: 1; offset-distance: ${dist}px; animation-timing-function: ease-out; }
  100% { transform: rotate(${toRot}deg) scale(1); opacity: 1; offset-distance: 0px; }
}`
  el.appendChild(style)
  el.style.animation = `${name} ${total}s ease-out 1 both`
}

export function openPinOverflow(self) {
  const el = self.pin
  if (!el) return
  el.style.overflow = 'visible'
  if (el.parentElement) el.parentElement.style.overflow = 'visible'
}
