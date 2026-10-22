import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'

/**
 * El cursor de elStudio: un punto de tinta que sigue al mouse con un poco de
 * inercia. Sobre un link se abre en un aro; sobre algo con `data-cursor="Ver"`
 * se vuelve un disco de tinta con esa palabra adentro. Solo con mouse (hover +
 * puntero fino): en el teléfono no se monta nada. El cursor nativo se oculta
 * recién con el primer movimiento, así que sin JS no se pierde el puntero.
 *
 *   <a data-cursor="Abrir">…</a>      disco con texto
 *   <a>…</a> / <button>…</button>     aro
 */
const STATES = {
  dot: { width: 14, height: 14, backgroundColor: '#161513', boxShadow: 'inset 0 0 0 0px #161513' },
  ring: { width: 46, height: 46, backgroundColor: 'rgba(22,21,19,0)', boxShadow: 'inset 0 0 0 1px #161513' },
  label: { width: 96, height: 96, backgroundColor: 'rgba(22,21,19,1)', boxShadow: 'inset 0 0 0 0px #161513' },
}

export default function Cursor() {
  const rootRef = useRef(null)
  const bodyRef = useRef(null)
  const labelRef = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined
    const root = rootRef.current
    const body = bodyRef.current
    const label = labelRef.current
    const html = document.documentElement

    gsap.set(root, { autoAlpha: 0 })
    gsap.set(body, { xPercent: -50, yPercent: -50 }) // centrado sobre el puntero aunque cambie de tamaño
    const moveX = gsap.quickTo(root, 'x', { duration: 0.35, ease: 'power3' })
    const moveY = gsap.quickTo(root, 'y', { duration: 0.35, ease: 'power3' })

    let shown = false
    let state = 'dot'
    const setState = (next, text = '') => {
      if (next === state && label.textContent === text) return
      state = next
      if (text) label.textContent = text
      gsap.to(body, { ...STATES[next], duration: 0.45, ease: 'expo.out', overwrite: 'auto' })
      gsap.to(label, { autoAlpha: next === 'label' ? 1 : 0, duration: next === 'label' ? 0.3 : 0.15, delay: next === 'label' ? 0.08 : 0 })
    }

    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      if (!shown) {
        shown = true
        gsap.set(root, { x: e.clientX, y: e.clientY })
        html.classList.add('es-has-cursor')
        gsap.to(root, { autoAlpha: 1, duration: 0.3 })
      }
      moveX(e.clientX)
      moveY(e.clientY)
    }
    const onOver = (e) => {
      const target = e.target instanceof Element ? e.target : null
      const tagged = target?.closest('[data-cursor]')
      if (tagged) return setState('label', tagged.getAttribute('data-cursor'))
      if (target?.closest('a, button, [role="button"], summary, input, textarea')) return setState('ring')
      setState('dot')
    }
    const onDown = () => gsap.to(body, { scale: 0.82, duration: 0.18, ease: 'power2.out' })
    const onUp = () => gsap.to(body, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
    const onLeave = () => gsap.to(root, { autoAlpha: 0, duration: 0.2 })
    const onEnter = () => shown && gsap.to(root, { autoAlpha: 1, duration: 0.2 })

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
      html.classList.remove('es-has-cursor')
      gsap.killTweensOf([root, body, label])
    }
  }, [])

  return (
    <div ref={rootRef} className="es-cursor" aria-hidden="true">
      <div ref={bodyRef} className="es-cursor__body">
        <span ref={labelRef} className="es-cursor__label" />
      </div>
    </div>
  )
}
