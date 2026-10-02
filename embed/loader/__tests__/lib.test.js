import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { anchorTarget, clamp, resolveFrameBase, sameOriginUrl } from '../lib.js'

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

describe('anchorTarget', () => {
  it('# y #top sin elemento → arriba de todo; si el cliente tiene #top, va ahí', () => {
    assert.deepEqual(anchorTarget('#'), { id: '', top: true })
    assert.deepEqual(anchorTarget('#top'), { id: 'top', top: true })
  })

  it('#algo → el elemento con ese id (decodificado)', () => {
    assert.deepEqual(anchorTarget('#contacto'), { id: 'contacto', top: false })
    assert.deepEqual(anchorTarget('#sección%202'), { id: 'sección 2', top: false })
    // Un % suelto no rompe: queda el id crudo.
    assert.deepEqual(anchorTarget('#100%'), { id: '100%', top: false })
  })

  it('lo que no es un #ancla no hace nada', () => {
    assert.equal(anchorTarget('https://x.com/#a'), null)
    assert.equal(anchorTarget(''), null)
    assert.equal(anchorTarget(undefined), null)
    assert.equal(anchorTarget({ hash: '#a' }), null)
    assert.equal(anchorTarget('#' + 'a'.repeat(600)), null)
  })
})

describe('sameOriginUrl', () => {
  const base = 'https://cliente.com/servicios/diseno?x=1'

  it('resuelve relativos contra la página del cliente', () => {
    assert.equal(sameOriginUrl('/contacto', base), 'https://cliente.com/contacto')
    assert.equal(sameOriginUrl('precios.html', base), 'https://cliente.com/servicios/precios.html')
    assert.equal(sameOriginUrl('https://cliente.com/tienda', base), 'https://cliente.com/tienda')
  })

  it('otro sitio, otro esquema o basura → null (el loader no navega)', () => {
    assert.equal(sameOriginUrl('https://evil.com/x', base), null)
    assert.equal(sameOriginUrl('//evil.com/x', base), null)
    assert.equal(sameOriginUrl('http://cliente.com/x', base), null) // otro esquema = otro origen
    assert.equal(sameOriginUrl('javascript:alert(1)', base), null)
    assert.equal(sameOriginUrl('mailto:a@b.com', base), null)
    assert.equal(sameOriginUrl('', base), null)
    assert.equal(sameOriginUrl(42, base), null)
    assert.equal(sameOriginUrl('/' + 'a'.repeat(3000), base), null)
  })
})
