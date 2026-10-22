import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { readPlanProbe } from './planProbe'

/**
 * El cursor de elStudio. Solo con mouse (hover + puntero fino): en el teléfono no se monta nada.
 *
 * En el hero es una mira de plano: una cruz roja en el puntero, dos ejes finos que cruzan toda la
 * pantalla y, al costado, las coordenadas: sobre el plano, en metros (`X:4.20M / Y:2.85M`); fuera de
 * él, en px contados desde la esquina del hero (cambian también cuando la página se mueve). Sobre un link la cruz se
 * gira a 45° (una ×). Fuera del hero es un punto de tinta con inercia, que sobre algo con
 * `data-cursor="Ver"` se vuelve un disco con esa palabra.
 *
 * El cursor nativo se oculta recién con el primer movimiento, así que sin JS no se pierde el puntero.
 */
// Dónde se vuelve mira: solo sobre el cuadrante del dibujo (el elemento con data-cursor-zone).
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
    gsap.set(body, { xPercent: -50, yPercent: -50 }) // centrado sobre el puntero aunque cambie de tamaño
    gsap.set(plusEl, { xPercent: -50, yPercent: -50 })
    gsap.set(tip, { autoAlpha: 0 })
    const dotX = gsap.quickTo(root, 'x', { duration: 0.35, ease: 'power3' })
    const dotY = gsap.quickTo(root, 'y', { duration: 0.35, ease: 'power3' })

    let shown = false
    let mode = null // 'cross' | 'dot'
    let dotState = 'dot'
    let last = { x: 0, y: 0 }
    let overLink = false
    let tipEl = null // lo que está bajo el puntero y pide un cartel (data-cursor-tip)
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

    // Pinta la mira (o el punto) en la posición del puntero. La mira vive solo dentro del cuadrante del
    // dibujo: sus ejes llegan hasta los bordes del cuadrante y no cruzan el texto de al lado.
    const render = () => {
      const { x, y } = last
      const rect = document.querySelector(ZONE)?.getBoundingClientRect()
      const inZone = !!rect && rect.width > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      setMode(inZone ? 'cross' : 'dot')
      if (inZone) {
        Object.assign(lineH.current.style, { left: `${rect.left}px`, width: `${rect.width}px`, transform: `translate3d(0, ${Math.round(y)}px, 0)` })
        Object.assign(lineV.current.style, { top: `${rect.top}px`, height: `${rect.height}px`, transform: `translate3d(${Math.round(x)}px, 0, 0)` })
        point.current.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
        // Sobre el piso del local, metros reales; en el resto del cuadrante, píxeles del cuadrante.
        const m = readPlanProbe(x, y)
        coords.current.textContent = m
          ? `X:${m.x.toFixed(2)}M\nY:${m.y.toFixed(2)}M`
          : `X:${Math.round(x - rect.left)}PX\nY:${Math.round(y - rect.top)}PX`
        // Cerca de un borde del visor las coordenadas pasan al otro lado de la cruz, para no cortarse.
        coords.current.dataset.flipX = x < rect.left + 110 ? '1' : '0'
        coords.current.dataset.flipY = y > rect.bottom - 50 ? '1' : '0'
        // El cartel junto a la mira (al estilo de un plano anotado), si lo que está debajo lo pide.
        const text = tipEl?.getAttribute('data-cursor-tip') || ''
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
        html.classList.add('es-has-cursor')
        gsap.set(root, { x: e.clientX, y: e.clientY })
      }
      render()
    }
    // Con la página moviéndose bajo el mouse (scroll) las coordenadas siguen contando.
    const onScroll = () => shown && render()
    const onOver = (e) => {
      const target = e.target instanceof Element ? e.target : null
      const interactive = !!target?.closest(INTERACTIVE)
      overLink = interactive
      tipEl = target?.closest('[data-cursor-tip]') || null
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
      html.classList.remove('es-has-cursor')
      gsap.killTweensOf([cross, root, body, label, plusEl, tip])
    }
  }, [])

  return (
    <div className="es-cursor" aria-hidden="true">
      <div ref={crossRef} className="es-cross">
        <span ref={lineH} className="es-cross__h" />
        <span ref={lineV} className="es-cross__v" />
        <span ref={point} className="es-cross__pt">
          <span ref={plus} className="es-cross__plus" />
          <span ref={coords} className="es-cross__coords" data-flip-x="0" data-flip-y="0" />
          <span ref={tipRef} className="es-cross__tip" />
        </span>
      </div>
      <div ref={dotRoot} className="es-cursor__dot">
        <div ref={dotBody} className="es-cursor__body">
          <span ref={dotLabel} className="es-cursor__label" />
        </div>
      </div>
    </div>
  )
}
