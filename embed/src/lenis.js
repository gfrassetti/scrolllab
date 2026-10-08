/**
 * `hooks/useLenis` dentro del embed. El frame no tiene Lenis ni scrollea: la
 * sección mide lo que mide y el que scrollea es el sitio del cliente. Un
 * "volver arriba" (`getLenis()?.scrollTo(0)`) le pide al loader que suba la
 * página del host — el mismo puente que un link `#top` (loader.js, anchor).
 * Además saca la librería lenis del bundle.
 */
const toHost = {
  scrollTo(y) {
    if (y === 0) window.parent.postMessage({ type: 'scrolllab:anchor', hash: '#top' }, '*')
  },
}

export function getLenis() {
  return window.parent !== window ? toHost : null
}

export function useLenis() {}
