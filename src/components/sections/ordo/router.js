import { useSyncExternalStore } from 'react'

/**
 * The minimal router of the site: a home page and one page per project (`/projects/<slug>`).
 *
 * The address is updated with history.pushState (if the browser allows it: in a sandboxed iframe it may
 * fail and the site keeps working with the state in memory). With the published site, a project's address
 * can be opened directly if the hosting returns index.html for any route (_redirects, see vite.ordo.config.js).
 *
 * `navigate` goes through a transition handler (the curtain in Site.jsx): it decides when to change the route.
 */

const PROJECT_PATH = /\/projects\/([a-z0-9-]+)\/?$/

/** The current route: { name: 'home' } or { name: 'project', slug }. */
function read() {
  if (typeof window === 'undefined') return { name: 'home' }
  const m = window.location.pathname.match(PROJECT_PATH)
  return m ? { name: 'project', slug: m[1] } : { name: 'home' }
}

/** The folder the site hangs from (`/` when published, `/templates/ordo` locally). */
function base() {
  return window.location.pathname.replace(PROJECT_PATH, '').replace(/\/+$/, '')
}

let route = read()
let pending = null // the section to go to when returning to the home page
let handler = null
const subs = new Set()

const emit = () => subs.forEach((f) => f())

function commit(next, section) {
  route = next
  pending = section ?? null
  emit()
}

const same = (a, b) => a.name === b.name && a.slug === b.slug

/** Go to another route: `to` is { name: 'home' } or { name: 'project', slug }. */
export function navigate(to, { section = null, push = true } = {}) {
  if (same(route, to) && !section) return
  const apply = () => {
    if (push) {
      const path = to.name === 'project' ? `${base()}/projects/${to.slug}` : `${base() || ''}/`
      try {
        window.history.pushState(null, '', path)
      } catch {
        // sandboxed iframe: carry on with the state in memory
      }
    }
    commit(to, section)
  }
  if (handler) handler(apply)
  else apply()
}

/** The current route, without subscribing. */
export const getRoute = () => route

/** The address of a route, for hrefs (middle click, copy link). */
export function hrefOf(to) {
  if (typeof window === 'undefined') return '#'
  return to.name === 'project' ? `${base()}/projects/${to.slug}` : `${base() || ''}/`
}

/** The section to go to when the home page mounts (only once). */
export function takePendingSection() {
  const s = pending
  pending = null
  return s
}

/** Site registers its transition (curtain) here. */
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
