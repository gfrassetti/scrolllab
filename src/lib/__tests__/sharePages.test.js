import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BUILDER_SEO, SITE_SEO, SITE_URL } from '../site.js'
import {
  builderSharePage,
  demoSharePage,
  publicDemoSkus,
  renderSharePage,
  truncate,
} from '../sharePages.js'

// El HTML real del sitio: si alguien reformatea un tag del head, esto avisa.
const indexHtml = fs.readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8',
)

function metaContent(html, attr, key) {
  const match = html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`))
  return match ? match[1] : null
}

const nocturne = demoSharePage('nocturne', {
  vibe: 'Cinematic noir',
  description: 'Full-bleed images and a zoom portal.',
})

describe('publicDemoSkus', () => {
  it('lista las demos públicas y deja afuera las que no se venden', () => {
    const skus = publicDemoSkus()
    assert.ok(skus.includes('nocturne'))
    assert.ok(skus.includes('atrium'))
    assert.ok(!skus.includes('ratio'))
    assert.ok(!skus.includes('plum'))
  })
})

describe('truncate', () => {
  it('no toca textos cortos', () => {
    assert.equal(truncate('Corto y claro.', 200), 'Corto y claro.')
  })

  it('corta en una palabra entera y cierra con puntos suspensivos', () => {
    const out = truncate('uno dos tres cuatro cinco seis siete', 20)
    assert.ok(out.endsWith('…'))
    assert.ok(out.length <= 21)
    assert.ok(!out.includes('cuatro cinc'))
  })
})

describe('renderSharePage — demo', () => {
  const html = renderSharePage(indexHtml, nocturne)

  it('pone la tarjeta y la URL propias de la demo', () => {
    assert.equal(metaContent(html, 'property', 'og:image'), `${SITE_URL}/og/nocturne.jpg`)
    assert.equal(metaContent(html, 'property', 'og:image:type'), 'image/jpeg')
    assert.equal(metaContent(html, 'property', 'og:url'), `${SITE_URL}/templates/nocturne`)
    assert.equal(metaContent(html, 'name', 'twitter:image'), `${SITE_URL}/og/nocturne.jpg`)
    assert.match(metaContent(html, 'property', 'og:title'), /^NOCTURNE — Cinematic noir/)
    assert.equal(
      metaContent(html, 'name', 'twitter:title'),
      metaContent(html, 'property', 'og:title'),
    )
  })

  it('mantiene la política de indexación de las demos', () => {
    assert.equal(metaContent(html, 'name', 'robots'), 'noindex, follow, noai, noimageai')
    assert.match(html, /<link rel="canonical" href="https:\/\/www\.scrolllab\.com\.ar\/" \/>/)
  })

  it('no toca el title ni el description del documento (evita parpadeo con el SPA)', () => {
    assert.ok(html.includes(`<title>${SITE_SEO.title}</title>`))
    assert.ok(html.includes(SITE_SEO.description))
  })

  it('es idempotente', () => {
    assert.equal(renderSharePage(html, nocturne), html)
  })
})

describe('renderSharePage — builder', () => {
  const html = renderSharePage(indexHtml, builderSharePage())

  it('lleva title, description y URL propios, y sigue indexándose', () => {
    assert.ok(html.includes(`<title>${BUILDER_SEO.title}</title>`))
    assert.equal(metaContent(html, 'name', 'description'), BUILDER_SEO.description)
    assert.equal(metaContent(html, 'property', 'og:url'), `${SITE_URL}/builder`)
    assert.match(metaContent(html, 'name', 'robots'), /^index/)
  })
})

describe('renderSharePage — seguridad', () => {
  it('escapa comillas, & y < >, y no interpreta patrones de replace', () => {
    const page = { ...nocturne, ogDescription: 'Dijo "hola" & <b>$&</b> $1' }
    const html = renderSharePage(indexHtml, page)
    assert.equal(
      metaContent(html, 'property', 'og:description'),
      'Dijo &quot;hola&quot; &amp; &lt;b&gt;$&amp;&lt;/b&gt; $1',
    )
  })

  it('falla en voz alta si falta un tag en el HTML base', () => {
    assert.throws(
      () => renderSharePage('<html><head></head></html>', nocturne),
      /no encontré/,
    )
  })
})
