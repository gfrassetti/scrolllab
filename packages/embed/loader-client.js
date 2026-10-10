// Endpoints de producción. El snippet solo pasa la key; esto lo hornea el
// paquete para que el tag quede en una línea.
const LOADER = 'https://embed.scrolllab.com.ar/v1/loader.js'
const API = 'https://www.scrolllab.com.ar'

/**
 * Carga `loader.js` una sola vez (marcado con `data-scrolllab-loader` para
 * dedupe entre varios embeds en la misma página) y monta el iframe cross-origin
 * en `el` vía `window.ScrollLab.render`. Devuelve un cleanup idempotente.
 *
 * `target`: la key de una sección (`pub_…`, string) o `{ key }` / `{ pack }`
 * (`pk_…`: varias secciones, un iframe por cada una, en orden).
 *
 * @param {HTMLElement|null} el
 * @param {string | { key?: string, pack?: string }} target
 * @returns {() => void}
 */
export function mountEmbed(el, target) {
  const opts = typeof target === 'string' ? { key: target } : target || {}
  if (!el || !(opts.key || opts.pack) || typeof window === 'undefined') return () => {}

  let cancelled = false
  const render = () => {
    if (!cancelled) window.ScrollLab?.render?.(el, { ...opts, api: API })
  }

  if (window.ScrollLab?.render) {
    render()
  } else {
    let s = document.querySelector('script[data-scrolllab-loader]')
    if (!s) {
      s = document.createElement('script')
      s.src = LOADER
      s.async = true
      s.dataset.scrolllabLoader = ''
      document.head.appendChild(s)
    }
    s.addEventListener('load', render)
  }

  return () => {
    cancelled = true
    // Todo lo que montó el loader adentro de `el`: el iframe, el contenedor
    // de una sección con pin, o los N iframes de un pack.
    el.replaceChildren()
    el.removeAttribute('data-scrolllab-done')
  }
}
