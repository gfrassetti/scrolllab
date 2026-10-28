import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LAB_SHOPIFY, LAB_SHOPIFY_SEO, renderLabShopifyPage } from '../labShopifyPage.js'
import { seoForPath } from '../site.js'

const fromRoot = (rel) => fileURLToPath(new URL(`../../../${rel}`, import.meta.url))
const read = (rel) => fs.readFileSync(fromRoot(rel), 'utf8')
const indexHtml = read('index.html')

describe('/lab/shopify', () => {
  it('se indexa con title, descripción y canónica propios', () => {
    const seo = seoForPath('/lab/shopify')
    assert.equal(seo.title, LAB_SHOPIFY_SEO.title)
    assert.equal(seo.description, LAB_SHOPIFY_SEO.description)
    assert.equal(seo.canonical, 'https://www.scrolllab.com.ar/lab/shopify')
    assert.match(seo.robots, /^index, follow/)
    assert.deepEqual(seoForPath('/lab/shopify/'), seo)
    assert.ok(LAB_SHOPIFY_SEO.title.length <= 70, LAB_SHOPIFY_SEO.title)
    assert.ok(LAB_SHOPIFY_SEO.description.length <= 190, `${LAB_SHOPIFY_SEO.description.length}`)
    assert.match(LAB_SHOPIFY_SEO.title, /Shopify/)
  })

  it('las capturas existen y declaran su tamaño real (sin saltos al cargar)', async () => {
    const sharp = (await import('sharp')).default
    for (const img of [LAB_SHOPIFY.hero, LAB_SHOPIFY.editor, LAB_SHOPIFY.gridImage]) {
      const file = fromRoot(`public${img.src}`)
      assert.ok(fs.existsSync(file), `falta public${img.src}`)
      const meta = await sharp(file).metadata()
      assert.equal(meta.width, img.width, img.src)
      assert.equal(meta.height, img.height, img.src)
      assert.ok(img.alt.length > 30, `alt corto en ${img.src}`)
    }
  })

  it('el HTML emitido trae la meta y el contenido para quien no ejecuta JS', () => {
    const html = renderLabShopifyPage(indexHtml)
    assert.ok(html.includes(`<title>${LAB_SHOPIFY_SEO.title}</title>`))
    assert.ok(html.includes('https://www.scrolllab.com.ar/lab/shopify'))
    assert.ok(html.includes(LAB_SHOPIFY.h1))
    for (const step of LAB_SHOPIFY.steps) assert.ok(html.includes(step.title), step.title)
    for (const f of LAB_SHOPIFY.faq) assert.ok(html.includes(f.q), f.q)
    assert.ok(html.includes('Liquid personalizado'))
  })

  it('está en el sitemap y la ruta va antes que /lab/:id', () => {
    assert.ok(read('public/sitemap.xml').includes('https://www.scrolllab.com.ar/lab/shopify'))
    const app = read('src/App.jsx')
    assert.ok(app.indexOf('path="/lab/shopify"') < app.indexOf('path="/lab/:id"'), 'la ruta /lab/:id la taparía')
  })
})
