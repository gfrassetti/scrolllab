const FALLBACK_LOADER_URL = 'https://embed.scrolllab.com.ar/v1/loader.js'

/**
 * Snippet que el usuario pega en su sitio. Con SRI + crossorigin cuando el
 * server nos da el hash (GET /api/embed/loader), para que el browser rechace
 * el loader si el CDN sirviera otra cosa.
 */
export function embedSnippet(key, loader) {
  const url = loader?.url || FALLBACK_LOADER_URL
  const sri = loader?.integrity
    ? `\n  integrity="${loader.integrity}" crossorigin="anonymous"`
    : ''
  return `<script src="${url}"${sri}\n  data-scrolllab data-key="${key}" async></script>`
}
