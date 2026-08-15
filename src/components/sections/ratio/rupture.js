import { useSyncExternalStore } from 'react'

/**
 * RUPTURE — the page-wide switch that throws the grid out of true.
 *
 * It lives in a module store instead of a React context because the sections
 * that read it are sold one by one: dropped into a builder composition there
 * is no shared ancestor to hold a provider, and a nav cannot wrap its
 * siblings. A store keeps every mounted section in sync with no provider.
 *
 * The state is also mirrored on `<html data-ratio-rupture>` so the CSS in
 * index.css can tilt blocks and open the width axis without React re-rendering
 * anything mid-scroll.
 */
const listeners = new Set()
let ruptured = false

function paint() {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.ratioRupture = ruptured ? 'on' : 'off'
}

function subscribe(listener) {
  listeners.add(listener)
  paint()
  return () => {
    listeners.delete(listener)
    // Leaving the page must not leave the attribute (and the tilt) behind.
    if (!listeners.size) {
      ruptured = false
      paint()
    }
  }
}

export function isRuptured() {
  return ruptured
}

export function setRupture(next) {
  const value = Boolean(next)
  if (value === ruptured) return
  ruptured = value
  paint()
  listeners.forEach((listener) => listener())
}

export function toggleRupture() {
  setRupture(!ruptured)
}

export function useRupture() {
  return useSyncExternalStore(subscribe, isRuptured, () => false)
}

/**
 * Deterministic angles: random per-render tilts would resettle on every
 * toggle and read as noise instead of a composition that was pushed over.
 */
const ANGLES = [-2.6, 1.8, -1.1, 3.2, -3.4, 0.9, 2.4, -1.9, 1.3, -2.2]
const SHIFTS = [0.8, -1.4, 1.9, -0.6, 1.2, -2.1, 0.4, 1.6, -1.1, 2.3]

/** Inline custom properties for a block that leans when rupture is on. */
export function tilt(seed = 0, strength = 1) {
  const angle = ANGLES[Math.abs(seed) % ANGLES.length] * strength
  const shift = SHIFTS[Math.abs(seed) % SHIFTS.length] * strength
  return {
    '--ratio-tilt': `${angle.toFixed(2)}deg`,
    '--ratio-shift-x': `${shift.toFixed(2)}rem`,
  }
}
