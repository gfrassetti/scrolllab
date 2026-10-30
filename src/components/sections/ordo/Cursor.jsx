import { useEffect, useRef } from 'react'
import { gsap } from '../../../lib/gsap'
import { readPlanProbe } from './planProbe'

/**
 * The site cursor. Mouse only (hover + fine pointer): nothing is mounted on the phone.
 *
 * In the hero it is a plan crosshair: a red cross at the pointer, two thin axes that run across the whole
 * screen and, to the side, the coordinates: over the plan, in metres (`X:4.20M / Y:2.85M`); outside
 * it, in px counted from the corner of the hero (they also change when the page moves). Over a link the cross
 * turns 45° (an ×). Outside the hero it is an inertial dot of ink, which over something with
 * `data-cursor="Write to us"` becomes a disc with that word.
 *
 * The native cursor is only hidden on the first movement, so without JS the pointer is not lost.
 */
// Where it becomes a crosshair: only over the drawing quadrant (the element with data-cursor-zone).
const ZONE = '[data-cursor-zone]'
const DOT_STATES = {
  dot: { width: 14, height: 14, backgroundColor: '#161513', boxShadow: 'inset 0 0 0 0px #161513' },
  ring: { width: 46, height: 46, backgroundColor: 'rgba(22,21,19,0)', boxShadow: 'inset 0 0 0 1px #161513' },
  label: { width: 96, height: 96, backgroundColor: 'rgba(22,21,19,1)', boxShadow: 'inset 0 0 0 0px #161513' },
}
const INTERACTIVE = 'a, button, [role="button"], summary, input, textarea'

export default function Cursor() {
  const crossRef = useRef(null)
  const lineH = useRef(null)
  const lineV = useRef(null)
  const point = useRef(null)
  const plus = useRef(null)
  const coords = useRef(null)
  const tipRef = useRef(null)
  const dotRoot = useRef(null)
  const dotBody = useRef(null)
  const dotLabel = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined
    const html = document.documentElement
    const cross = crossRef.current
    const root = dotRoot.current
    const body = dotBody.current
    const label = dotLabel.current
    const plusEl = plus.current
    const tip = tipRef.current

    gsap.set([cross, root], { autoAlpha: 0 })
    gsap.set(body, { xPercent: -50, yPercent: -50 }) // centred on the pointer even if its size changes
    gsap.set(plusEl, { xPercent: -50, yPercent: -50 })
    gsap.set(tip, { autoAlpha: 0 })
    const dotX = gsap.quickTo(root, 'x', { duration: 0.35, ease: 'power3' })
    const dotY = gsap.quickTo(root, 'y', { duration: 0.35, ease: 'power3' })

    let shown = false
    let mode = null // 'cross' | 'dot'
    let dotState = 'dot'
    let last = { x: 0, y: 0 }
    let overLink = false
    let tipEl = null // what is under the pointer and asks for a label (data-cursor-tip)
    let tipShown = ''

    const setMode = (next) => {
      if (next === mode) return
      mode = next
      gsap.to(cross, { autoAlpha: next === 'cross' ? 1 : 0, duration: 0.2, overwrite: 'auto' })
      gsap.to(root, { autoAlpha: next === 'dot' ? 1 : 0, duration: 0.2, overwrite: 'auto' })
    }
    const setDot = (next, text = '') => {
      if (next === dotState && label.textContent === text) return
      dotState = next
      if (text) label.textContent = text
      gsap.to(body, { ...DOT_STATES[next], duration: 0.45, ease: 'expo.out', overwrite: 'auto' })
      gsap.to(label, { autoAlpha: next === 'label' ? 1 : 0, duration: next === 'label' ? 0.3 : 0.15, delay: next === 'label' ? 0.08 : 0 })
    }

    // Paints the crosshair (or the dot) at the pointer position. The crosshair lives only inside the
    // drawing quadrant: its axes reach the edges of the quadrant and do not cross the text next to it.
    const render = () => {
      const { x, y } = last
      const rect = document.querySelector(ZONE)?.getBoundingClientRect()
      const inZone = !!rect && rect.width > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      setMode(inZone ? 'cross' : 'dot')
      if (inZone) {
        Object.assign(lineH.current.style, { left: `${rect.left}px`, width: `${rect.width}px`, transform: `translate3d(0, ${Math.round(y)}px, 0)` })
        Object.assign(lineV.current.style, { top: `${rect.top}px`, height: `${rect.height}px`, transform: `translate3d(${Math.round(x)}px, 0, 0)` })
        point.current.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
        // Over the shop floor, real metres; in the rest of the quadrant, quadrant pixels.
        const m = readPlanProbe(x, y)
        coords.current.textContent = m
          ? `X:${m.x.toFixed(2)}M\nY:${m.y.toFixed(2)}M`
          : `X:${Math.round(x - rect.left)}PX\nY:${Math.round(y - rect.top)}PX`
        // Near an edge of the viewer the coordinates move to the other side of the cross, so they are not cut off.
        coords.current.dataset.flipX = x < rect.left + 110 ? '1' : '0'
        coords.current.dataset.flipY = y > rect.bottom - 50 ? '1' : '0'
        // The label next to the crosshair (in the style of an annotated plan), if what is underneath asks for it.
        // It is read on every frame: the label can appear or go away without the mouse changing element.
        const text = tipEl?.closest('[data-cursor-tip]')?.getAttribute('data-cursor-tip') || ''
        if (text !== tipShown) {
          tipShown = text
          if (text) tip.textContent = text
          gsap.to(tip, { autoAlpha: text ? 1 : 0, duration: text ? 0.3 : 0.15, overwrite: 'auto' })
        }
        tip.dataset.flipX = x > rect.right - 240 ? '1' : '0'
      } else {
        dotX(x)
        dotY(y)
      }
    }

    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      last = { x: e.clientX, y: e.clientY }
      if (!shown) {
        shown = true
        html.classList.add('od-has-cursor')
        gsap.set(root, { x: e.clientX, y: e.clientY })
      }
      render()
    }
    // With the page moving under the mouse (scroll) the coordinates keep counting.
    const onScroll = () => shown && render()
    const onOver = (e) => {
      const target = e.target instanceof Element ? e.target : null
      const interactive = !!target?.closest(INTERACTIVE)
      overLink = interactive
      tipEl = target
      gsap.to(plusEl, { rotation: interactive ? 45 : 0, scale: interactive ? 1.3 : 1, duration: 0.4, ease: 'expo.out' })
      const tagged = target?.closest('[data-cursor]')
      if (tagged) return setDot('label', tagged.getAttribute('data-cursor'))
      setDot(interactive ? 'ring' : 'dot')
    }
    const onDown = () => {
      gsap.to(plusEl, { scale: 0.8, duration: 0.15, ease: 'power2.out' })
      gsap.to(body, { scale: 0.82, duration: 0.18, ease: 'power2.out' })
    }
    const onUp = () => {
      gsap.to(plusEl, { scale: overLink ? 1.3 : 1, duration: 0.4, ease: 'expo.out' })
      gsap.to(body, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
    }
    const onLeave = () => gsap.to([cross, root], { autoAlpha: 0, duration: 0.2, overwrite: 'auto' })
    const onEnter = () => {
      if (!shown) return
      const m = mode
      mode = null
      setMode(m)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    html.addEventListener('mouseleave', onLeave)
    html.addEventListener('mouseenter', onEnter)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      html.removeEventListener('mouseleave', onLeave)
      html.removeEventListener('mouseenter', onEnter)
      html.classList.remove('od-has-cursor')
      gsap.killTweensOf([cross, root, body, label, plusEl, tip])
    }
  }, [])

  return (
    <div className="od-cursor" aria-hidden="true">
      <div ref={crossRef} className="od-cross">
        <span ref={lineH} className="od-cross__h" />
        <span ref={lineV} className="od-cross__v" />
        <span ref={point} className="od-cross__pt">
          <span ref={plus} className="od-cross__plus" />
          <span ref={coords} className="od-cross__coords" data-flip-x="0" data-flip-y="0" />
          <span ref={tipRef} className="od-cross__tip" />
        </span>
      </div>
      <div ref={dotRoot} className="od-cursor__dot">
        <div ref={dotBody} className="od-cursor__body">
          <span ref={dotLabel} className="od-cursor__label" />
        </div>
      </div>
    </div>
  )
}
