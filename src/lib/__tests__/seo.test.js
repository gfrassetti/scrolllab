import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BUILDER_SEO, SITE_SEO, seoForPath } from '../site.js'

describe('seoForPath', () => {
  it('la home se indexa con el copy del marketplace', () => {
    const seo = seoForPath('/')
    assert.equal(seo.title, SITE_SEO.title)
    assert.equal(seo.description, SITE_SEO.description)
    assert.match(seo.robots, /^index/)
    assert.equal(seo.canonical, 'https://www.scrolllab.com.ar/')
  })

  it('el builder se indexa con meta propia', () => {
    const seo = seoForPath('/builder')
    assert.equal(seo.title, BUILDER_SEO.title)
    assert.equal(seo.description, BUILDER_SEO.description)
    assert.match(seo.robots, /^index/)
    assert.equal(seo.canonical, 'https://www.scrolllab.com.ar/builder')
  })

  it('las demos de templates quedan noindex; /plantillas/:sku es la que indexa', () => {
    const seo = seoForPath('/templates/comic')
    assert.match(seo.robots, /^noindex, follow/)
    assert.match(seo.robots, /noai, noimageai/)
    assert.equal(seo.canonical, 'https://www.scrolllab.com.ar/')
  })
})
