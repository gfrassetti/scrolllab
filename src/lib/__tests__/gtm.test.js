import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()
globalThis.window.dataLayer = []

const {
  cartItemsToEcommerce,
  gtmPush,
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
} = await import('../gtm.js')

describe('gtm dataLayer', () => {
  beforeEach(() => {
    globalThis.window.dataLayer = []
    sessionStorage.clear()
  })

  it('arma items de carrito para ecommerce', () => {
    assert.deepEqual(
      cartItemsToEcommerce([{ sku: 'chapters', title: 'CHAPTERS', qty: 1 }]),
      [
        {
          item_id: 'chapters',
          item_name: 'CHAPTERS',
          index: 0,
          quantity: 1,
        },
      ],
    )
  })

  it('add_to_cart limpia ecommerce y empuja el evento', () => {
    trackAddToCart({ sku: 'chapters', title: 'CHAPTERS' })
    const events = globalThis.window.dataLayer
    assert.equal(events.at(-1).event, 'add_to_cart')
    assert.equal(events.at(-2).ecommerce, null)
    assert.equal(events.at(-1).ecommerce.items[0].item_id, 'chapters')
  })

  it('begin_checkout no dispara si el carrito está vacío', () => {
    gtmPush({ event: 'keep' })
    trackBeginCheckout([])
    assert.equal(globalThis.window.dataLayer.length, 1)
  })

  it('purchase se registra una sola vez por orden', () => {
    const order = {
      id: 'ord_1',
      status: 'paid',
      total: 233000,
      totalUsd: 149,
      currency_id: 'ARS',
      items: [{ sku: 'chapters', title: 'CHAPTERS', unit_price: 233000 }],
    }
    assert.equal(trackPurchase(order), true)
    assert.equal(trackPurchase(order), false)
    const purchases = globalThis.window.dataLayer.filter((e) => e.event === 'purchase')
    assert.equal(purchases.length, 1)
    assert.equal(purchases[0].ecommerce.transaction_id, 'ord_1')
    assert.equal(purchases[0].ecommerce.value, 233000)
  })
})
