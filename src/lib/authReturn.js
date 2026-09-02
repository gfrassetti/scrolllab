/** Rutas internas permitidas tras login (anti open-redirect). */
const ALLOWED = new Set([
  '/',
  '/cart',
  '/builder',
  '/lab',
  '/account',
  '/preview',
])

/** `/lab/<id>` (editor de una instancia hosteada). */
const ALLOWED_PREFIX = /^\/lab\/[a-f0-9]{12,24}$/

/**
 * Normaliza `next` de query/session. Solo paths relativos allowlisteados.
 * @param {unknown} value
 * @returns {string | null}
 */
export function sanitizeAuthReturn(value) {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
    return null
  }
  try {
    const url = new URL(raw, 'http://local.invalid')
    if (url.origin !== 'http://local.invalid') return null
    if (!ALLOWED.has(url.pathname) && !ALLOWED_PREFIX.test(url.pathname)) {
      return null
    }
    const path = `${url.pathname}${url.search}`
    return path.length <= 200 ? path : null
  } catch {
    return null
  }
}

const STORAGE_KEY = 'scrolllab-auth-next'

export function stashAuthReturn(next) {
  const safe = sanitizeAuthReturn(next)
  try {
    if (safe) sessionStorage.setItem(STORAGE_KEY, safe)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return safe
}

export function takeAuthReturn(fallback = '/account') {
  let stored = null
  try {
    stored = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return sanitizeAuthReturn(stored) || sanitizeAuthReturn(fallback) || '/account'
}
