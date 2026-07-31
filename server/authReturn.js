/** Rutas internas permitidas tras OAuth (anti open-redirect). */
const ALLOWED = new Set([
  '/',
  '/cart',
  '/builder',
  '/account',
  '/preview',
])

/**
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
    if (!ALLOWED.has(url.pathname)) return null
    const path = `${url.pathname}${url.search}`
    return path.length <= 200 ? path : null
  } catch {
    return null
  }
}
