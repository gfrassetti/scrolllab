const FALLBACK_LOADER_URL = 'https://embed.scrolllab.com.ar/v1/loader.js'

/**
 * Snippet que el usuario pega en su sitio.
 *  - `data-api`: base de la API para el fetch de la config (la manda el server
 *    en GET /api/embed/loader; el frame es estático y no la sabe si no).
 *  - SRI + crossorigin: solo si el server manda `integrity` (EMBED_SRI=true).
 */
export function embedSnippet(key, loader) {
  const url = loader?.url || FALLBACK_LOADER_URL
  const sri = loader?.integrity
    ? `\n  integrity="${loader.integrity}" crossorigin="anonymous"`
    : ''
  const apiAttr = loader?.api ? `\n  data-api="${loader.api}"` : ''
  return `<script src="${url}"${sri}\n  data-scrolllab data-key="${key}"${apiAttr} async></script>`
}
