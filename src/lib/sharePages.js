/**
 * Páginas para compartir. El SPA sirve el mismo index.html en todas las rutas,
 * y Facebook / LinkedIn / X / WhatsApp / Slack no ejecutan JS: cualquier demo
 * compartida mostraba la tarjeta de la home. En el build (scripts/gen-share-pages.mjs)
 * se emite un index.html por demo y para /builder con sus og/twitter tags.
 *
 * Solo lógica pura: la usan el script de build y sus tests.
 */
import { SITE_NAME, SITE_URL, seoForPath } from './site.js'
import { TEMPLATE_PRICES_USD, isComingSoonSku, isLocalOnlySku } from './pricing.js'

/** Tamaño de las tarjetas (public/og/*.jpg). Espejo de og:image:width/height en index.html. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

const OG_DESCRIPTION_MAX = 200

/** SKUs con demo pública: las que tienen ruta en el marketplace. */
export function publicDemoSkus() {
  return Object.keys(TEMPLATE_PRICES_USD).filter(
    (sku) => !isComingSoonSku(sku) && !isLocalOnlySku(sku),
  )
}

/** Corta en el último espacio antes de `max` y cierra con "…". */
export function truncate(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return `${base.replace(/[\s.,;:—-]+$/, '')}…`
}

/**
 * Tarjeta de una demo. `vibe` y `description` salen de templates.<sku> en
 * en.json: las tarjetas van en inglés porque se comparten en X, Reddit y HN.
 */
export function demoSharePage(sku, { vibe, description }) {
  const name = sku.toUpperCase()
  const path = `/templates/${sku}`
  const seo = seoForPath(path)
  return {
    path,
    robots: seo.robots,
    canonical: seo.canonical,
    ogTitle: `${name} — ${vibe} web template | ${SITE_NAME}`,
    ogDescription: truncate(description, OG_DESCRIPTION_MAX),
    ogImage: `${SITE_URL}/og/${sku}.jpg`,
    ogImageType: 'image/jpeg',
    ogImageAlt: `${name} — ${vibe} web template, ${SITE_NAME}`,
  }
}

/** /builder se indexa: además de las tarjetas lleva su title y description. */
export function builderSharePage() {
  const seo = seoForPath('/builder')
  return {
    path: '/builder',
    robots: seo.robots,
    canonical: seo.canonical,
    title: seo.title,
    description: seo.description,
    ogTitle: seo.title,
    ogDescription: seo.description,
    ogImage: `${SITE_URL}/og.png`,
    ogImageType: 'image/png',
    ogImageAlt: 'SCROLL LAB — plantillas web / web templates con código fuente',
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

function replaceOnce(html, re, tag, what) {
  if (!re.test(html)) throw new Error(`renderSharePage: no encontré ${what} en el HTML base`)
  // Función y no string: el contenido puede traer "$&" u otros patrones de replace.
  return html.replace(re, () => tag)
}

function setMeta(html, attr, key, content) {
  const re = new RegExp(`<meta\\b[^>]*?\\b${attr}="${escapeRe(key)}"[^>]*?>`)
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`
  return replaceOnce(html, re, tag, `<meta ${attr}="${key}">`)
}

function setCanonical(html, href) {
  const re = /<link\b[^>]*?\brel="canonical"[^>]*?>/
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`
  return replaceOnce(html, re, tag, '<link rel="canonical">')
}

function setTitle(html, title) {
  return replaceOnce(
    html,
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
    '<title>',
  )
}

/**
 * Devuelve `html` (el index.html del build) con los tags de `page`. Falla si
 * falta algún tag: mejor romper el build que publicar una tarjeta equivocada.
 */
export function renderSharePage(html, page) {
  let out = html
  if (page.title) out = setTitle(out, page.title)
  if (page.description) out = setMeta(out, 'name', 'description', page.description)
  out = setMeta(out, 'name', 'robots', page.robots)
  out = setCanonical(out, page.canonical)

  out = setMeta(out, 'property', 'og:title', page.ogTitle)
  out = setMeta(out, 'property', 'og:description', page.ogDescription)
  out = setMeta(out, 'property', 'og:url', `${SITE_URL}${page.path}`)
  out = setMeta(out, 'property', 'og:image', page.ogImage)
  out = setMeta(out, 'property', 'og:image:type', page.ogImageType)
  out = setMeta(out, 'property', 'og:image:alt', page.ogImageAlt)

  out = setMeta(out, 'name', 'twitter:title', page.ogTitle)
  out = setMeta(out, 'name', 'twitter:description', page.ogDescription)
  out = setMeta(out, 'name', 'twitter:image', page.ogImage)
  out = setMeta(out, 'name', 'twitter:image:alt', page.ogImageAlt)
  return out
}
