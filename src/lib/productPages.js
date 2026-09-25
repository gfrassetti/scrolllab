/**
 * Páginas de producto: una por template, en español, para que Google (y quien
 * llega por una búsqueda) encuentre cada uno con su descripción, sus secciones
 * y su precio. Las demos (/templates/<sku>) siguen sin indexarse: son pantalla
 * completa con textos de relleno.
 *
 * El texto sale de es.json (templates.<sku> y builder.sections.<sku>) más
 * PRODUCT_COPY. La página de React, el HTML que se emite en el build
 * (scripts/gen-share-pages.mjs) y los tests leen el mismo objeto, así no se
 * despegan. Solo lógica pura: `messages` (es.json) llega por parámetro.
 */
import { INDEXABLE_ROBOTS, SITE_NAME, SITE_URL } from './site.js'
import { templatePriceUsd } from './pricing.js'
import { publicDemoSkus, renderSharePage, truncate } from './sharePages.js'

export const PRODUCT_BASE_PATH = '/plantillas'

export const productPath = (sku) => `${PRODUCT_BASE_PATH}/${sku}`
export const productUrl = (sku) => `${SITE_URL}${productPath(sku)}`

/** Solo los templates con demo pública tienen página (ni RATIO, ni PLUM, ni SIGNAL). */
export function isProductSku(sku) {
  return publicDemoSkus().includes(sku)
}

/** Textos que no cambian de un template a otro. Todo lo que dicen es verificable en el sitio. */
export const PRODUCT_COPY = {
  subtitle: 'Template scrollytelling',
  idealForLabel: 'Ideal para',
  priceLabel: (usd) => `USD ${usd} de lista`,
  priceNote: 'Pago único, sin suscripción. Se cobra en pesos a la cotización vigente.',
  demo: 'Ver la demo en vivo',
  addToCart: 'Agregar al carrito',
  buy: 'Comprar',
  redirecting: 'Redirigiendo…',
  sectionsTitle: 'Secciones que trae',
  sectionsIntro: (n) => `${n} secciones animadas, listas para editar.`,
  effectsTitle: 'Efectos destacados',
  includesTitle: 'Qué te llevás',
  includes: [
    'El proyecto completo en un ZIP: React, Vite y Tailwind, listo para correr con npm install y npm run dev.',
    'Todo el código fuente, sin dependencias del servidor de este sitio: lo editás como cualquier proyecto tuyo.',
    'Textos e imágenes de ejemplo para reemplazar por los tuyos.',
    'Licencia Regular: usalo en tus proyectos o en los de tus clientes, sin límite de sitios. No se puede revender.',
    'Descargás el ZIP apenas se confirma el pago y después desde tu cuenta, las veces que quieras.',
  ],
  howTitle: 'Cómo funciona',
  how: [
    'Elegís el template y pagás con Mercado Pago.',
    'Descargás el ZIP desde tu cuenta.',
    'Lo abrís en tu editor, cambiás textos e imágenes y lo publicás donde quieras.',
  ],
  moreTitle: 'Otros templates',
  licenseLink: 'Ver la licencia',
  breadcrumbHome: 'Inicio',
  breadcrumbTemplates: 'Templates',
  posterAlt: (name) => `Vista previa del template ${name}`,
}

const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/**
 * Primera oración del texto (o el texto entero), recortada a `max`. Si hay que
 * cortar, no deja una palabra suelta antes de los puntos ("…cascos y…").
 */
function firstSentence(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  const match = /^(.+?[.!?])(\s|$)/.exec(clean)
  const sentence = truncate(match ? match[1] : clean, max)
  return sentence.replace(/\s+(y|o|e|u|de|del|la|el|los|las|con|para|en|un|una|que|a)…$/i, '…')
}

/**
 * Separa la descripción de es.json en lo que es el template y el cierre
 * "Ideal para …" (que la página muestra aparte).
 */
export function splitDescription(description) {
  const text = String(description || '').replace(/\s+/g, ' ').trim()
  const at = text.search(/\bIdeal para\b/)
  if (at <= 0) return { pitch: text, idealFor: '' }
  return {
    pitch: text.slice(0, at).trim(),
    idealFor: text.slice(at).replace(/^Ideal para\s*/i, '').trim(),
  }
}

/** Los 4 templates que siguen a `sku` en el catálogo (da vuelta al final): links internos. */
function relatedSkus(sku, count = 4) {
  const skus = publicDemoSkus()
  const at = skus.indexOf(sku)
  const n = Math.min(count, skus.length - 1)
  return Array.from({ length: n }, (_, k) => skus[(at + 1 + k) % skus.length])
}

/**
 * `templates.<sku>` es obligatorio. `builder.sections.<sku>` es opcional: los
 * templates que no están en la paleta del builder (COMIC) no lo tienen y la
 * página sale sin la lista de secciones.
 */
function textsOf(messages, sku) {
  const meta = messages?.templates?.[sku]
  if (!meta?.vibe || !meta?.description || !Array.isArray(meta.tags)) {
    throw new Error(`productPageData: faltan textos de "${sku}" en es.json (templates.${sku})`)
  }
  return { meta, sections: messages?.builder?.sections?.[sku] ?? {} }
}

/** Todo lo que necesita la página de un template. Falla si el SKU no tiene página. */
export function productPageData(sku, messages) {
  if (!isProductSku(sku)) {
    throw new Error(`productPageData: "${sku}" no tiene página de producto`)
  }
  const { meta, sections } = textsOf(messages, sku)
  const name = sku.toUpperCase()
  const priceUsd = templatePriceUsd(sku)
  const { pitch, idealFor } = splitDescription(meta.description)
  const url = productUrl(sku)

  const title = `${name} — Template ${lowerFirst(meta.vibe)} | ${SITE_NAME}`
  const description = `${firstSentence(pitch, 125)} Template con código fuente, desde USD ${priceUsd}.`

  return {
    sku,
    name,
    path: productPath(sku),
    url,
    demoPath: `/templates/${sku}`,
    poster: `/catalog/${sku}.jpg`,
    priceUsd,
    vibe: meta.vibe,
    tags: [...meta.tags],
    pitch,
    idealFor,
    sections: Object.entries(sections).map(([key, s]) => ({ key, name: s.name, blurb: s.blurb })),
    related: relatedSkus(sku).map((other) => ({
      sku: other,
      name: other.toUpperCase(),
      vibe: messages.templates[other].vibe,
      path: productPath(other),
    })),
    h1: `${name} — ${PRODUCT_COPY.subtitle}`,
    priceLine: `${PRODUCT_COPY.priceLabel(priceUsd)}. ${PRODUCT_COPY.priceNote}`,
    // Meta de la página
    title,
    description,
    robots: INDEXABLE_ROBOTS,
    canonical: url,
    ogImage: `${SITE_URL}/og/${sku}.jpg`,
    ogImageAlt: `${name} — ${meta.vibe}: template scrollytelling, ${SITE_NAME}`,
    copy: PRODUCT_COPY,
  }
}

/** Meta para el cliente (DocumentHead) al navegar a una página de producto; null si no lo es. */
export function productSeoForPath(pathname, messages) {
  const match = /^\/plantillas\/([a-z0-9-]+)\/?$/.exec(String(pathname || ''))
  if (!match || !isProductSku(match[1])) return null
  const { title, description, robots, canonical } = productPageData(match[1], messages)
  return { title, description, robots, canonical }
}

/** Datos estructurados schema.org/Product: precio de lista en USD, el mismo que muestra la página. */
export function productJsonLd(data) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${data.name} — template ${lowerFirst(data.vibe)}`,
    description: data.description,
    sku: data.sku,
    url: data.url,
    image: [data.ogImage],
    category: 'Templates web',
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: data.url,
      priceCurrency: 'USD',
      price: data.priceUsd.toFixed(2),
      availability: 'https://schema.org/InStock',
    },
  }
}

// Fuera de pantalla pero en el DOM: lo lee quien no ejecuta JS (buscadores, lectores).
// Al arrancar, React reemplaza todo el contenido de #root con la página de verdad.
const SR_ONLY =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap'

/** El contenido de la página como HTML simple (lo que se emite dentro de #root en el build). */
export function productSnapshotHtml(data) {
  const c = data.copy
  const e = escapeHtml
  const items = (list) => list.map((text) => `<li>${e(text)}</li>`).join('')
  return [
    `<div data-seo-snapshot style="${SR_ONLY}"><main><article>`,
    `<h1>${e(data.h1)}</h1>`,
    `<p>${e(data.vibe)}</p>`,
    `<p>${e(data.pitch)}</p>`,
    data.idealFor ? `<p>${e(c.idealForLabel)} ${e(data.idealFor)}</p>` : '',
    `<p>${e(data.priceLine)}</p>`,
    `<p><a href="${e(data.demoPath)}">${e(c.demo)}</a></p>`,
    ...(data.sections.length
      ? [
          `<h2>${e(c.sectionsTitle)}</h2>`,
          `<p>${e(c.sectionsIntro(data.sections.length))}</p>`,
          `<ul>${data.sections.map((s) => `<li><strong>${e(s.name)}</strong> — ${e(s.blurb)}</li>`).join('')}</ul>`,
        ]
      : []),
    `<h2>${e(c.effectsTitle)}</h2>`,
    `<ul>${items(data.tags)}</ul>`,
    `<h2>${e(c.includesTitle)}</h2>`,
    `<ul>${items(c.includes)}</ul>`,
    `<h2>${e(c.howTitle)}</h2>`,
    `<ol>${items(c.how)}</ol>`,
    `<h2>${e(c.moreTitle)}</h2>`,
    `<ul>${data.related.map((r) => `<li><a href="${e(r.path)}">${e(r.name)}</a> — ${e(r.vibe)}</li>`).join('')}</ul>`,
    `<p><a href="/legal/license">${e(c.licenseLink)}</a> · <a href="/">${e(SITE_NAME)}</a></p>`,
    `</article></main></div>`,
  ].join('')
}

/** JSON dentro de <script>: sin "<" para que nada cierre la etiqueta. */
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

/**
 * Devuelve `html` (el index.html del build) convertido en la página de `data`:
 * title, description, canonical y tarjeta propios, los datos de producto en el
 * <head> y el contenido dentro de #root. Falla si falta algún tag: mejor romper
 * el build que publicar una página a medias.
 */
export function renderProductPage(html, data) {
  let out = renderSharePage(html, {
    path: data.path,
    title: data.title,
    description: data.description,
    robots: data.robots,
    canonical: data.canonical,
    ogTitle: data.title,
    ogDescription: data.description,
    ogImage: data.ogImage,
    ogImageType: 'image/jpeg',
    ogImageAlt: data.ogImageAlt,
  })

  if (!out.includes('</head>')) throw new Error('renderProductPage: no encontré </head> en el HTML base')
  const jsonLd = `<script type="application/ld+json">${safeJson(productJsonLd(data))}</script>`
  // Función y no string: el JSON puede traer "$&" u otros patrones de replace.
  out = out.replace('</head>', () => `${jsonLd}\n  </head>`)

  const root = '<div id="root"></div>'
  if (!out.includes(root)) throw new Error('renderProductPage: no encontré <div id="root"></div> en el HTML base')
  return out.replace(root, () => `<div id="root">${productSnapshotHtml(data)}</div>`)
}
