/**
 * «Ver con animaciones» (MotionNotice): quien tiene «reducir movimiento»
 * prendido puede pedir el movimiento completo para esta pestaña. Vive en
 * sessionStorage y se aplica como <html data-motion="full">, que es lo que
 * leen src/lib/motion.js y la variante `calm:`. Solo market: no viaja en el ZIP.
 */
const KEY = 'scrolllab-motion'

/** Antes del primer render, para que las secciones arranquen ya en ese modo. */
export function bootMotionOverride() {
  try {
    if (sessionStorage.getItem(KEY) === 'full') {
      document.documentElement.dataset.motion = 'full'
    }
  } catch {
    /* sin storage: manda el ajuste del dispositivo */
  }
}

export const isMotionForced = () => document.documentElement.dataset.motion === 'full'

/** Guarda el modo pedido y recarga: cada sección arma su animación de cero. */
export function requestMotion(mode) {
  try {
    sessionStorage.setItem(KEY, mode === 'full' ? 'full' : 'calm')
  } catch {
    return
  }
  window.location.reload()
}
