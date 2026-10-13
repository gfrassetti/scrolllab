/**
 * cāpsula33 — el recorrido como fuente única: en qué página está la cámara y
 * cómo ir a otra. El hero lo maneja con el scroll; el menú, la barra de scroll
 * y el local (al tocarlo) piden ir a una página y el scroll hace el viaje.
 */

const listeners = new Set()
let page = 0
let goTo = () => {}

export const tour = {
  get page() {
    return page
  },
  setPage(p) {
    if (p === page) return
    page = p
    listeners.forEach((fn) => fn(p))
  },
  onPage(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  /** El hero registra cómo se llega a una página (0 = vista general). */
  register(fn) {
    goTo = fn
  },
  goTo(p, opts) {
    goTo(p, opts)
  },
}
