import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from '../lib/gsap'
import { getLenis } from '../hooks/useLenis'

const FINE_POINTER = '(hover: hover) and (pointer: fine)'

/**
 * Barra de scroll propia (guía «The Award-Winning Web Developer»,
 * Detalle #5.4): mientras vive montada oculta la nativa (clase
 * `hide-native-scrollbar` en <html>, ver src/index.css) y la reemplaza por un
 * riel fino que se llena según el progreso de la página.
 *
 * - `interactive` (default): se puede clickear o arrastrar para ir a otra
 *   parte de la página, como una barra nativa, y se ensancha en hover.
 * - `touch` en false (default): solo con mouse o trackpad. En táctil la barra
 *   nativa ya es una capa que aparece al scrollear; ahí no se monta nada.
 *
 * Cada template la tiñe con su paleta:
 *   <ScrollRail trackClassName="bg-ink/10" fillClassName="bg-accent" />
 */
export default function ScrollRail({
  trackClassName = 'bg-current/10',
  fillClassName = 'bg-current',
  interactive = true,
  touch = false,
}) {
  const [enabled, setEnabled] = useState(() =>
    touch ? true : typeof window !== 'undefined' && window.matchMedia(FINE_POINTER).matches,
  )
  const railRef = useRef(null)
  const fillRef = useRef(null)

  useEffect(() => {
    if (touch) return undefined
    const mq = window.matchMedia(FINE_POINTER)
    const onChange = () => setEnabled(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [touch])

  useEffect(() => {
    if (!enabled) return undefined
    const root = document.documentElement
    root.classList.add('hide-native-scrollbar')
    const fill = fillRef.current
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (fill) fill.style.transform = `scaleY(${self.progress})`
      },
    })
    if (fill) fill.style.transform = `scaleY(${trigger.progress})`
    return () => {
      trigger.kill()
      root.classList.remove('hide-native-scrollbar')
    }
  }, [enabled])

  // Click o arrastre: la posición vertical en el riel es la de la página.
  useEffect(() => {
    const rail = railRef.current
    if (!enabled || !interactive || !rail) return undefined
    let dragging = false
    const scrollToPointer = (e, immediate) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const ratio = Math.min(1, Math.max(0, e.clientY / window.innerHeight))
      const y = ratio * max
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(y, { immediate })
      else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
    }
    const onDown = (e) => {
      if (e.button !== 0) return
      dragging = true
      rail.setPointerCapture(e.pointerId)
      rail.dataset.dragging = ''
      scrollToPointer(e, false)
    }
    const onMove = (e) => {
      if (dragging) scrollToPointer(e, true)
    }
    const onUp = (e) => {
      dragging = false
      delete rail.dataset.dragging
      if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId)
    }
    rail.addEventListener('pointerdown', onDown)
    rail.addEventListener('pointermove', onMove)
    rail.addEventListener('pointerup', onUp)
    rail.addEventListener('pointercancel', onUp)
    return () => {
      rail.removeEventListener('pointerdown', onDown)
      rail.removeEventListener('pointermove', onMove)
      rail.removeEventListener('pointerup', onUp)
      rail.removeEventListener('pointercancel', onUp)
    }
  }, [enabled, interactive])

  if (!enabled) return null

  return (
    <div
      ref={railRef}
      aria-hidden="true"
      className={`group fixed top-0 right-0 z-[60] flex h-svh w-3 justify-end ${
        interactive ? 'cursor-pointer select-none' : 'pointer-events-none'
      }`}
    >
      <div
        className={`relative h-full w-[3px] overflow-hidden transition-[width] duration-300 ease-out-strong ${
          interactive ? 'group-hover:w-[7px] group-data-[dragging]:w-[7px]' : ''
        } ${trackClassName}`}
      >
        <div
          ref={fillRef}
          className={`absolute inset-0 origin-top ${fillClassName}`}
          style={{ transform: 'scaleY(0)' }}
        />
      </div>
    </div>
  )
}
