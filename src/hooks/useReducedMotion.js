import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/**
 * Reactive `prefers-reduced-motion` flag.
 * Sections use it to degrade gracefully into a static layout.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
