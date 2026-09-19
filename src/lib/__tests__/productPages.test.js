import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SITE_URL } from '../site.js'
import { TEMPLATE_PRICES_USD } from '../pricing.js'
import { publicDemoSkus } from '../sharePages.js'
import {
  PRODUCT_COPY,
  isProductSku,
  productJsonLd,
  productPageData,
  productSeoForPath,
  productUrl,
  renderProductPage,
  splitDescription,
} from '../productPages.js'

const fromRoot = (rel) => fileURLToPath(new URL(`../../../${rel}`, import.meta.url))
const read = (rel) => fs.readFileSync(fromRoot(rel), 'utf8')

const es = JSON.parse(read('src/i18n/locales/es.json'))
// El HTML real del sitio: si alguien reformatea un tag del head o el #root, esto avisa.
const indexHtml = read('index.html')
const skus = publicDemoSkus()

const tag = (html, re) => (html.match(re) || [])[1]
const ldScripts = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])

describe('isProductSku', () => {
  it('solo los templates con demo pública tienen página', () => {
    for (const sku of skus) assert.equal(isProductSku(sku), true, sku)
    for (const sku of ['ratio', 'plum', 'signal', 'nope', '']) {
      assert.equal(isProductSku(sku), false, sku || '(vacío)')
    }
  })
})

describe('splitDescription', () => {
  it('separa el pitch del cierre "Ideal para …"', () => {
    const out = splitDescription('Pantalla casi negra. La página se comporta como una película. Ideal para fotógrafos o cineastas.')
    assert.equal(out.pitch, 'Pantalla casi negra. La página se comporta como una película.')
    assert.equal(out.idealFor, 'fotógrafos o cineastas.')
  })

  it('sin "Ideal para" todo es pitch, y el vacío no rompe', () => {
    assert.deepEqual(splitDescription('Solo pitch.'), { pitch: 'Solo pitch.', idealFor: '' })
    assert.deepEqual(splitDescription(''), { pitch: '', idealFor: '' })
    assert.deepEqual(splitDescription(undefined), { pitch: '', idealFor: '' })
  })
})

describe('productPageData — cada template en venta', () => {
  for (const sku of skus) {
    it(`${sku}: título, descripción, precio, secciones e imágenes`, () => {
      const d = productPageData(sku, es)

      assert.ok(d.title.startsWith(sku.toUpperCase()), d.title)
      assert.ok(d.title.includes('React + GSAP'), d.title)
      assert.ok(d.title.length <= 75, `título de ${d.title.length} caracteres: ${d.title}`)

      assert.ok(d.description.length >= 90 && d.description.length <= 190, `descripción de ${d.description.length}: ${d.description}`)
      assert.ok(!/\s(y|o|de|con|que)…/.test(d.description), `la descripción se corta en una palabra suelta: ${d.description}`)
      assert.ok(d.description.includes(`USD ${TEMPLATE_PRICES_USD[sku]}`), d.description)
      assert.equal(d.priceUsd, TEMPLATE_PRICES_USD[sku])

      assert.equal(d.canonical, productUrl(sku))
      assert.equal(d.path, `/plantillas/${sku}`)
      assert.equal(d.demoPath, `/templates/${sku}`)
      assert.match(d.robots, /^index, follow/)

      assert.ok(d.pitch.length > 40, 'sin pitch')
      assert.ok(d.tags.length >= 3, 'pocos efectos destacados')
      // Los templates que están en el builder traen su lista de secciones; COMIC no.
      if (es.builder.sections[sku]) {
        assert.ok(d.sections.length >= 5, `solo ${d.sections.length} secciones`)
      } else {
        assert.deepEqual(d.sections, [])
      }
      for (const s of d.sections) {
        assert.ok(s.name && s.blurb, `sección sin nombre o sin texto: ${JSON.stringify(s)}`)
      }

      assert.ok(fs.existsSync(fromRoot(`public/og/${sku}.jpg`)), `falta public/og/${sku}.jpg`)
      assert.ok(fs.existsSync(fromRoot(`public${d.poster}`)), `falta public${d.poster}`)
    })
  }

  it('los títulos y las descripciones no se repiten entre templates (Google los tomaría por duplicados)', () => {
    const data = skus.map((sku) => productPageData(sku, es))
    assert.equal(new Set(data.map((d) => d.title)).size, skus.length)
    assert.equal(new Set(data.map((d) => d.description)).size, skus.length)
  })

  it('enlaza a otros 4 templates en venta, nunca a sí mismo', () => {
    for (const sku of skus) {
      const { related } = productPageData(sku, es)
      assert.equal(related.length, 4, sku)
      assert.equal(new Set(related.map((r) => r.sku)).size, 4, sku)
      for (const r of related) {
        assert.notEqual(r.sku, sku)
        assert.ok(isProductSku(r.sku), r.sku)
        assert.equal(r.path, `/plantillas/${r.sku}`)
      }
    }
  })

  it('falla en voz alta si el SKU no tiene página o faltan sus textos', () => {
    assert.throws(() => productPageData('plum', es), /no tiene página/)
    assert.throws(() => productPageData('ratio', es), /no tiene página/)
    assert.throws(() => productPageData('nope', es), /no tiene página/)

    const sinTextos = structuredClone(es)
    delete sinTextos.templates.nocturne
    assert.throws(() => productPageData('nocturne', sinTextos), /faltan textos de "nocturne"/)

    const sinTags = structuredClone(es)
    delete sinTags.templates.nocturne.tags
    assert.throws(() => productPageData('nocturne', sinTags), /faltan textos de "nocturne"/)
  })

  it('sin lista de secciones (como COMIC) la página sale igual, sin ese bloque', () => {
    const sinSecciones = structuredClone(es)
    delete sinSecciones.builder.sections.nocturne
    const d = productPageData('nocturne', sinSecciones)
    assert.deepEqual(d.sections, [])
    const html = renderProductPage(indexHtml, d)
    assert.ok(!html.includes(PRODUCT_COPY.sectionsTitle), 'quedó el título de secciones sin secciones')
    assert.ok(html.includes(PRODUCT_COPY.effectsTitle), 'se perdieron los efectos destacados')
  })
})

describe('productSeoForPath', () => {
  it('da el title y la meta de una página de producto, con o sin barra final', () => {
    const seo = productSeoForPath('/plantillas/nocturne', es)
    assert.equal(seo.title, productPageData('nocturne', es).title)
    assert.equal(seo.canonical, `${SITE_URL}/plantillas/nocturne`)
    assert.match(seo.robots, /^index/)
    assert.deepEqual(productSeoForPath('/plantillas/nocturne/', es), seo)
  })

  it('devuelve null para cualquier otra ruta', () => {
    for (const p of ['/', '/builder', '/templates/nocturne', '/plantillas', '/plantillas/plum', '/plantillas/nope', '/plantillas/nocturne/extra', '', undefined]) {
      assert.equal(productSeoForPath(p, es), null, String(p))
    }
  })
})

describe('productJsonLd', () => {
  it('es un Product con el precio de lista en USD, el mismo que muestra la página', () => {
    for (const sku of skus) {
      const d = productPageData(sku, es)
      const ld = productJsonLd(d)
      assert.equal(ld['@type'], 'Product')
      assert.equal(ld.sku, sku)
      assert.equal(ld.offers.priceCurrency, 'USD')
      assert.equal(ld.offers.price, `${TEMPLATE_PRICES_USD[sku]}.00`)
      assert.equal(ld.offers.url, d.canonical)
      assert.equal(ld.url, d.canonical)
      assert.ok(ld.image[0].startsWith('https://'), 'la imagen tiene que ser absoluta')
      assert.match(ld.offers.availability, /InStock$/)
    }
  })
})

describe('renderProductPage', () => {
  const data = productPageData('nocturne', es)
  const html = renderProductPage(indexHtml, data)

  it('pone el title, la descripción, el canonical y la tarjeta propios', () => {
    assert.equal(tag(html, /<title>([\s\S]*?)<\/title>/), data.title)
    assert.equal(tag(html, /<meta name="description" content="([^"]*)"/), data.description)
    assert.equal(tag(html, /<link rel="canonical" href="([^"]*)"/), `${SITE_URL}/plantillas/nocturne`)
    assert.match(tag(html, /<meta name="robots" content="([^"]*)"/), /^index, follow/)
    assert.equal(tag(html, /<meta property="og:url" content="([^"]*)"/), `${SITE_URL}/plantillas/nocturne`)
    assert.equal(tag(html, /<meta property="og:image" content="([^"]*)"/), `${SITE_URL}/og/nocturne.jpg`)
    assert.equal(tag(html, /<meta property="og:title" content="([^"]*)"/), data.title)
  })

  it('suma los datos de producto en el head, sin pisar los del sitio', () => {
    const scripts = ldScripts(html)
    assert.equal(scripts.length, ldScripts(indexHtml).length + 1)
    const product = JSON.parse(scripts.at(-1))
    assert.equal(product['@type'], 'Product')
    assert.equal(product.offers.price, '149.00')
    assert.ok(JSON.parse(scripts[0])['@graph'], 'se perdió el bloque de Organization/WebSite')
  })

  it('deja el contenido dentro de #root: título, precio, secciones y links', () => {
    assert.ok(!html.includes('<div id="root"></div>'), '#root quedó vacío')
    const root = html.slice(html.indexOf('<div id="root">'))
    assert.ok(root.includes('<h1>NOCTURNE — Template scrollytelling en React + GSAP</h1>'))
    assert.ok(root.includes(`USD ${TEMPLATE_PRICES_USD.nocturne} de lista`))
    for (const s of data.sections) assert.ok(root.includes(s.name), s.name)
    for (const t of data.tags) assert.ok(root.includes(t), t)
    assert.ok(root.includes('href="/templates/nocturne"'), 'falta el link a la demo')
    for (const r of data.related) assert.ok(root.includes(`href="${r.path}"`), r.path)
    assert.ok(root.includes(PRODUCT_COPY.how[0]))
  })

  it('escapa lo que venga de los textos: no se cuela HTML ni se cierra el <script>', () => {
    const hostil = structuredClone(es)
    hostil.templates.nocturne.vibe = '<img src=x onerror=alert(1)> Noir'
    hostil.builder.sections.nocturne.HeroCinematic.name = '</script><b id="x">Hero</b>'
    const out = renderProductPage(indexHtml, productPageData('nocturne', hostil))
    assert.ok(!out.includes('<img src=x'), 'HTML sin escapar en el contenido')
    assert.ok(!out.includes('<b id="x">'), 'HTML sin escapar en una sección')
    const ld = ldScripts(out).at(-1)
    assert.ok(!ld.includes('</script'), 'el JSON puede cerrar el <script>')
    assert.equal(JSON.parse(ld)['@type'], 'Product')
  })

  it('no interpreta patrones de replace ("$&") en los textos', () => {
    const raro = structuredClone(es)
    raro.templates.nocturne.tags[0] = 'Precio $& $1 $$'
    const out = renderProductPage(indexHtml, productPageData('nocturne', raro))
    assert.ok(out.includes('Precio $&amp; $1 $$') || out.includes('Precio $& $1 $$'))
  })

  it('falla en voz alta si falta el <head> o el #root del HTML base', () => {
    assert.throws(() => renderProductPage(indexHtml.replace('<div id="root"></div>', '<main></main>'), data), /#root|id="root"/)
    assert.throws(() => renderProductPage(indexHtml.replace('</head>', ''), data), /<\/head>/)
  })
})

describe('el sitio apunta a las páginas de producto', () => {
  it('el sitemap lista una URL por template en venta', () => {
    const sitemap = read('public/sitemap.xml')
    for (const sku of skus) {
      assert.ok(sitemap.includes(`<loc>${productUrl(sku)}</loc>`), `falta ${productUrl(sku)} en public/sitemap.xml`)
    }
  })

  it('robots.txt las deja abiertas para buscadores y las cierra a los bots de IA, como el resto del catálogo', () => {
    const robots = read('public/robots.txt')
    const at = robots.indexOf('User-agent: GPTBot')
    assert.ok(at > 0, 'no encontré el bloque de bots de IA')
    const general = robots.slice(0, at)
    const ia = robots.slice(at)
    assert.ok(!general.includes('/plantillas'), 'Google no puede quedar bloqueado')
    assert.ok(ia.includes('Disallow: /plantillas/'), 'los bots de IA tienen que quedar afuera del catálogo')
  })

  it('el ItemList del index.html apunta a las páginas de producto (y no a las demos, que son noindex)', () => {
    const graph = JSON.parse(ldScripts(indexHtml)[0])['@graph']
    const list = graph.find((node) => node['@type'] === 'ItemList')
    const urls = list.itemListElement.map((item) => item.url).sort()
    assert.deepEqual(urls, skus.map(productUrl).sort())
  })
})
