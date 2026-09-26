// Marca centralizada del sitio vendedor.
export const SITE_NAME = 'SCROLL LAB'
export const SITE_TAGLINE = 'Solo scrolleá.'

export const SUPPORT_EMAIL = 'hola@scrolllab.com.ar'

export const INSTAGRAM_HANDLE = '@scrolllab_ar'
export const INSTAGRAM_URL = 'https://www.instagram.com/scrolllab_ar/'

/** Canonical origin (SEO / OG). Mantener alineado con index.html. */
export const SITE_URL = 'https://www.scrolllab.com.ar'

/**
 * Meta SEO del marketplace.
 * Posicionamiento (2026-09-20): "Immersive Scrolling Web Templates" → en español
 * "Templates web con scroll inmersivo", con fuente React + GSAP, para devs y
 * estudios. Va en español porque el mercado de hoy es Argentina (cobro en pesos,
 * casi todos los clics de Google son de acá). La versión en inglés tiene que ir
 * en su propia URL (/en/) con hreflang, no en un meta tag de esta: una URL tiene
 * un solo title para Google. Conviene hacerla cuando haya cobro en dólares.
 * No apunta a "plantillas web" (Envato, Wix): esa búsqueda es de gente que quiere
 * armar un sitio sin código y no puede usar un ZIP de React.
 */
export const SITE_SEO = {
  title: 'SCROLL LAB — Templates web con scroll inmersivo',
  description:
    'Templates web con scroll inmersivo en React + GSAP. Elegí uno completo o armá el tuyo en el builder y descargá el código fuente, listo para editar.',
  keywords:
    'scrollytelling templates, plantillas scrollytelling, react templates, gsap templates, scroll animation template, plantillas web, web templates, código fuente React, landing page templates',
}

/** Meta propia del builder (sí se indexa). Espejo en el boot de index.html. */
export const BUILDER_SEO = {
  title: 'SCROLL LAB — Builder | Armá tu sitio scrollytelling',
  description:
    'Mezclá secciones de todos los modelos, previsualizá el scroll en vivo y descargá el código fuente React + GSAP, editable.',
}

export const INDEXABLE_ROBOTS = 'index, follow, max-image-preview:large'

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
