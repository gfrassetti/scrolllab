import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { LABEL } from './brand'

const FINE_POINTER = '(hover: hover) and (pointer: fine)'
/** Cuánto quedan a la vista los números después del último movimiento (ms): un destello, no un cartel. */
const ACTIVE_MS = 600

/**
 * La barra de scroll de elStudio: una regla vertical, la hermana de la que cae bajo el nav.
 *
 * Sobre el borde derecho, marcas finas cada 8 px y una más larga cada 80. Un cursor de óxido marca dónde
 * está la página; las marcas de alrededor se agrandan un poco, como bajo una lupa. Las secciones de la página
 * (cada `<section>` de <main>, numeradas en orden: hoy Inicio y Proyectos; las que se sumen entran solas)
 * están marcadas con una línea más larga, y mientras se scrollea (y un instante después) aparece el número de
 * la sección en la que se está; quieta la página, la regla queda sola. Las etapas del hero no tienen marca:
 * son parte del recorrido de la sección 01.
 *
 * Reemplaza a la barra nativa (clase `hide-native-scrollbar` en <html>, src/index.css). Con mouse o
 * trackpad se clickea y se arrastra como una barra normal; en el teléfono es solo indicador (una franja
 * que tomara toques le robaría el scroll al dedo).
 *
 * Solo se mueven transformaciones y una variable de CSS del cursor; no hay nada que redibujar por cuadro.
 */
export default function ScrollRuler({ on }) {
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && window.matchMedia(FINE_POINTER).matches)
  const [marks, setMarks] = useState([])
  const rulerRef = useRef(null)
  const markRef = useRef(null)
  const tagRef = useRef(null)
  const marksRef = useRef([])
  const timer = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER)
    const onChange = () => setFine(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Dónde empieza cada sección (en fracción del recorrido). Se mide al cargar y al cambiar de tamaño.
  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max <= 0) return
      const sections = [...document.querySelectorAll('main > section')]
      const next = sections.map((el, i) => ({ n: String(i + 1).padStart(2, '0'), y: el.offsetTop, f: Math.min(1, el.offsetTop / max) }))
      marksRef.current = next
      setMarks((prev) => (prev.length === next.length && prev.every((m, i) => Math.abs(m.f - next[i].f) < 0.0005) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(document.documentElement)
    window.addEventListener('load', measure)
    ScrollTrigger.addEventListener('refresh', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('load', measure)
      ScrollTrigger.removeEventListener('refresh', measure)
    }
  }, [])

  // El cursor sigue la página; el número de la hoja se enciende mientras se scrollea.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('hide-native-scrollbar')
    const ruler = rulerRef.current
    const mark = markRef.current
    const tag = tagRef.current
    let last = -1
    let lastTag = ''
    const draw = (progress, scroll) => {
      const h = ruler.clientHeight
      const y = progress * h
      if (Math.abs(y - last) < 0.2) return
      last = y
      mark.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
      ruler.style.setProperty('--y', `${y.toFixed(1)}px`)
      let n = '01'
      // Una sección cuenta cuando ya ocupa la parte de arriba de la pantalla (no recién cuando llega al tope).
      for (const m of marksRef.current) if (scroll + window.innerHeight * 0.6 >= m.y) n = m.n
      if (n !== lastTag) {
        lastTag = n
        tag.textContent = n
      }
      ruler.classList.add('is-active')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (!ruler.dataset.dragging) ruler.classList.remove('is-active')
      }, ACTIVE_MS)
    }
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => draw(self.progress, self.scroll()),
    })
    draw(trigger.progress, trigger.scroll())
    ruler.classList.remove('is-active')
    return () => {
      trigger.kill()
      window.clearTimeout(timer.current)
      root.classList.remove('hide-native-scrollbar')
    }
  }, [])

  // Click o arrastre: la altura en la regla es la altura en la página.
  useEffect(() => {
    const ruler = rulerRef.current
    if (!fine || !ruler) return undefined
    let dragging = false
    const go = (e, immediate) => {
      const rect = ruler.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
      const y = ratio * (document.documentElement.scrollHeight - window.innerHeight)
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(y, { immediate })
      else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' })
    }
    const onDown = (e) => {
      if (e.button !== 0) return
      dragging = true
      ruler.setPointerCapture(e.pointerId)
      ruler.dataset.dragging = ''
      ruler.classList.add('is-active')
      go(e, false)
    }
    const onMove = (e) => dragging && go(e, true)
    const onUp = (e) => {
      dragging = false
      delete ruler.dataset.dragging
      if (ruler.hasPointerCapture(e.pointerId)) ruler.releasePointerCapture(e.pointerId)
    }
    ruler.addEventListener('pointerdown', onDown)
    ruler.addEventListener('pointermove', onMove)
    ruler.addEventListener('pointerup', onUp)
    ruler.addEventListener('pointercancel', onUp)
    return () => {
      ruler.removeEventListener('pointerdown', onDown)
      ruler.removeEventListener('pointermove', onMove)
      ruler.removeEventListener('pointerup', onUp)
      ruler.removeEventListener('pointercancel', onUp)
    }
  }, [fine])

  return (
    <div ref={rulerRef} className="es-ruler" data-on={on ? '' : undefined} data-fine={fine ? '' : undefined} aria-hidden="true">
      <span className="es-ruler__ticks" />
      <span className="es-ruler__lens" />
      {marks.map((m) => (
        <span key={m.n} className="es-ruler__wp" style={{ top: `${m.f * 100}%` }}>
          <span className="es-ruler__wpn" style={LABEL}>
            {m.n}
          </span>
        </span>
      ))}
      <span ref={markRef} className="es-ruler__mark">
        <span ref={tagRef} className="es-ruler__tag" style={LABEL}>
          01
        </span>
      </span>
    </div>
  )
}
