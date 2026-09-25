/**
 * De dónde llegó la persona (utm_source / utm_medium / utm_campaign), para saber
 * qué canal trae mails y compras y no gastar en el que no funciona. Se guarda
 * la primera visita: quien vio un video el lunes y se anota el jueves sigue
 * siendo "del video".
 */
const KEY = 'scrolllab-utm'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const FIELDS = ['source', 'medium', 'campaign']

/** Minúsculas, solo a-z 0-9 _ - y 32 caracteres. null si no queda nada. */
export function cleanUtmValue(raw) {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return value || null
}

/** Lo guardado si tiene menos de 30 días: `{ source?, medium?, campaign? }` o null. */
export function loadUtm(now = Date.now()) {
  try {
    const raw = localStorage.getItem(KEY)
    const saved = raw ? JSON.parse(raw) : null
    if (!saved || now - Number(saved.at) > MAX_AGE_MS) return null
    const found = {}
    for (const field of FIELDS) if (saved[field]) found[field] = saved[field]
    return Object.keys(found).length ? found : null
  } catch {
    return null
  }
}

/**
 * Guarda los `utm_*` de la URL si todavía no hay una visita guardada
 * (gana la primera). Devuelve lo guardado o null.
 */
export function captureUtmFromUrl(loc = globalThis.location, now = Date.now()) {
  try {
    const params = new URLSearchParams(loc?.search || '')
    const found = {}
    for (const field of FIELDS) {
      const value = cleanUtmValue(params.get(`utm_${field}`))
      if (value) found[field] = value
    }
    if (Object.keys(found).length === 0 || loadUtm(now)) return null
    localStorage.setItem(KEY, JSON.stringify({ ...found, at: now }))
    return found
  } catch {
    return null
  }
}
