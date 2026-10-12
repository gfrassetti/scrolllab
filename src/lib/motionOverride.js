/**
 * Movimiento completo para todo el que entra al market (decisión del dueño,
 * 2026-10-12): quien abre ScrollLab en el celular o en la compu ve las demos con
 * todas sus animaciones, también con «reducir movimiento» prendido en el
 * dispositivo (en Android suele venir prendido por el ahorro de batería). Solo
 * market: en el ZIP y en los widgets de LAB (sitios ajenos) manda el ajuste del
 * visitante, como siempre.
 *
 * Qué es y qué no es:
 * - La web LEE ese ajuste (`prefers-reduced-motion`), no puede escribirlo. No se
 *   toca nada del dispositivo: el market lo ignora salvo que el visitante pida
 *   menos movimiento acá.
 * - Por defecto es `full`. Quien lo necesita elige «Animaciones: No» en el menú
 *   de preferencias (MotionToggle): se guarda `calm` en este navegador
 *   (localStorage) y desde ahí manda el ajuste del dispositivo. No se pregunta
 *   nada al entrar.
 *
 * Cómo se aplica (`full`):
 * - `<html data-motion="full">`: lo leen src/lib/motion.js y la variante `calm:`.
 * - `window.matchMedia` se reemplaza para que `prefers-reduced-motion` dé «sin
 *   preferencia». Más de 70 secciones (y `gsap.matchMedia`) leen el ajuste
 *   directo; así lo respetan sin tocarlas una por una. Devuelve MediaQueryList
 *   reales: los `change` de las demás condiciones (el ancho, por ejemplo) siguen
 *   andando.
 * - Para saber qué pide el dispositivo de verdad (si mostrar el toggle) se usa
 *   `deviceWantsLessMotion()`, que pasa por la `matchMedia` original.
 */
const MODE_KEY = 'scrolllab-motion' // 'full' | 'calm' (solo 'calm' cambia algo)
const PROBE_KEY = 'scrolllab-motion-probe'

const REDUCED = '(prefers-reduced-motion: reduce)'

// Siempre falso / siempre verdadero, con un solo feature para que entren en
// cualquier combinación (`and`, listas con coma, `not`).
const NEVER = '(max-width: -1px)'
const ALWAYS = '(min-width: 0px)'

// La original, capturada al importar el módulo: antes de cualquier reemplazo.
const realMatchMedia =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia.bind(window)
    : null

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** Reescribe `prefers-reduced-motion` para que la consulta dé «sin preferencia». */
export function rewriteMotionQuery(query) {
  return String(query)
    .replace(/\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/gi, NEVER)
    .replace(/\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/gi, ALWAYS)
    .replace(/\(\s*prefers-reduced-motion\s*\)/gi, NEVER)
}

let shimmed = false

function installMatchMediaShim() {
  if (shimmed || !realMatchMedia) return
  shimmed = true
  window.matchMedia = (query) => {
    const q = String(query)
    return realMatchMedia(/prefers-reduced-motion/i.test(q) ? rewriteMotionQuery(q) : q)
  }
}

/** Lo que el dispositivo pide de verdad, con o sin override. */
export function deviceWantsLessMotion() {
  return Boolean(realMatchMedia?.(REDUCED).matches)
}

/** Avisa si el ajuste del dispositivo cambia (el visitante lo prende o lo apaga). */
export function watchDeviceMotion(callback) {
  if (!realMatchMedia) return () => {}
  const mql = realMatchMedia(REDUCED)
  const onChange = () => callback(mql.matches)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * ¿Se puede recordar la elección? Sin storage no hay dónde guardar «menos
 * movimiento» y el toggle no se muestra (el default, completo, no lo necesita).
 */
export function canRemember() {
  try {
    localStorage.setItem(PROBE_KEY, '1')
    localStorage.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}

/** Lo guardado: 'full', 'calm' o null si el visitante nunca eligió (= completo). */
export function getMotion() {
  const value = read(MODE_KEY)
  return value === 'full' || value === 'calm' ? value : null
}

export const isMotionForced = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.motion === 'full'

/**
 * Antes del primer render, para que las secciones arranquen ya en ese modo.
 * Completo para todos, salvo quien eligió «menos movimiento»: ese manda el
 * ajuste del dispositivo.
 */
export function bootMotionOverride() {
  if (typeof document === 'undefined') return
  if (getMotion() === 'calm') return
  document.documentElement.dataset.motion = 'full'
  installMatchMediaShim()
}

/**
 * Guarda el modo elegido. Cada sección arma su animación al montarse, así que
 * si cambia el modo que está corriendo se recarga; si elige lo que ya ve no se
 * toca nada. Devuelve false si no pudo guardar.
 */
export function setMotion(mode) {
  const next = mode === 'full' ? 'full' : 'calm'
  if (!write(MODE_KEY, next)) return false
  if ((next === 'full') !== isMotionForced()) window.location.reload()
  return true
}
