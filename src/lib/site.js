// Marca centralizada del sitio vendedor.
export const SITE_NAME = 'SCROLL LAB'
export const SITE_TAGLINE = 'Solo scrolleá.'

export const SUPPORT_EMAIL = 'hola@scrolllab.com.ar'

/** Canonical origin (SEO / OG). Mantener alineado con index.html. */
export const SITE_URL = 'https://www.scrolllab.com.ar'

/**
 * Meta SEO del marketplace.
 * Categoría: plantillas web / web templates (radar Envato-like).
 * Diferencial: storytelling + fuente React.
 */
export const SITE_SEO = {
  title: 'SCROLL LAB — Plantillas web | Web templates',
  description:
    'Plantillas web / Storytelling templates. Elegí un modelo completo o armá tu propia página en el builder y descargá el código fuente, editable.',
  keywords:
    'plantillas web, web templates, website templates, plantillas para sitios web, react templates, storytelling templates, landing page templates',
}

/** Meta propia del builder (sí se indexa). Espejo en el boot de index.html. */
export const BUILDER_SEO = {
  title: 'SCROLL LAB — Builder | Armá tu plantilla web',
  description:
    'Builder / Armá tu página. Mezclá secciones de los modelos, previsualizá en vivo y descargá el código fuente React, editable.',
}

const INDEXABLE_ROBOTS = 'index, follow, max-image-preview:large'

function normalizePath(pathname) {
  const path = String(pathname || '/')
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

/** Title / description / robots / canonical según la ruta. */
export function seoForPath(pathname) {
  const path = normalizePath(pathname)
  if (path.startsWith('/templates/')) {
    return {
      title: SITE_SEO.title,
      description: SITE_SEO.description,
      robots: 'noindex, follow',
      canonical: `${SITE_URL}/`,
    }
  }
  if (path === '/builder') {
    return {
      title: BUILDER_SEO.title,
      description: BUILDER_SEO.description,
      robots: INDEXABLE_ROBOTS,
      canonical: `${SITE_URL}/builder`,
    }
  }
  return {
    title: SITE_SEO.title,
    description: SITE_SEO.description,
    robots: INDEXABLE_ROBOTS,
    canonical: `${SITE_URL}/`,
  }
}

export function applyDocumentSeo(seo) {
  if (typeof document === 'undefined' || !seo) return
  document.title = seo.title
  const setMeta = (selector, attr, value) => {
    const el = document.head.querySelector(selector)
    if (el) el.setAttribute(attr, value)
  }
  setMeta('meta[name="description"]', 'content', seo.description)
  setMeta('meta[name="robots"]', 'content', seo.robots)
  setMeta('meta[property="og:title"]', 'content', seo.title)
  setMeta('meta[property="og:description"]', 'content', seo.description)
  setMeta('meta[property="og:url"]', 'content', seo.canonical)
  setMeta('meta[name="twitter:title"]', 'content', seo.title)
  setMeta('meta[name="twitter:description"]', 'content', seo.description)
  const canonical = document.head.querySelector('link[rel="canonical"]')
  if (canonical) canonical.setAttribute('href', seo.canonical)
}
