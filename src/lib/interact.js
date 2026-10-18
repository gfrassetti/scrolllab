import { gsap } from './gsap'
import { prefersReducedMotion, trackPointer } from './motion'

/**
 * interact — the small answers a page gives to the pointer, shared by every
 * template: a button that leans toward the cursor, a picture that tilts in the
 * hand, a headline whose letters lean after you, photos at different depths,
 * a badge that follows the cursor over what can be opened or dragged.
 *
 * Everything is subtle on purpose (a few pixels, a few degrees) and shares one
 * ticker per page section. It reads the pointer through `trackPointer()`, so a
 * finger on a phone drives `depth`, `lean` and `frame` the same way; what only
 * makes sense with a hovering mouse (`magnetic`, `tilt`, `hover`, `badge`)
 * switches itself off without one.
 *
 *   const fx = pointerFx(sectionEl)
 *   fx.magnetic(ctaEl)
 *   fx.tilt([...figureEls], { max: 5 })
 *   fx.lean(split.chars)
 *   fx.depth([{ el: bgEl, amount: 18 }, { el: titleEl, amount: -8 }])
 *   return fx.dispose
 */

const hasMouse = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

const center = (el) => {
  const r = el.getBoundingClientRect()
  return {
    cx: r.left + r.width / 2 - (gsap.getProperty(el, 'x') || 0),
    cy: r.top + r.height / 2 - (gsap.getProperty(el, 'y') || 0),
    w: r.width,
    h: r.height,
    r,
  }
}

const list = (target) => (Array.isArray(target) ? target : target ? [target] : []).filter(Boolean)

export function pointerFx(root) {
  // «reducir movimiento» pide una página quieta: nada de esto
  if (prefersReducedMotion() || !root) return { magnetic() {}, tilt() {}, hover() {}, frame() {}, lean() {}, depth() {}, badge() {}, dispose() {} }

  const pointer = trackPointer()
  const jobs = []
  let onScreen = true
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting
  })
  io.observe(root)

  const tick = () => {
    if (!onScreen) return
    for (const job of jobs) job(pointer)
  }
  gsap.ticker.add(tick)
  const cleanups = []

  return {
    /**
     * The element leans toward the cursor when it comes close: `pull` is the
     * share of the distance it follows, `reach` how many px around it count.
     */
    magnetic(target, { pull = 0.3, reach = 80 } = {}) {
      if (!hasMouse()) return
      for (const el of list(target)) {
        const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
        const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
        jobs.push((p) => {
          const { cx, cy, w, h } = center(el)
          const dx = p.clientX - cx
          const dy = p.clientY - cy
          const inside = Math.abs(dx) < w / 2 + reach && Math.abs(dy) < h / 2 + reach
          x(inside ? dx * pull : 0)
          y(inside ? dy * pull : 0)
        })
        cleanups.push(() => gsap.set(el, { x: 0, y: 0 }))
      }
    },

    /**
     * The element tilts toward the pointer while it is over it (a card in the
     * hand). Pass `lift` (px) and / or `scale` to also raise or grow it; leave
     * them out when the element's y / scale belong to a scroll animation.
     */
    tilt(target, { max = 5, lift, scale } = {}) {
      if (!hasMouse()) return
      for (const el of list(target)) {
        gsap.set(el, { transformPerspective: 1000 })
        const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3.out' })
        const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3.out' })
        const yy = lift != null ? gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' }) : null
        const sc = scale != null ? gsap.quickTo(el, 'scale', { duration: 0.7, ease: 'power3.out' }) : null
        jobs.push((p) => {
          const { r } = center(el)
          const nx = (p.clientX - r.left) / r.width
          const ny = (p.clientY - r.top) / r.height
          const over = nx > 0 && nx < 1 && ny > 0 && ny < 1
          ry(over ? (nx - 0.5) * 2 * max : 0)
          rx(over ? -(ny - 0.5) * 2 * max : 0)
          yy?.(over ? -lift : 0)
          sc?.(over ? scale : 1)
        })
        cleanups.push(() => gsap.set(el, { rotationX: 0, rotationY: 0, ...(lift != null ? { y: 0 } : {}), ...(scale != null ? { scale: 1 } : {}) }))
      }
    },

    /** Runs `fn(pointer)` every frame while the section is on screen (for effects that don't fit the helpers). */
    frame(fn) {
      jobs.push(fn)
    },

    /** Calls `enter()` when the pointer comes onto the element and `leave()` when it goes off. */
    hover(el, { enter, leave } = {}) {
      if (!el || !hasMouse()) return
      let inside = false
      jobs.push((p) => {
        const r = el.getBoundingClientRect()
        const now = p.clientX >= r.left && p.clientX <= r.right && p.clientY >= r.top && p.clientY <= r.bottom
        if (now === inside) return
        inside = now
        if (now) enter?.()
        else leave?.()
      })
    },

    /**
     * Letters (or any list of elements) lean away from the cursor, the nearest
     * ones the most: `reach` px around the pointer, `push` px at the closest.
     */
    lean(targets, { reach = 150, push = 14, rotate = 5 } = {}) {
      const items = list(targets).map((el) => ({
        el,
        x: gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' }),
        rot: gsap.quickTo(el, 'rotation', { duration: 0.7, ease: 'power3.out' }),
        cx: 0,
        cy: 0,
      }))
      const measure = () => {
        for (const it of items) {
          const c = center(it.el)
          it.cx = c.cx
          it.cy = c.cy
        }
      }
      const later = gsap.delayedCall(1.6, measure)
      window.addEventListener('resize', measure)
      jobs.push((p) => {
        for (const it of items) {
          const dx = it.cx - p.clientX
          const dy = it.cy - p.clientY
          const dist = Math.hypot(dx, dy) || 1
          const f = Math.max(0, 1 - dist / reach)
          const k = f * f
          it.x((dx / dist) * push * k)
          it.y((dy / dist) * push * k)
          it.rot((dx > 0 ? 1 : -1) * rotate * k)
        }
      })
      cleanups.push(() => {
        later.kill()
        window.removeEventListener('resize', measure)
        for (const it of items) gsap.set(it.el, { x: 0, y: 0, rotation: 0 })
      })
    },

    /** Layers drift by `amount` px (negative = the other way) as the pointer crosses the screen. */
    depth(layers) {
      const items = layers
        .filter((l) => l.el)
        .map((l) => ({
          amount: l.amount,
          x: gsap.quickTo(l.el, 'x', { duration: 1.1, ease: 'power3.out' }),
          y: gsap.quickTo(l.el, 'y', { duration: 1.1, ease: 'power3.out' }),
          el: l.el,
        }))
      jobs.push((p) => {
        for (const it of items) {
          it.x(p.x * it.amount)
          it.y(p.y * it.amount * 0.6)
        }
      })
      cleanups.push(() => items.forEach((it) => gsap.set(it.el, { x: 0, y: 0 })))
    },

    /**
     * A small round badge that follows the cursor over `selector` inside the
     * section: an arrow for what opens, a pair of arrows for what drags. Mouse
     * only. No words, so there is nothing to translate.
     */
    badge(selector = '[data-cursor]') {
      if (!hasMouse()) return
      const bubble = getBadge()
      const over = (e) => {
        const el = e.target.closest?.(selector)
        if (el) bubble.show(el.getAttribute('data-cursor') || 'open')
        else bubble.hide()
      }
      const move = (e) => bubble.move(e.clientX, e.clientY)
      const leave = () => bubble.hide()
      root.addEventListener('pointerover', over)
      root.addEventListener('pointermove', move)
      root.addEventListener('pointerleave', leave)
      cleanups.push(() => {
        root.removeEventListener('pointerover', over)
        root.removeEventListener('pointermove', move)
        root.removeEventListener('pointerleave', leave)
        bubble.hide()
      })
    },

    dispose() {
      gsap.ticker.remove(tick)
      io.disconnect()
      pointer.dispose?.()
      cleanups.forEach((fn) => fn())
    },
  }
}

// One badge for the whole page (the sections share it).
let badge = null
const GLYPHS = {
  open: '<path d="M7 17 17 7M9 7h8v8" />',
  drag: '<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" />',
  plus: '<path d="M12 5v14M5 12h14" />',
}

function getBadge() {
  if (badge) return badge
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText =
    'position:fixed;left:0;top:0;z-index:9990;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;pointer-events:none;display:flex;align-items:center;justify-content:center;background:#fff;color:#0b0b0d;mix-blend-mode:difference;opacity:0;transform:scale(0.4);will-change:transform,opacity'
  el.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>'
  document.body.appendChild(el)
  const svg = el.querySelector('svg')
  const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' })
  const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' })
  let shown = false
  badge = {
    move(cx, cy) {
      x(cx)
      y(cy)
    },
    show(kind) {
      svg.innerHTML = GLYPHS[kind] || GLYPHS.open
      if (shown) return
      shown = true
      gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2)', overwrite: 'auto' })
    },
    hide() {
      if (!shown) return
      shown = false
      gsap.to(el, { autoAlpha: 0, scale: 0.4, duration: 0.25, ease: 'power2.in', overwrite: 'auto' })
    },
  }
  return badge
}
