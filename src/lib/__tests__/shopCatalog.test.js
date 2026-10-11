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

  it('los editados reemplazan al ejemplo, con ids por posición', () => {
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
      // Lo que quedó vacío toma el producto de ejemplo en esa posición (opciones incluidas).
      { id: 'p-01', name: 'Mate', price: 15000, currency: 'ARS', blurb: 'Calabaza', img: 'https://cdn.x/mate.jpg', variants: { label: 'Size', options: ['S'] } },
      { id: 'p-02', name: 'Bombilla', price: 12.5, currency: 'ARS', blurb: 'Six-panel', img: '/cap.png' },
      { id: 'p-03', name: 'Tee', price: 900, currency: 'ARS', blurb: 'Cotton', img: '/tee.png', variants: { label: 'Size', options: ['S'] } },
    ])
  })

  it('las opciones se escriben separadas por coma; «—» las saca', () => {
    const [own, none, labelOnly] = catalogFromEdits(
      [
        { name: 'Remera', variantLabel: 'Talle', variantOptions: ' S, M ,L,, XL ' },
        { name: 'Taza', variantOptions: '—' },
        { name: 'Gorra', variantLabel: 'Color', variantOptions: 'Negro, Arena' },
      ],
      BASE,
    )
    assert.deepEqual(own.variants, { label: 'Talle', options: ['S', 'M', 'L', 'XL'] })
    assert.equal(none.variants, undefined)
    assert.deepEqual(labelOnly.variants, { label: 'Color', options: ['Negro', 'Arena'] })
  })

  it('la moneda elegida vale para todo el catálogo', () => {
    const catalog = catalogFromEdits([{ name: 'Mate' }], BASE, 'USD')
    assert.equal(catalog[0].currency, 'USD')
    assert.equal(catalogFromEdits(undefined, BASE, 'EUR')[1].currency, 'EUR')
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
