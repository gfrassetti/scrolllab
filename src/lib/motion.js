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
 * Los que llegan juntos entran escalonados. Usalo dentro de `useGSAP`, que
 * revierte los ScrollTrigger que crea.
 */
export function calmReveal(
  targets,
  { y = 12, stagger = 0.08, duration = 0.7, start = 'top 92%' } = {},
) {
  const els = gsap.utils.toArray(targets)
  if (!els.length) return []
  gsap.set(els, { opacity: 0, y })
  return ScrollTrigger.batch(els, {
    start,
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        ease: 'power2.out',
        overwrite: true,
      }),
  })
}
