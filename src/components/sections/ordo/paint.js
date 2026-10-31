import { gsap } from '../../../lib/gsap'

/**
 * "Painted in": an element appears swept from left to right by a stroke with an irregular edge,
 * like a pass of pencil or brush (instead of a fade). It is a CSS mask (`.od-paint` in
 * ordo.css) that is moved with the `--paint` variable (100 hidden → 0 whole).
 *
 *   hidePaint(targets)                 before showing
 *   paint(targets, { stagger, delay }) paints it in; returns the tween
 *
 * With "reduce motion" it shows directly, with no sweep.
 */
export function hidePaint(targets) {
  gsap.set(targets, { '--paint': 100 })
}

export function paint(targets, { duration = 0.9, stagger = 0.08, delay = 0, calm = false } = {}) {
  if (calm) return gsap.set(targets, { '--paint': 0 })
  return gsap.fromTo(targets, { '--paint': 100 }, { '--paint': 0, duration, stagger, delay, ease: 'power2.inOut', overwrite: 'auto' })
}
