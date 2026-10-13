/** El estado del cursor (mira), para que la escena 3D y el resto le avisen. */
export const cursorEvents = new EventTarget()

export const cursor = {
  /** state: 'idle' | 'lock' (blanco fijado, con etiqueta) | 'drag' */
  set(state, label = '') {
    cursorEvents.dispatchEvent(new CustomEvent('set', { detail: { state, label } }))
  },
}
