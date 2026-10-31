import { gsap } from '../../../lib/gsap'

/** A circle as a path (an arc pair), so it can be drawn like any other line. */
export const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
/** A rectangle as a path. */
export const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`

export function hideDrawn(root) {
  if (!root) return
  gsap.set(root.querySelectorAll('[data-draw]'), { strokeDasharray: 1, strokeDashoffset: 1 })
  gsap.set(root.querySelectorAll('[data-fade]'), { autoAlpha: 0 })
}

/** Draws the lines one after the other, then the labels and fills. The caller sets the duration with `.duration(s)`. */
export function drawTimeline(root, vars = {}) {
  const t = gsap.timeline({ defaults: { ease: 'none' }, ...vars })
  const lines = root.querySelectorAll('[data-draw]')
  const fades = root.querySelectorAll('[data-fade]')
  if (lines.length) t.to(lines, { strokeDashoffset: 0, duration: 1, ease: 'power1.inOut', stagger: { amount: 1.4 } }, 0)
  if (fades.length) t.to(fades, { autoAlpha: 1, duration: 0.6, ease: 'power1.out', stagger: { amount: 0.8 } }, 0.5)
  return t
}
