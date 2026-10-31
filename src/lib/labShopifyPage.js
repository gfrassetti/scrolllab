/**
 * /lab/shopify: la guía para usar LAB en una tienda Shopify. Es la página que
 * busca quien quiere «animaciones para Shopify»: en español (lo que se indexa),
 * con capturas reales de una tienda de desarrollo (tema Horizon, 2026-10-28).
 *
 * La página de React, el HTML que se emite en el build (scripts/gen-share-pages.mjs)
 * y los tests leen este mismo objeto, así no se despegan. Todo lo que dice se
 * probó en esa tienda: el widget va en una sección «Liquid personalizado».
 */
import { INDEXABLE_ROBOTS, LAB_SHOPIFY_SEO, SITE_NAME, SITE_URL } from './site.js'
import { renderSharePage } from './sharePages.js'

export const LAB_SHOPIFY_PATH = '/lab/shopify'

export { LAB_SHOPIFY_SEO }

export const LAB_SHOPIFY = {
  path: LAB_SHOPIFY_PATH,
  canonical: `${SITE_URL}${LAB_SHOPIFY_PATH}`,
  robots: INDEXABLE_ROBOTS,
  ...LAB_SHOPIFY_SEO,
  breadcrumbLab: 'LAB',
  breadcrumbHere: 'Shopify',
  h1: 'Animaciones de scroll para tu tienda Shopify',
  lede:
    'Secciones con movimiento de nivel award para tu tienda: tipografía que se arma con el scroll, galerías, 3D. Sin apps y sin tocar el código del tema: se pega una línea en el editor de Shopify y el widget se edita desde LAB.',
  ctaPrimary: 'Empezá gratis',
  ctaSecondary: 'Ver los widgets',
  hero: {
    src: '/lab/shopify/store-widget.webp',
    width: 1268,
    height: 772,
    alt: 'Una tienda de snowboards en Shopify con el tema Horizon: la grilla de tablas y, debajo, un widget de LAB con las cifras de la tienda',
    caption: 'Un widget de LAB en una tienda Shopify con el tema Horizon, debajo de los productos.',
  },
  stepsTitle: 'Cómo se pone en tu tienda',
  steps: [
    {
      title: 'Publicás un widget en LAB',
      body: 'Elegís una sección, cambiás textos, fotos y colores, y la publicás. La tarjeta del widget te da su código: una sola línea.',
    },
    {
      title: 'Abrís el editor de tu tema',
      body: 'En Shopify: Tienda online → Temas → Personalizar. Elegís la página (inicio, un producto, una colección) y tocás «Agregar sección» → «Liquid personalizado».',
    },
    {
      title: 'Pegás el código y guardás',
      body: 'Va en el cuadro «Código Liquid». Para que ocupe todo el ancho de la pantalla, en «Ancho» elegí «Completo». Guardás y el widget aparece en la tienda, en el lugar de la sección: lo podés subir o bajar como cualquier otra.',
    },
  ],
  editor: {
    src: '/lab/shopify/editor-custom-liquid.webp',
    width: 1568,
    height: 676,
    alt: 'El editor de temas de Shopify con la sección «Liquid personalizado» seleccionada: el código del widget en el cuadro «Código Liquid» y el widget en la vista previa',
    caption: 'La sección «Liquid personalizado» con el código del widget, y el widget en la vista previa del editor.',
  },
  whyTitle: 'Por qué así y no con una app',
  why: [
    'No es una app: no pide permisos sobre tu tienda, tus pedidos ni tus clientes.',
    'No toca tu tema: si sacás la sección, la tienda queda exactamente como estaba.',
    'Corre aislado en su propio marco: no lee el carrito ni los datos de quien compra.',
    'Lo editás desde LAB: cambiás textos o fotos y se actualiza solo, sin volver a Shopify.',
    'Se adapta al teléfono y a la PC, y tiene versión calma para quien pide menos movimiento.',
  ],
  gridImage: {
    src: '/lab/shopify/store-widget-grid.webp',
    width: 1268,
    height: 400,
    alt: 'El widget de LAB dentro de la tienda Shopify: cuatro cifras grandes que cuentan con el scroll, con los textos de la tienda editados desde LAB',
  },
  faqTitle: 'Preguntas',
  faq: [
    {
      q: '¿Funciona con mi tema?',
      a: 'Con los temas de secciones de Shopify (Online Store 2.0), como Horizon o Dawn: todos traen la sección «Liquid personalizado». Lo probamos en Horizon, el tema actual de Shopify.',
    },
    {
      q: '¿Por qué queda un margen blanco alrededor del widget?',
      a: 'Es el ancho de página de tu tema. En la sección «Liquid personalizado», elegí «Ancho: Completo» y el widget va de borde a borde, también en el teléfono. Con «Página» queda dentro de los márgenes del tema, como el resto del contenido.',
    },
    {
      q: '¿Lo puedo poner en una página de producto o de colección?',
      a: 'Sí. En el editor elegís esa plantilla arriba (por ejemplo «Productos») y agregás la sección «Liquid personalizado» donde quieras.',
    },
    {
      q: '¿Necesito saber programar?',
      a: 'No. Copiás una línea desde la tarjeta del widget y la pegás en el editor de Shopify. Los cambios los hacés después desde el panel de LAB.',
    },
    {
      q: '¿Tengo que instalar algo?',
      a: 'No. No es una app ni un tema: es un código que se pega en una sección. No suma cuotas de apps ni cambia tu tema.',
    },
    {
      q: '¿Qué pasa si doy de baja LAB?',
      a: 'El widget deja de mostrarse y la sección queda vacía. Tu tienda sigue funcionando igual; podés borrar la sección cuando quieras.',
    },
    {
      q: '¿Y una tienda entera con este diseño?',
      a: 'Eso es el Builder: el kit de tienda arma catálogo, ficha de producto, carrito y checkout con nuestras secciones y se conecta a tu propia tienda Shopify. Los productos, el stock y el pago salen de Shopify, sin backend. Es código fuente, para quien programa; LAB es sin código. Sin Shopify, el checkout del kit es de ejemplo y no cobra: el cobro lo conectás vos en el código que descargás.',
    },
    {
      q: '¿Cuánto cuesta?',
      a: 'Empezás gratis con un widget publicado. Los planes pagos suman más widgets y se cobran en pesos (Mercado Pago) o en dólares con Polar.',
    },
  ],
  closingTitle: 'Tu tienda, con movimiento',
  closingBody: 'El primer widget publicado es gratis y va en una sección «Liquid personalizado», como en esta guía.',
  otherPlatforms: 'Para WordPress, Webflow o Squarespace, las guías están en',
  ogImage: `${SITE_URL}/lab/shopify/store-widget.webp`,
  ogImageAlt: `Un widget de LAB en una tienda Shopify — ${SITE_NAME}`,
}

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// Fuera de pantalla pero en el DOM: lo lee quien no ejecuta JS (buscadores, lectores).
const SR_ONLY =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap'

/** El contenido de la página como HTML simple (lo que se emite dentro de #root en el build). */
export function labShopifySnapshotHtml(d = LAB_SHOPIFY) {
  const e = escapeHtml
  return [
    `<div data-seo-snapshot style="${SR_ONLY}"><main><article>`,
    `<h1>${e(d.h1)}</h1>`,
    `<p>${e(d.lede)}</p>`,
    `<p><a href="/lab#planes">${e(d.ctaPrimary)}</a> · <a href="/lab">${e(d.ctaSecondary)}</a></p>`,
    `<h2>${e(d.stepsTitle)}</h2>`,
    `<ol>${d.steps.map((s) => `<li><strong>${e(s.title)}</strong> — ${e(s.body)}</li>`).join('')}</ol>`,
    `<h2>${e(d.whyTitle)}</h2>`,
    `<ul>${d.why.map((t) => `<li>${e(t)}</li>`).join('')}</ul>`,
    `<h2>${e(d.faqTitle)}</h2>`,
    d.faq.map((f) => `<h3>${e(f.q)}</h3><p>${e(f.a)}</p>`).join(''),
    `<p>${e(d.otherPlatforms)} <a href="/lab#ayuda">LAB</a></p>`,
    `</article></main></div>`,
  ].join('')
}

/**
 * El index.html del build convertido en /lab/shopify: title, description,
 * canonical y tarjeta propios, y el contenido dentro de #root. Falla si falta el
 * #root: mejor romper el build que publicar una página vacía para el buscador.
 */
export function renderLabShopifyPage(html, d = LAB_SHOPIFY) {
  const out = renderSharePage(html, {
    path: d.path,
    title: d.title,
    description: d.description,
    robots: d.robots,
    canonical: d.canonical,
    ogTitle: d.title,
    ogDescription: d.description,
    ogImage: d.ogImage,
    ogImageType: 'image/webp',
    ogImageAlt: d.ogImageAlt,
  })
  const root = '<div id="root"></div>'
  if (!out.includes(root)) throw new Error('renderLabShopifyPage: no encontré <div id="root"></div> en el HTML base')
  return out.replace(root, () => `<div id="root">${labShopifySnapshotHtml(d)}</div>`)
}
