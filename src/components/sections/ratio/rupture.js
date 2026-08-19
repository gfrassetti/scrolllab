import { useSyncExternalStore } from 'react'

/**
 * RUPTURE — page-wide crazy mode.
 *
 * It lives in a module store instead of a React context because the sections
 * that read it are sold one by one: dropped into a builder composition there
 * is no shared ancestor to hold a provider, and a nav cannot wrap its
 * siblings. A store keeps every mounted section in sync with no provider.
 *
 * Mirrored on `<html data-ratio-rupture>` so CSS can tint the page and
 * reveal stickers without React re-rendering anything mid-scroll.
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

/**
 * Native cursor over the egg. FourPlates pins a layer on top of the hero,
 * so CSS cursor on the button never wins — we hit-test the chip rects and
 * paint a diamond on <html> instead. Not a hand: a registration mark.
 */
let cursorBinds = 0
let cursorStyle = null
let cursorOn = false

function diamondCursorUrl() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  ctx.translate(16, 16)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = '#16110e'
  ctx.fillRect(-8, -8, 16, 16)
  ctx.fillStyle = '#ebe6dc'
  ctx.fillRect(-5.5, -5.5, 11, 11)
  return canvas.toDataURL('image/png')
}

function eggUnderPoint(x, y) {
  for (const el of document.querySelectorAll('[data-rupture-hit]')) {
    const r = el.getBoundingClientRect()
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true
  }
  return false
}

function onCursorMove(e) {
  const next = eggUnderPoint(e.clientX, e.clientY)
  if (next === cursorOn) return
  cursorOn = next
  document.documentElement.classList.toggle('cursor-egg', next)
}

export function bindRuptureCursor() {
  if (typeof window === 'undefined') return () => {}
  if (cursorBinds === 0) {
    const url = diamondCursorUrl()
    cursorStyle = document.createElement('style')
    cursorStyle.setAttribute('data-rupture-cursor', '')
    cursorStyle.textContent = `
      [data-rupture-hit] {
        cursor: url("${url}") 16 16, crosshair !important;
      }
      html.cursor-egg,
      html.cursor-egg * {
        cursor: url("${url}") 16 16, crosshair !important;
      }
    `
    document.head.appendChild(cursorStyle)
    window.addEventListener('pointermove', onCursorMove, { passive: true })
  }
  cursorBinds += 1
  return () => {
    cursorBinds -= 1
    if (cursorBinds > 0) return
    window.removeEventListener('pointermove', onCursorMove)
    cursorStyle?.remove()
    cursorStyle = null
    cursorOn = false
    document.documentElement.classList.remove('cursor-egg')
  }
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
