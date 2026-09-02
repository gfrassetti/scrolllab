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
