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
