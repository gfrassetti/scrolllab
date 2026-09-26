/**
 * Lo que muestra el carrito tiene que ser lo que cobra el servidor. Acá se
 * compara `priceCartLines` (front) contra el cálculo real del checkout
 * (server/validation.js + server/catalog.js) con los mismos ítems y cotización.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()

const { priceCartLines } = await import('../cart.js')
const { catalogWithArs, discountedArsFromUsd, WELCOME_COUPON_PERCENT } = await import('../../../server/catalog.js')
const { validateCheckoutItems } = await import('../../../server/validation.js')
const { ALLOWED_SECTIONS } = await import('../../../server/sections.js')

const COUPON = { code: 'SL-ABC234', percent: WELCOME_COUPON_PERCENT }
const RATES = [1000, 1550, 1560, 1700.5, 2100.75]
const commerceId = [...ALLOWED_SECTIONS].find((id) => id.startsWith('commerce/'))

/** Lo que devuelve /api/catalog, indexado por sku como hace CartPage. */
function catalogFor(rate) {
  return Object.fromEntries(catalogWithArs(rate).map((p) => [p.sku, p]))
}
const recipeOf = (ids, times = 1) => Array.from({ length: times }, () => ids).flat()

const CARTS = {
  'un modelo': [{ sku: 'chapters', title: 'CHAPTERS' }],
  'varios modelos y el bundle': [{ sku: 'nocturne' }, { sku: 'fizz' }, { sku: 'bundle' }],
  'una composición chica': [{ sku: 'custom:a', recipe: ['chapters/HeroKinetic'] }],
  'una composición con secciones extra (más de 8)': [
    { sku: 'custom:b', recipe: recipeOf(['chapters/HeroKinetic', 'chapters/QuoteBreak'], 5) },
  ],
  'una composición con sección commerce': [
    { sku: 'custom:c', recipe: ['chapters/HeroKinetic', commerceId] },
  ],
  'todo mezclado': [
    { sku: 'atrium' },
    { sku: 'custom:d', recipe: ['chapters/HeroKinetic', commerceId] },
    { sku: 'bundle' },
  ],
}

/** Lo que cobraría el servidor por estos ítems (el checkout pide sku 'custom'). */
function serverTotals(items, rate) {
  const lines = validateCheckoutItems(
    items.map((i) => (i.sku.startsWith('custom') ? { sku: 'custom', recipe: i.recipe } : { sku: i.sku })),
    { maxCartItems: 10, maxRecipeSections: 30, rate },
  )
  return {
    list: lines.reduce((sum, l) => sum + l.unit_price, 0),
    discounted: lines.reduce(
      (sum, l) => sum + discountedArsFromUsd(l.unit_price_usd, rate, COUPON.percent),
      0,
    ),
    lines,
  }
}

describe('priceCartLines vs. lo que cobra el servidor', () => {
  for (const [name, items] of Object.entries(CARTS)) {
    it(`${name}: el total con cupón que muestra el carrito es el que cobra el servidor`, () => {
      for (const rate of RATES) {
        const ui = priceCartLines({ items, catalog: catalogFor(rate), rate, coupon: COUPON })
        const server = serverTotals(items, rate)
        assert.equal(ui.payable, server.discounted, `cotización ${rate}: total con cupón`)
        assert.equal(ui.total, server.list, `cotización ${rate}: total de lista`)
        assert.equal(ui.discount, server.list - server.discounted)
      }
    })
  }

  it('cada línea con cupón coincide con la del servidor, línea por línea', () => {
    const items = CARTS['todo mezclado']
    const rate = 1550
    const ui = priceCartLines({ items, catalog: catalogFor(rate), rate, coupon: COUPON })
    const server = serverTotals(items, rate)
    assert.deepEqual(
      ui.lines.map((l) => l.discounted_price),
      server.lines.map((l) => discountedArsFromUsd(l.unit_price_usd, rate, COUPON.percent)),
    )
    assert.deepEqual(
      ui.lines.map((l) => l.unit_price),
      server.lines.map((l) => l.unit_price),
    )
  })

  it('el descuento siempre es positivo y menor al total', () => {
    for (const items of Object.values(CARTS)) {
      const ui = priceCartLines({ items, catalog: catalogFor(1560), rate: 1560, coupon: COUPON })
      assert.ok(ui.discount > 0)
      assert.ok(ui.payable > 0)
      assert.ok(ui.payable < ui.total)
    }
  })
})

describe('priceCartLines — otros casos', () => {
  const rate = 1560
  const catalog = catalogFor(rate)

  it('sin cupón no descuenta nada', () => {
    const ui = priceCartLines({ items: CARTS['varios modelos y el bundle'], catalog, rate })
    assert.equal(ui.payable, ui.total)
    assert.equal(ui.discount, 0)
    assert.ok(ui.lines.every((l) => l.discounted_price === null))
  })

  it('con cupón del 0% queda igual al precio de lista', () => {
    const ui = priceCartLines({ items: CARTS['un modelo'], catalog, rate, coupon: { percent: 0 } })
    assert.equal(ui.payable, ui.total)
    assert.equal(ui.discount, 0)
  })

  it('en inglés muestra USD con el mismo porcentaje', () => {
    const ui = priceCartLines({
      items: [{ sku: 'chapters' }, { sku: 'fizz' }],
      catalog,
      rate,
      showUsd: true,
      coupon: COUPON,
    })
    assert.equal(ui.total, 149 + 189)
    assert.equal(ui.payable, 134.1 + 170.1)
    assert.ok(ui.lines.every((l) => l.currency_id === 'USD'))
  })

  it('si el catálogo todavía no cargó, no rompe y no inventa un descuento', () => {
    const ui = priceCartLines({ items: [{ sku: 'chapters' }], catalog: {}, rate, coupon: COUPON })
    assert.equal(ui.lines[0].unit_price, null)
    assert.equal(ui.lines[0].discounted_price, null)
    assert.equal(ui.total, 0)
    assert.equal(ui.payable, 0)
    assert.equal(ui.discount, 0)
  })

  it('un carrito vacío da cero', () => {
    assert.deepEqual(
      priceCartLines({ items: [], catalog, rate, coupon: COUPON }),
      { lines: [], total: 0, payable: 0, discount: 0 },
    )
    assert.equal(priceCartLines({ items: undefined, catalog, rate }).total, 0)
  })
})
