import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { catalogFromEdits, parsePrice, productsFromItems } from '../shop/catalog.js'

// Catálogo de ejemplo con la forma del de products.js (sin imports de imágenes).
const BASE = [
  { id: 'p-01', name: 'Tee', price: 18000, currency: 'ARS', blurb: 'Cotton', img: '/tee.png', variants: { label: 'Size', options: ['S'] } },
  { id: 'p-02', name: 'Cap', price: 12000, currency: 'ARS', blurb: 'Six-panel', img: '/cap.png' },
]

describe('catalogFromEdits', () => {
  it('sin productos editados queda el catálogo de ejemplo', () => {
    assert.equal(catalogFromEdits(undefined, BASE), BASE)
    assert.equal(catalogFromEdits([], BASE), BASE)
    assert.equal(catalogFromEdits([{}, null], BASE), BASE)
  })

  it('los editados reemplazan al ejemplo, con ids por posición y sin variantes', () => {
    const catalog = catalogFromEdits(
      [
        { name: 'Mate', price: '15000', blurb: 'Calabaza', img: 'https://cdn.x/mate.jpg' },
        { name: 'Bombilla', price: '12,50' },
        {},
        { price: '900' },
      ],
      BASE,
    )
    assert.deepEqual(catalog, [
      { id: 'p-01', name: 'Mate', price: 15000, currency: 'ARS', blurb: 'Calabaza', img: 'https://cdn.x/mate.jpg' },
      // Lo que quedó vacío toma el producto de ejemplo en esa posición.
      { id: 'p-02', name: 'Bombilla', price: 12.5, currency: 'ARS', blurb: 'Six-panel', img: '/cap.png' },
      { id: 'p-03', name: 'Tee', price: 900, currency: 'ARS', blurb: 'Cotton', img: '/tee.png' },
    ])
  })
})

describe('parsePrice', () => {
  it('acepta enteros, decimales con punto o coma y números', () => {
    assert.equal(parsePrice('15000'), 15000)
    assert.equal(parsePrice(' 12,50 '), 12.5)
    assert.equal(parsePrice('12.5'), 12.5)
    assert.equal(parsePrice(99), 99)
  })

  it('lo demás no es un precio', () => {
    for (const value of ['', '  ', 'abc', '-5', -5, Number.NaN, null, undefined, {}]) {
      assert.equal(parsePrice(value), null, String(value))
    }
  })
})

describe('productsFromItems', () => {
  it('toma los productos del ProductGrid de la composición o de la receta', () => {
    const products = [{ name: 'Mate' }]
    assert.equal(
      productsFromItems([{ sectionId: 'chapters/HeroKinetic' }, { sectionId: 'commerce/ProductGrid', props: { products } }]),
      products,
    )
    assert.equal(productsFromItems([{ id: 'commerce/ProductGrid', props: { products } }]), products)
    assert.equal(productsFromItems([{ sectionId: 'chapters/HeroKinetic' }]), undefined)
  })
})
