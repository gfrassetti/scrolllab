import { useSyncExternalStore } from 'react'
import { REDUCED_MOTION_QUERY, prefersReducedMotion } from '../lib/motion'

function subscribe(callback) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

/**
 * Reactive flag: true while the calm version runs (see src/lib/motion.js).
 * Sections use it to render their calm layout instead of the scrubbed one.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}
