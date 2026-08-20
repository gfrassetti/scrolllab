/**
 * Exponential damp — same feel as Three.MathUtils.damp / KPR camera.
 * @param {number} current
 * @param {number} target
 * @param {number} lambda — higher = snappier (KPR uses ~3)
 * @param {number} dt — seconds
 */
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
