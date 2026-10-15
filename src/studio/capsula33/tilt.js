/**
 * cāpsula33 — la inclinación del teléfono como «puntero».
 *
 * En PC las escenas (el pasillo del hero, la tripulante y el local en 3D) siguen al mouse. En el
 * teléfono no hay mouse: el giroscopio hace lo mismo. `tilt.x` / `tilt.y` van de -1 a 1, igual
 * que el puntero de `trackPointer`, y vuelven solos al centro si el teléfono queda quieto en otra
 * posición (así se puede sostener como sea).
 *
 * iOS pide permiso y solo se puede pedir dentro de un toque: `enableTilt()` se llama desde el
 * botón «Abordar». En Android no hace falta permiso.
 */

export const tilt = { x: 0, y: 0, active: false }

const RANGE = 16 // grados de inclinación para llegar al borde (±1)
const RECENTER = 0.004 // qué tan rápido se acomoda el centro (por evento, ~60 por segundo)

let started = false
let base = null

const clamp = (v) => Math.max(-1, Math.min(1, v))

function onOrientation(e) {
  if (e.beta == null || e.gamma == null) return
  // Con el teléfono acostado los ejes se cruzan.
  const angle = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0
  let lr = e.gamma
  let fb = e.beta
  if (angle === 90) [lr, fb] = [e.beta, -e.gamma]
  else if (angle === -90 || angle === 270) [lr, fb] = [-e.beta, e.gamma]
  if (!base) base = { lr, fb }
  base.lr += (lr - base.lr) * RECENTER
  base.fb += (fb - base.fb) * RECENTER
  tilt.x = clamp((lr - base.lr) / RANGE)
  tilt.y = clamp((fb - base.fb) / RANGE)
  tilt.active = true
}

function listen() {
  if (started) return
  started = true
  window.addEventListener('deviceorientation', onOrientation, { passive: true })
}

/** Prende el giroscopio (solo en pantallas táctiles). Llamarla dentro de un toque, por iOS. */
export function enableTilt() {
  if (typeof window === 'undefined' || started) return
  if (!window.matchMedia('(hover: none)').matches) return
  const DOE = window.DeviceOrientationEvent
  if (!DOE) return
  if (typeof DOE.requestPermission === 'function') {
    DOE.requestPermission()
      .then((state) => state === 'granted' && listen())
      .catch(() => {})
  } else {
    listen()
  }
}

/**
 * El blanco del movimiento: el dedo si está apoyado (o el mouse en PC), si no la inclinación.
 * @param {{ x: number, y: number, touching?: boolean }} pointer
 */
export function aim(pointer) {
  if (tilt.active && !pointer.touching) return tilt
  return pointer
}
