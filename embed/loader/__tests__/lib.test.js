import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { clamp, resolveFrameBase } from '../lib.js'

// `<script>` mínimo para el test: solo `getAttribute` y `.src`.
function fakeScript({ src = '', frame = null } = {}) {
  return {
    src,
    getAttribute: (name) => (name === 'data-frame' ? frame : null),
  }
}

const FALLBACK = 'https://embed.scrolllab.com.ar/embed/v1'

describe('clamp', () => {
  it('acota por abajo y por arriba', () => {
    assert.equal(clamp(-1, 0, 1), 0)
    assert.equal(clamp(2, 0, 1), 1)
    assert.equal(clamp(0.5, 0, 1), 0.5)
  })
})

describe('resolveFrameBase', () => {
  it('data-frame tiene prioridad y se le saca la barra final', () => {
    const s = fakeScript({
      src: 'https://cdn.otro.com/x/loader.js',
      frame: 'http://localhost:4179/embed-dist/v1/',
    })
    assert.equal(resolveFrameBase(s, FALLBACK), 'http://localhost:4179/embed-dist/v1')
  })

  it('deriva del src del loader (saca /loader.js)', () => {
    const s = fakeScript({ src: 'https://embed.scrolllab.com.ar/embed/v1/loader.js' })
    assert.equal(resolveFrameBase(s, FALLBACK), 'https://embed.scrolllab.com.ar/embed/v1')
  })

  it('ignora query string y hash del src', () => {
    const s = fakeScript({
      src: 'https://cdn.x.com/embed/v1/loader.js?v=3#frag',
    })
    assert.equal(resolveFrameBase(s, FALLBACK), 'https://cdn.x.com/embed/v1')
  })

  it('src sin path servible → cae al fallback', () => {
    // `new URL('')` tira → fallback
    assert.equal(resolveFrameBase(fakeScript({ src: '' }), FALLBACK), FALLBACK)
  })

  it('src relativo sin `location` → fallback (no explota)', () => {
    assert.equal(
      resolveFrameBase(fakeScript({ src: '../loader.js' }), FALLBACK),
      FALLBACK,
    )
  })
})
