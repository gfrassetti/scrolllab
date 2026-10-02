/**
 * Scroll táctil normalizado (`ScrollTrigger.normalizeScroll`) en teléfonos y
 * tablets: el scroll pasa por el hilo de JS, así la barra del navegador no
 * aparece ni se esconde a mitad de un pin y los scrubs no tiemblan.
 *
 * - Solo táctil (`type: 'touch'`). Con `true` también toma la rueda del mouse,
 *   que en desktop maneja Lenis, y pelearían.
 * - `allowNestedScroll`: los paneles con scroll propio (menús, filas
 *   deslizables, listas) siguen scrolleando.
 * - Lo prende quien lo necesita (useLenis, el header del market) y se apaga
 *   cuando ya nadie lo usa: no se filtra a otra página al navegar.
 * - Con un menú a pantalla completa abierto se pausa: si no, la página
 *   scrollea debajo aunque el body tenga `overflow: hidden`.
 */
import { ScrollTrigger } from './gsap'

let users = 0
let pauses = 0
let active = false

function sync() {
  const next = users > 0 && pauses === 0
  if (next === active) return
  active = next
  ScrollTrigger.normalizeScroll(next ? { type: 'touch', allowNestedScroll: true } : false)
}

function once(fn) {
  let done = false
  return () => {
    if (done) return
    done = true
    fn()
  }
}

/** Lo prende mientras quien lo pide siga montado. Devuelve la limpieza. */
export function retainTouchScroll() {
  if (typeof window === 'undefined' || ScrollTrigger.isTouch !== 1) return () => {}
  users += 1
  sync()
  return once(() => {
    users -= 1
    sync()
  })
}

/** Lo pausa hasta que se llame a la función que devuelve. */
export function pauseTouchScroll() {
  pauses += 1
  sync()
  return once(() => {
    pauses -= 1
    sync()
  })
}
