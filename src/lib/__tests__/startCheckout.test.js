import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()

const { checkoutPayloadFromItems, startCheckout } = await import(
  '../startCheckout.js'
)
const { takeCheckoutIntent } = await import('../cart.js')

describe('startCheckout', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('arma el payload sin precios del cliente', () => {
    const payload = checkoutPayloadFromItems([
      {
        sku: 'chapters',
        title: 'CHAPTERS',
        unit_price: 1,
        recipe: undefined,
      },
      { sku: 'custom', title: 'Comp', recipe: ['chapters/HeroKinetic'] },
    ])
    assert.deepEqual(payload, [
      { sku: 'chapters', title: 'CHAPTERS', recipe: undefined },
      {
        sku: 'custom',
        title: 'Comp',
        recipe: ['chapters/HeroKinetic'],
      },
    ])
    assert.equal('unit_price' in payload[0], false)
  })

  it('sin sesión marca intención y manda a login', async () => {
    const navigated = []
    const result = await startCheckout({
      items: [{ sku: 'chapters', title: 'CHAPTERS' }],
      user: null,
      navigate: (to) => navigated.push(to),
    })
    assert.equal(result, 'login')
    assert.equal(navigated[0], '/login?next=%2Fcart')
    assert.equal(takeCheckoutIntent(), true)
  })
})
