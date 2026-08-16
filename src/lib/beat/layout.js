/**
 * Pack type on the mag canvas (width 1024) and derive dx from rest → target.
 * Beat recipes are absolute from rest: if the word changes, recompute dx.
 * Do not keep a sidecar JSON — the words are the config.
 */

export function glyphsOf(word) {
  return Array.from(word || '').filter((ch) => ch !== ' ')
}

/** Place boxes left-to-right. x is the widget centre (same as placeMag). */
export function packLine(widths, { left = 90, tracking = -8 } = {}) {
  let cursor = left
  const slots = widths.map((raw) => {
    const w = Math.max(Number(raw) || 0, 1)
    const x = cursor + w / 2
    cursor += w + tracking
    return { x, w }
  })
  const width = slots.length ? Math.max(0, cursor - left - tracking) : 0
  return { slots, width }
}

export function fitScale(width, maxWidth) {
  if (!width || !maxWidth || width <= maxWidth) return 1
  return maxWidth / width
}

/** Destination dx from a rest pose to a target centre (both mag px). */
export function enterDx(restX, targetX) {
  return targetX - restX
}

export function magFromPx(px, scale) {
  return px / Math.max(scale, 0.0001)
}
