// Marca centralizada del sitio vendedor.
export const SITE_NAME = 'SCROLL LAB'
export const SITE_TAGLINE = 'Webs que se mueven.'

export const SUPPORT_EMAIL = 'hola@scrolllab.com.ar'

/**
 * Quién vende, como figura en los Términos y la Política de Privacidad
 * (`{{seller}}`). El nombre del vendedor tiene que estar en los Términos
 * (decisión del dueño, 2026-10-12).
 */
export const SELLER_NAME = 'Scroll Lab - Web Design'

/**
 * Plazo de reembolso por arrepentimiento (días): vive en el dominio, lo usan el
 * servidor y los textos legales (`{{days}}`). Ver src/domain/policy.js.
 */
export { REFUND_DAYS } from '../domain/policy.js'

export const INSTAGRAM_HANDLE = '@scrolllab_ar'
export const INSTAGRAM_URL = 'https://www.instagram.com/scrolllab_ar/'

/** Canonical origin (SEO / OG). Mantener alineado con index.html. */
export const SITE_URL = 'https://www.scrolllab.com.ar'

/**
 * Meta SEO del marketplace.
 * Posicionamiento (2026-09-27): "Scroll Lab" en el título va en title case
 * (no ALL CAPS — más legible en un resultado de Google; el wordmark visual
 * del sitio sigue en mayúsculas, es un tema aparte). El título suma "estudio"
 * a "templates" para reflejar que ya no vendemos solo plantillas (ver
 * docs/estudio-positioning.md) sin perder el término que ya tenía ranking.
 * Va en español porque el mercado de hoy es Argentina (cobro en pesos, casi
 * todos los clics de Google son de acá). La versión en inglés tiene que ir en
 * su propia URL (/en/) con hreflang, no en un meta tag de esta: una URL tiene
 * un solo title para Google. Conviene hacerla cuando haya cobro en dólares.
 * No apunta a "plantillas web" (Envato, Wix): esa búsqueda es de gente que
 * quiere armar un sitio sin código y no puede usar un ZIP de código fuente.
 * No mencionamos el stack (React/GSAP) en copy público — no hace falta
 * anunciarlo.
 * "scrollytelling" AFUERA del copy público (2026-09-28, feedback directo del
 * dueño): es jerga de diseño/dev, nadie fuera del rubro entiende qué es. Se
 * reemplaza por "scroll cinematográfico" (ya se usaba en otra copy del sitio,
 * plain-language) o "storytelling" (palabra real, sin el blend). Sigue en
 * `keywords` de abajo nomás como variante de búsqueda — ese campo no lo lee
 * nadie, solo lo indexa Google.
 * Título de la home (2026-09-28, decisión final del dueño): "Estudio digital
 * y plantillas web" — nombra las dos patas del negocio en lenguaje llano.
 * Nota: "plantillas web" es justo el término que el párrafo de arriba decía
 * evitar (atrae a quien busca un builder no-code tipo Wix, no un ZIP de
 * código). Se prioriza que cualquiera entienda el título por sobre ese
 * matiz de intención de búsqueda — decisión consciente, no un descuido.
 * Título y descripción (2026-10-02, pedido del dueño tras mirar a la
 * competencia en Google): lo que trae gente a Envato, ThemeForest, Webflow y
 * Colorlib es "scroll animation / smooth scroll / parallax website templates"
 * y, en español, "plantillas web scroll / parallax". Se calcó ese vocabulario
 * ("plantillas web con scroll animado", "parallax", "scroll suave") sin nombrar
 * librerías ni usar "scrollytelling" afuera de `keywords`.
 * Título (2026-10-07, el dueño no quedó conforme con "con scroll animado"):
 * vuelve "storytelling" al título — ya era el término plain-language elegido
 * el 2026-09-28 (ver arriba) para reemplazar "scrollytelling", solo que no
 * había llegado al título. La descripción y `keywords` (vocabulario de
 * competencia) no cambian, solo el título.
 */
export const SITE_SEO = {
  title: 'Scroll Lab — Plantillas web storytelling | Estudio web',
  description:
    'Plantillas web con scroll animado, parallax y scroll suave, con el código fuente. Armá la tuya en el builder o pedinos un sitio a medida.',
  keywords:
    'plantillas web con scroll animado, plantillas parallax, scroll suave, templates con animaciones, plantillas html, plantillas con código fuente, scroll animation website templates, parallax website templates, smooth scroll templates, scrollytelling templates, plantillas scrollytelling, landing page templates, estudio de diseño web',
}

/**
 * Meta propia del builder (sí se indexa). Espejo en el boot de index.html.
 * Título (2026-10-11, el dueño): «Sitio con scroll cinematográfico» no decía
 * qué hace la página ni qué te llevás. Ahora nombra la acción (armar una
 * página por secciones) y el entregable (código fuente), en la misma forma de
 * frase nominal que LAB («Online widgets»).
 */
export const BUILDER_SEO = {
  title: 'Scroll Lab — Builder | Armado de páginas con código fuente',
  description:
    'Mezclá secciones de todos los modelos, previsualizá el scroll en vivo y descargá el código fuente, editable.',
}

/**
 * Meta propia de /lab (sí se indexa). Antes caía en el default de SITE_SEO
 * y terminaba diciendo "plantillas web" en una página que no vende templates
 * — LAB es la sección hosteada por suscripción (embed con <script>). Espejo
 * en el boot de index.html.
 */
export const LAB_SEO = {
  title: 'Scroll Lab — LAB | Online widgets',
  description:
    'Una sección con nuestro nivel de diseño, lista para insertar en cualquier sitio con un script, sin bajar código. La editás desde un panel. Empezá gratis.',
}

export const INDEXABLE_ROBOTS = 'index, follow, max-image-preview:large, noai, noimageai'

function normalizePath(pathname) {
  const path = String(pathname || '/')
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

/** Title / description / robots / canonical según la ruta. */
export function seoForPath(pathname) {
  const path = normalizePath(pathname)
  if (path.startsWith('/templates/')) {
    // La página de producto en /plantillas/:sku es la que indexa; esta es el
    // demo interactivo en sí (pesado para crawlers, no hace falta indexarlo).
    return {
      title: SITE_SEO.title,
      description: SITE_SEO.description,
      robots: 'noindex, follow, noai, noimageai',
      canonical: `${SITE_URL}/`,
    }
  }
  if (path.startsWith('/lab/editar/')) {
    // El token va en la URL y es secreto: ni indexarla ni darla como canónica.
    return {
      title: LAB_SEO.title,
      description: LAB_SEO.description,
      robots: 'noindex, nofollow, noarchive, noai, noimageai',
      canonical: `${SITE_URL}/lab`,
    }
  }
  if (path === '/estudio/vesper') {
    // VESPER es una pieza propia del Estudio, no un trabajo para un cliente: no está linkeada en el sitio y
    // se muestra solo a mano (dueño, 2026-10-19). Sin título ni descripción propios (no tiene sentido si no
    // aparece en ningún lado): solo queda fuera de los buscadores.
    return {
      title: SITE_SEO.title,
      description: SITE_SEO.description,
      robots: 'noindex, nofollow, noarchive, noai, noimageai',
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
  if (path === '/lab') {
    return {
      title: LAB_SEO.title,
      description: LAB_SEO.description,
      robots: INDEXABLE_ROBOTS,
      canonical: `${SITE_URL}/lab`,
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
