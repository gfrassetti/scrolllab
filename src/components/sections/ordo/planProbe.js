/**
 * A small bridge between the hero and the cursor: the hero registers how to turn a screen point into
 * plan metres, and the cursor crosshair uses it to show real coordinates (X:4.20M) instead of
 * pixels. With no hero mounted, the cursor goes back to px.
 */
let probe = null

export function setPlanProbe(fn) {
  probe = fn
}

/** Metres of the plan under the point (viewport px), or null if there is no plan underneath. */
export function readPlanProbe(clientX, clientY) {
  return probe ? probe(clientX, clientY) : null
}
