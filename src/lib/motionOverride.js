/**
 * «Ver con animaciones» (MotionNotice / MotionToggle): quien tiene «reducir
 * movimiento» prendido en el dispositivo puede pedir el movimiento completo
 * para ScrollLab. Solo market: no viaja en el ZIP.
 *
 * Qué es y qué no es:
 * - La web LEE ese ajuste (`prefers-reduced-motion`), no puede escribirlo. Pedir
 *   las animaciones no cambia nada del dispositivo: se guarda esta preferencia,
 *   en este navegador (localStorage), y vale para todo ScrollLab.
 * - Se pregunta una sola vez: la respuesta y el «ya te lo mostré» son
 *   persistentes. Después se cambia desde el header (MotionToggle).
 *
 * Cómo se aplica (`full`):
 * - `<html data-motion="full">`: lo leen src/lib/motion.js y la variante `calm:`.
 * - `window.matchMedia` se reemplaza para que `prefers-reduced-motion` dé «sin
 *   preferencia». Más de 70 secciones (y `gsap.matchMedia`) leen el ajuste
 *   directo; así lo respetan sin tocarlas una por una. Devuelve MediaQueryList
 *   reales: los `change` de las demás condiciones (el ancho, por ejemplo) siguen
 *   andando.
 * - Para saber qué pide el dispositivo de verdad (aviso y toggle) se usa
 *   `deviceWantsLessMotion()`, que pasa por la `matchMedia` original.
 */
const MODE_KEY = 'scrolllab-motion' // 'full' | 'calm'
const SEEN_KEY = 'scrolllab-motion-notice' // '1' cuando el aviso ya se mostró
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

/** ¿Se puede recordar la respuesta? Sin storage no se pregunta: no habría memoria. */
export function canRemember() {
  try {
    localStorage.setItem(PROBE_KEY, '1')
    localStorage.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}

/** La respuesta guardada: 'full', 'calm' o null si todavía no eligió. */
export function getMotion() {
  const value = read(MODE_KEY)
  return value === 'full' || value === 'calm' ? value : null
}

/** El aviso se muestra una sola vez en total: ya respondido o ya mostrado. */
export function noticeSeen() {
  return read(SEEN_KEY) === '1' || getMotion() !== null
}

export function markNoticeSeen() {
  write(SEEN_KEY, '1')
}

export const isMotionForced = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.motion === 'full'

/** Antes del primer render, para que las secciones arranquen ya en ese modo. */
export function bootMotionOverride() {
  if (typeof document === 'undefined') return
  if (getMotion() === 'full') {
    document.documentElement.dataset.motion = 'full'
    installMatchMediaShim()
  }
}

/**
 * Guarda el modo elegido. Cada sección arma su animación al montarse, así que
 * si cambia el modo que está corriendo se recarga; si elige lo que ya ve
 * (dejar la calma estando en calma) no se toca nada.
 * Devuelve false si no pudo guardar.
 */
export function setMotion(mode) {
  const next = mode === 'full' ? 'full' : 'calm'
  if (!write(MODE_KEY, next)) return false
  write(SEEN_KEY, '1')
  if ((next === 'full') !== isMotionForced()) window.location.reload()
  return true
}
