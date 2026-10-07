/**
 * Analítica propia del market (first-party): cuenta clics y vistas por
 * template y se ve en el panel local (/admin). Convive con GTM (src/lib/gtm.js)
 * y no lo reemplaza: GTM/GA4 mide tráfico; esto guarda en NUESTRA base, sin
 * cookies de terceros ni datos personales (solo un id anónimo de visitante).
 *
 * - Un listener delegado captura el clic en cualquier <a>, <button>,
 *   [role=button] o <summary> de todo el sitio: no hace falta marcar nada.
 * - El template al que pertenece el clic sale de, en orden: el atributo
 *   `data-track-sku` del contenedor (las tarjetas de la home), el href
 *   (/templates/x o /plantillas/x) o la página donde estás.
 * - Respeta "No rastrear" del navegador y no cuenta nada dentro de /admin.
 * - En desarrollo NO envía nada: tu .env local puede apuntar a la base real y
 *   tus propios clics de prueba ensuciarían las métricas. Para probarlo en
 *   local: localStorage.setItem('scrolllab-track-dev', '1') y recargá.
 * - Solo market: no viaja en el ZIP que se vende.
 */
const VID_KEY = 'scrolllab-vid'
const FLUSH_MS = 4000
const MAX_QUEUE = 25
const SKU_RE = /^\/(?:templates|plantillas)\/([a-z0-9][a-z0-9-]*)/i
const SELECTOR = 'a, button, [role="button"], summary, [data-track]'

let queue = []
let timer = null
let installed = false
let vid = null

function devOptIn() {
  try {
    return window.localStorage.getItem('scrolllab-track-dev') === '1'
  } catch {
    return false
  }
}

function enabled() {
  if (typeof window === 'undefined') return false
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false
  if (import.meta.env.DEV && !devOptIn()) return false
  return !window.location.pathname.startsWith('/admin')
}

function visitorId() {
  if (vid) return vid
  try {
    vid = window.localStorage.getItem(VID_KEY)
    if (!vid) {
      vid =
        window.crypto?.randomUUID?.() ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      window.localStorage.setItem(VID_KEY, vid)
    }
  } catch {
    // Sin localStorage (modo privado): un id por carga de página.
    vid = vid || `tmp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  }
  return vid
}

function skuFromPath(path) {
  const m = SKU_RE.exec(path || '')
  return m ? m[1].toLowerCase() : ''
}

function flush(useBeacon = false) {
  window.clearTimeout(timer)
  timer = null
  if (!queue.length) return
  const body = JSON.stringify({ vid: visitorId(), events: queue })
  queue = []
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* la analítica nunca rompe el sitio */
  }
}

function enqueue(event) {
  queue.push(event)
  if (queue.length >= MAX_QUEUE) flush()
  else if (!timer) timer = window.setTimeout(flush, FLUSH_MS)
}

/** Una vista de página (se llama en cada cambio de ruta, ver DocumentHead). */
export function trackView(path) {
  if (!enabled()) return
  enqueue({ type: 'view', path, sku: skuFromPath(path) })
}

function labelOf(el) {
  const raw =
    el.getAttribute('data-track') ||
    el.getAttribute('aria-label') ||
    el.textContent ||
    el.getAttribute('title') ||
    ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, 80)
}

function hrefOf(el) {
  const href = el.getAttribute('href')
  if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return ''
  try {
    const url = new URL(href, window.location.href)
    // Mismo sitio: solo el path. Externo: solo el dominio (sin query ni path).
    return url.origin === window.location.origin ? url.pathname : url.hostname
  } catch {
    return ''
  }
}

function onClick(event) {
  if (!enabled()) return
  const el = event.target instanceof Element ? event.target.closest(SELECTOR) : null
  if (!el) return
  const href = hrefOf(el)
  const sku =
    el.closest('[data-track-sku]')?.getAttribute('data-track-sku') ||
    skuFromPath(href) ||
    skuFromPath(window.location.pathname)
  enqueue({
    type: 'click',
    path: window.location.pathname,
    sku,
    label: labelOf(el),
    tag: el.tagName.toLowerCase(),
    href,
  })
}

/** Se llama una sola vez al arrancar (main.jsx). */
export function installTracker() {
  if (installed || typeof window === 'undefined') return
  installed = true
  // Captura: cuenta el clic aunque algo después le haga stopPropagation.
  document.addEventListener('click', onClick, { capture: true })
  window.addEventListener('pagehide', () => flush(true))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
}
