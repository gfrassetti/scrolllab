/*
 * Helpers puros del loader. Viven aparte para poder testearlos (`node --test`)
 * sin un DOM — esbuild los inlinea al bundlear loader.js.
 */

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v
}

/**
 * Base del frame para un `<script>` del embed.
 *  - `data-frame` lo pisa (test local / staging).
 *  - Si no, se deriva del `src` del propio `<script>`: el frame vive al lado
 *    del loader en la misma carpeta versionada (.../embed/v1/loader.js →
 *    .../embed/v1), así funciona en cualquier host sin configurar nada.
 *  - Último recurso (src ilegible, script inline): `fallback`.
 */
export function resolveFrameBase(script, fallback) {
  const explicit = script.getAttribute('data-frame')
  if (explicit) return explicit.replace(/\/$/, '')
  try {
    const loc =
      (typeof location !== 'undefined' && location.href) || undefined
    const u = new URL(script.src, loc)
    const base = u.href
      .split('#')[0]
      .split('?')[0]
      .replace(/\/[^/]*$/, '')
    if (base) return base
  } catch {
    /* fallthrough */
  }
  return fallback
}

/**
 * Un #ancla clickeado dentro del embed, traducido a la página del cliente (el
 * iframe no la puede scrollear). `#algo` → el elemento con ese id, si la
 * página lo tiene; `#` y `#top` sin elemento → arriba de todo. null = nada.
 */
export function anchorTarget(hash) {
  if (typeof hash !== 'string' || hash.charAt(0) !== '#' || hash.length > 512) {
    return null
  }
  let id = hash.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    /* queda crudo */
  }
  return { id, top: id === '' || id === 'top' }
}

/**
 * `href` resuelto contra `base` si es una URL http(s) del MISMO origen; si no,
 * null. El frame le pide al loader navegar la página del cliente y el loader
 * solo acepta ir a su propio sitio: nunca a otro dominio ni a `javascript:`.
 */
export function sameOriginUrl(href, base) {
  if (typeof href !== 'string' || !href || href.length > 2048) return null
  try {
    const url = new URL(href, base)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin === new URL(base).origin ? url.href : null
  } catch {
    return null
  }
}
