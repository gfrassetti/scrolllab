/**
 * Cuánto movimiento corre: el completo o la versión calma.
 *
 * Con «reducir movimiento» prendido en el dispositivo
 * (`prefers-reduced-motion: reduce`) las secciones no apagan todo: pasan a la
 * versión calma. Fundidos cortos en vez de pins, parallax y zooms; contadores
 * que cuentan; carruseles que se deslizan con el dedo; y nunca un contenedor
 * alto vacío. Las secciones preguntan acá en vez de leer el media query
 * directo, porque la página puede pedir el movimiento completo con
 * `<html data-motion="full">` (el botón «Ver con animaciones» de las demos).
 *
 * En CSS, la variante `calm:` (src/styles/tpl.css) sigue la misma regla:
 *
 *   <section className="h-[400vh] calm:h-auto">
 *
 * Importa gsap del paquete y no de ./gsap: el embed de LAB reemplaza ese
 * archivo por alias y este módulo tiene que servir en los dos lados.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FULL_QUERY = '(prefers-reduced-motion: no-preference)'

const forcedFull = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.motion === 'full'

/** true si corre la versión calma. */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || forcedFull()) return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * Condición de `gsap.matchMedia()` para la versión completa, opcionalmente
 * sumada a otra (`'(min-width: 768px)'`). Sigue reaccionando si cambia el
 * ajuste del dispositivo.
 */
export function fullMotionQuery(extra) {
  if (forcedFull()) return extra || 'all'
  return extra ? `${extra} and ${FULL_QUERY}` : FULL_QUERY
}

/** Ídem para la versión calma. */
export function calmMotionQuery(extra) {
  if (forcedFull()) return 'not all'
  return extra ? `${extra} and ${REDUCED_MOTION_QUERY}` : REDUCED_MOTION_QUERY
}

/**
 * Revelado de la versión calma: cada elemento aparece con un fundido corto,
 * con a lo sumo `y` px de recorrido, la primera vez que entra en pantalla.
 * Los que llegan juntos entran escalonados.
 *
 * `IntersectionObserver`, no `ScrollTrigger.batch`: a un salto de scroll
 * instantáneo (`scrollTo({behavior:'instant'})`, el que usa check:mobile, y
 * el que da un dedo rápido en un celular de verdad) `batch` puede no
 * registrar la «entrada» de un elemento que queda detrás — confirmado con
 * check:mobile en ChapterWorlds/ChapterBond de COMIC, quedaban en
 * `opacity:0` para siempre. El observer evalúa la posición actual ni bien
 * lo creás, sin importar cómo cambió el scroll.
 *
 * Usalo dentro de `useGSAP` y devolvé su resultado (la limpieza): GSAP
 * revierte los tweens que crea, pero el observer no es un objeto de GSAP —
 * `useGSAP`/`gsap.context()` sí invoca lo que el callback devuelva.
 *
 *   useGSAP(() => {
 *     if (reduced) return calmReveal('[data-reveal]')
 *     …
 *   }, { scope: root, dependencies: [reduced] })
 */
export function calmReveal(targets, { y = 12, stagger = 0.08, duration = 0.7 } = {}) {
  const els = gsap.utils.toArray(targets)
  if (!els.length) return () => {}
  gsap.set(els, { opacity: 0, y })

  const revealed = new Set()
  const reveal = (batch) => {
    const fresh = batch.filter((el) => !revealed.has(el))
    if (!fresh.length) return
    fresh.forEach((el) => revealed.add(el))
    gsap.to(fresh, {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      ease: 'power2.out',
      overwrite: true,
    })
  }

  // Sin margen: todo lo que se ve ya se reveló. Con un margen abajo queda una
  // banda donde el elemento está a la vista pero sigue en opacity:0 (en un
  // alto bajo, 320×568, es la primera fila de una card).
  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target)
    if (visible.length) reveal(visible)
  })
  els.forEach((el) => io.observe(el))
  return () => io.disconnect()
}

/**
 * Contadores de la versión calma: cuentan hasta el valor la primera vez que
 * entran en pantalla. Cambia el contenido del número, no se mueve nada, así
 * que sigue siendo calma. Antes de entrar muestran 0; la limpieza deja los
 * valores finales (sin JS o al volver a la versión completa se lee el real).
 *
 * `read(el)` devuelve el valor final: por defecto el `data-count` o el texto.
 * Devolvé el resultado desde `useGSAP`, como con `calmReveal`.
 */
export function calmCount(
  targets,
  { duration = 1.4, read = (el) => parseFloat(el.dataset.count ?? el.textContent) } = {},
) {
  const els = gsap.utils.toArray(targets)
  if (!els.length) return () => {}

  const finals = new Map(els.map((el) => [el, read(el)]))
  els.forEach((el) => {
    el.textContent = '0'
  })

  const started = new Set()
  const tweens = []
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || started.has(entry.target)) return
      started.add(entry.target)
      const el = entry.target
      const to = finals.get(el)
      const proxy = { value: 0 }
      tweens.push(
        gsap.to(proxy, {
          value: to,
          duration,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = String(Math.round(proxy.value))
          },
          onComplete: () => {
            el.textContent = String(to)
          },
        }),
      )
    })
  })
  els.forEach((el) => io.observe(el))

  return () => {
    io.disconnect()
    tweens.forEach((tween) => tween.kill())
    els.forEach((el) => {
      el.textContent = String(finals.get(el))
    })
  }
}

/**
 * Puntero «virtual» para las escenas que siguen al mouse (el 3D de FIZZ,
 * MONOLITH y ATELIER): el mouse en PC y, en un teléfono, el dedo.
 *
 * Un dedo que scrollea cancela los eventos de puntero (`pointercancel`), así que
 * una escena que solo escucha `pointermove` queda apagada en el teléfono. Los
 * eventos táctiles (`touchstart` / `touchmove`, pasivos) siguen llegando durante
 * el scroll, también con `normalizeScroll`. Al soltar el dedo vuelve al centro;
 * el mouse se queda donde quedó, como antes.
 *
 *   const pointer = trackPointer()
 *   // en el tick:      rotation += (pointer.x * 0.3 - rotation) * 0.05
 *   // en la limpieza:  pointer.dispose()
 *
 * `x` e `y` van de -1 a 1 sobre el viewport (`y` crece hacia abajo); `clientX` y
 * `clientY` son los px, por si la escena mide contra su propia caja.
 */
export function trackPointer() {
  const pointer = { x: 0, y: 0, clientX: 0, clientY: 0, touching: false, dispose() {} }
  if (typeof window === 'undefined') return pointer

  const center = () => {
    pointer.clientX = window.innerWidth / 2
    pointer.clientY = window.innerHeight / 2
  }
  const set = (clientX, clientY) => {
    pointer.clientX = clientX
    pointer.clientY = clientY
    pointer.x = (clientX / window.innerWidth) * 2 - 1
    pointer.y = (clientY / window.innerHeight) * 2 - 1
  }
  const onPointer = (event) => {
    if (event.pointerType === 'touch') return // lo cubren los eventos táctiles
    pointer.touching = false
    set(event.clientX, event.clientY)
  }
  const onTouch = (event) => {
    const touch = event.touches?.[0]
    if (!touch) return
    pointer.touching = true
    set(touch.clientX, touch.clientY)
  }
  const onRelease = (event) => {
    if (event.touches?.length) return onTouch(event) // sigue otro dedo apoyado
    pointer.touching = false
    pointer.x = 0
    pointer.y = 0
    center()
  }

  center()
  const options = { passive: true }
  window.addEventListener('pointermove', onPointer, options)
  window.addEventListener('touchstart', onTouch, options)
  window.addEventListener('touchmove', onTouch, options)
  window.addEventListener('touchend', onRelease, options)
  window.addEventListener('touchcancel', onRelease, options)

  pointer.dispose = () => {
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('touchstart', onTouch)
    window.removeEventListener('touchmove', onTouch)
    window.removeEventListener('touchend', onRelease)
    window.removeEventListener('touchcancel', onRelease)
  }
  return pointer
}
