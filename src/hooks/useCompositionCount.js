import { useSyncExternalStore } from 'react'
import { COMPOSITION_EVENT, readCompositionCount } from '../lib/composition'

function subscribe(onChange) {
  window.addEventListener(COMPOSITION_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(COMPOSITION_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/**
 * Secciones que el usuario tiene armadas en el builder. Sirve para avisarle
 * desde el header que dejó algo a medio hacer.
 *
 * `storage` cubre las otras pestañas; COMPOSITION_EVENT, esta.
 */
export function useCompositionCount() {
  return useSyncExternalStore(subscribe, readCompositionCount, () => 0)
}
