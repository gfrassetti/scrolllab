import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cartItemPreviewHref, itemPreviewHref } from '../orderPreview.js'

describe('cartItemPreviewHref', () => {
  it('manda los templates fijos a su demo', () => {
    assert.equal(cartItemPreviewHref({ sku: 'nocturne' }), '/templates/nocturne')
    assert.equal(cartItemPreviewHref({ sku: 'bundle' }), '/#templates')
  })

  it('abre el preview de la composición del carrito', () => {
    assert.equal(
      cartItemPreviewHref({
        sku: 'custom',
        recipe: [{ id: 'chapters/HeroKinetic' }],
      }),
      '/preview?cart=1',
    )
  })

  it('no inventa preview sin receta', () => {
    assert.equal(cartItemPreviewHref({ sku: 'custom', recipe: [] }), null)
    assert.equal(cartItemPreviewHref({ sku: 'custom' }), null)
  })
})

describe('itemPreviewHref', () => {
  it('sigue pidiendo orderId para las compras', () => {
    assert.equal(
      itemPreviewHref(
        { id: 'abc' },
        { sku: 'custom', recipe: [{ id: 'chapters/HeroKinetic' }] },
        0,
      ),
      '/preview?order=abc&item=0',
    )
    assert.equal(
      itemPreviewHref(
        null,
        { sku: 'custom', recipe: [{ id: 'chapters/HeroKinetic' }] },
        0,
      ),
      null,
    )
  })
})
