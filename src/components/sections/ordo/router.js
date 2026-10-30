import { useSyncExternalStore } from 'react'

/**
 * El enrutador mínimo de elStudio: una portada y una página por proyecto (`/proyectos/<slug>`).
 *
 * La dirección se actualiza con history.pushState (si el navegador lo permite: en un iframe con sandbox puede
 * fallar y el sitio sigue andando con el estado en memoria). Con el sitio publicado, la dirección de un proyecto
 * se puede abrir directo si el hosting devuelve index.html para cualquier ruta (_redirects, ver vite.elstudio.config.js).
 *
 * `navigate` pasa por un manejador de transición (la cortina de ElStudioPage): él decide cuándo cambiar de ruta.
 */

const PROJECT_PATH = /\/proyectos\/([a-z0-9-]+)\/?$/

/** La ruta actual: { name: 'home' } o { name: 'project', slug }. */
function read() {
  if (typeof window === 'undefined') return { name: 'home' }
  const m = window.location.pathname.match(PROJECT_PATH)
  return m ? { name: 'project', slug: m[1] } : { name: 'home' }
}

/** La carpeta desde la que cuelga el sitio (`/` publicado, `/estudio/elstudio` en local). */
function base() {
  return window.location.pathname.replace(PROJECT_PATH, '').replace(/\/+$/, '')
}

let route = read()
let pending = null // la sección a la que ir al volver a la portada
let handler = null
const subs = new Set()

const emit = () => subs.forEach((f) => f())

function commit(next, section) {
  route = next
  pending = section ?? null
  emit()
}

const same = (a, b) => a.name === b.name && a.slug === b.slug

/** Ir a otra ruta: `to` es { name: 'home' } o { name: 'project', slug }. */
export function navigate(to, { section = null, push = true } = {}) {
  if (same(route, to) && !section) return
  const apply = () => {
    if (push) {
      const path = to.name === 'project' ? `${base()}/proyectos/${to.slug}` : `${base() || ''}/`
      try {
        window.history.pushState(null, '', path)
      } catch {
        // iframe con sandbox: sigue con el estado en memoria
      }
    }
    commit(to, section)
  }
  if (handler) handler(apply)
  else apply()
}

/** La ruta actual, sin suscribirse. */
export const getRoute = () => route

/** La dirección de una ruta, para los href (clic con el botón del medio, copiar enlace). */
export function hrefOf(to) {
  if (typeof window === 'undefined') return '#'
  return to.name === 'project' ? `${base()}/proyectos/${to.slug}` : `${base() || ''}/`
}

/** La sección a la que hay que ir al montar la portada (una sola vez). */
export function takePendingSection() {
  const s = pending
  pending = null
  return s
}

/** ElStudioPage registra acá su transición (cortina). */
export function setTransitionHandler(fn) {
  handler = fn
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const next = read()
    if (same(next, route)) return
    const apply = () => commit(next, null)
    if (handler) handler(apply)
    else apply()
  })
}

export function useRoute() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => route,
    () => route,
  )
}
