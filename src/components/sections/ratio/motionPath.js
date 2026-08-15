/** SVG path length for CSS offset-path. */
export function pathLength(d) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  p.setAttribute('d', d)
  return p.getTotalLength()
}

function svgPath(d) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  p.setAttribute('d', d)
  return p
}

/**
 * Readymag-style polyline: degenerate cubics so DevTools shows
 * `offset-path: path("M … C …")` like the reference.
 */
export function polyPath(points) {
  const fmt = (n) => Number(n.toFixed(3))
  const [s, ...rest] = points
  let d = `M ${fmt(s.x)} ${fmt(s.y)}`
  let prev = s
  rest.forEach((pt) => {
    d += ` C ${fmt(prev.x)} ${fmt(prev.y)} ${fmt(pt.x)} ${fmt(pt.y)} ${fmt(pt.x)} ${fmt(pt.y)}`
    prev = pt
  })
  return d
}

export function distAlong(points, index) {
  let d = 0
  for (let i = 1; i <= index && i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    d += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return d
}

/** Piecewise-linear mapping of scroll progress → distance. */
export function remapStops(progress, stops) {
  if (progress <= stops[0].p) return stops[0].d
  const last = stops[stops.length - 1]
  if (progress >= last.p) return last.d
  for (let i = 1; i < stops.length; i += 1) {
    const a = stops[i - 1]
    const b = stops[i]
    if (progress <= b.p) {
      const t = (progress - a.p) / Math.max(0.0001, b.p - a.p)
      return a.d + (b.d - a.d) * t
    }
  }
  return last.d
}

export function supportsOffsetPath() {
  return typeof CSS !== 'undefined' && CSS.supports?.('offset-path', 'path("M0 0")')
}

/**
 * Drive a glyph along a path. Native CSS offset-path when the browser
 * has it; SVG getPointAtLength as the polyfill (same motion either way).
 */
export function applyOffset(el, d, distance, rotate = 0) {
  const dist = Math.max(0, distance)
  if (supportsOffsetPath()) {
    el.style.offsetPath = `path("${d}")`
    el.style.offsetRotate = '0deg'
    el.style.offsetAnchor = 'center'
    el.style.offsetDistance = `${dist}px`
    el.style.transform = rotate ? `rotate(${rotate}deg)` : ''
    return
  }
  const p = svgPath(d)
  const len = p.getTotalLength()
  const pt = p.getPointAtLength(Math.min(dist, len))
  el.style.offsetPath = ''
  el.style.transform = `translate(${pt.x}px, ${pt.y}px) rotate(${rotate}deg)`
}

export function mountOffsetPath(el, d) {
  el.style.position = 'absolute'
  el.style.left = '0'
  el.style.top = '0'
  el.style.right = 'auto'
  el.style.bottom = 'auto'
  el.style.margin = '0'
  applyOffset(el, d, 0, 0)
}

export function clearOffsetPath(el) {
  el.style.position = ''
  el.style.left = ''
  el.style.top = ''
  el.style.right = ''
  el.style.bottom = ''
  el.style.margin = ''
  el.style.offsetPath = ''
  el.style.offsetRotate = ''
  el.style.offsetAnchor = ''
  el.style.offsetDistance = ''
  el.style.transform = ''
  el.style.rotate = ''
}
