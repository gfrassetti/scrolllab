/** SVG path length for CSS offset-path (Beat engine). */
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

/** Path in the container’s own box, starting at the centre (Readymag). */
export function boxPath(boxW, boxH, deltas) {
  const cx = boxW / 2
  const cy = boxH / 2
  return polyPath(deltas.map((p) => ({ x: cx + p.x, y: cy + p.y })))
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

export function supportsOffsetPath() {
  return typeof CSS !== 'undefined' && CSS.supports?.('offset-path', 'path("M0 0")')
}

/**
 * Paint a Readymag `.animation-container`:
 * offset-path, offset-rotate: 0deg, offset-distance, transform: rotate() scale(1), opacity: 1.
 */
export function applyOffset(el, d, distance, rotate = 0) {
  const dist = Math.max(0, distance)
  el.style.offsetPath = `path("${d}")`
  el.style.offsetRotate = '0deg'
  el.style.offsetDistance = `${dist}px`
  el.style.opacity = '1'
  if (supportsOffsetPath()) {
    el.style.transform = `rotate(${rotate}deg) scale(1)`
    return
  }
  const p = svgPath(d)
  const len = p.getTotalLength()
  const a = p.getPointAtLength(0)
  const pt = p.getPointAtLength(Math.min(dist, len))
  el.style.transform = `translate(${pt.x - a.x}px, ${pt.y - a.y}px) rotate(${rotate}deg) scale(1)`
}

export function sizeContainer(el, { w, h, left, top, marginLeft = 0, z = 1 }) {
  el.style.position = 'absolute'
  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.width = `${w}px`
  el.style.height = `${h}px`
  el.style.right = 'auto'
  el.style.bottom = 'auto'
  el.style.marginLeft = `${marginLeft}px`
  el.style.marginTop = '0px'
  el.style.zIndex = String(z)
  el.style.opacity = '1'
}
