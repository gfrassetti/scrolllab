import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { embedSnippet } from '../embed.js'

const KEY = 'pub_0123456789abcdef01234567'
const LOADER = { url: 'https://embed.scrolllab.com.ar/v1/loader.js', api: 'https://www.scrolllab.com.ar' }

describe('embedSnippet', () => {
  it('html: el <script> con la key y la API', () => {
    const s = embedSnippet(KEY, LOADER, 'html')
    assert.match(s, /<script src="https:\/\/embed\.scrolllab\.com\.ar\/v1\/loader\.js"/)
    assert.match(s, new RegExp(`data-key="${KEY}"`))
    assert.match(s, /data-api="https:\/\/www\.scrolllab\.com\.ar"/)
    assert.doesNotMatch(s, /integrity=/)
  })

  it('SRI solo si el server manda el hash', () => {
    const s = embedSnippet(KEY, { ...LOADER, integrity: 'sha384-x' }, 'html')
    assert.match(s, /integrity="sha384-x" crossorigin="anonymous"/)
  })

  it('react y next: el tag del paquete, sin "use client" (el paquete ya lo trae)', () => {
    for (const variant of ['react', 'next']) {
      const s = embedSnippet(KEY, LOADER, variant)
      assert.match(s, /import ScrollLabEmbed from '@scrolllab\/embed'/)
      assert.match(s, new RegExp(`<ScrollLabEmbed embedKey="${KEY}" />`))
      assert.doesNotMatch(s, /use client/)
    }
  })

  it('vue: el componente de @scrolllab/embed/vue con embed-key', () => {
    const s = embedSnippet(KEY, LOADER, 'vue')
    assert.match(s, /import ScrollLabEmbed from '@scrolllab\/embed\/vue'/)
    assert.match(s, new RegExp(`<ScrollLabEmbed embed-key="${KEY}" />`))
  })
})
