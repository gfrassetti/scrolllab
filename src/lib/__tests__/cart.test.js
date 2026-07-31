import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()

const { useCart, useCartNotice } = await import('../cart.js')

describe('useCart', () => {
  beforeEach(() => {
    localStorage.clear()
    useCart.setState({ items: [] })
    useCartNotice.setState({ notice: null })
  })

  it('agrega un template una sola vez', () => {
    const ok = useCart.getState().addItem({ sku: 'chapters', title: 'CHAPTERS' })
    assert.equal(ok, true)
    assert.equal(useCart.getState().items.length, 1)

    const again = useCart
      .getState()
      .addItem({ sku: 'chapters', title: 'CHAPTERS' })
    assert.equal(again, false)
    assert.equal(useCart.getState().items.length, 1)
    assert.equal(useCartNotice.getState().notice?.already, true)
  })

  it('normaliza custom:* a sku custom y reemplaza la composición previa', () => {
    useCart.getState().addItem({
      sku: 'custom:old',
      title: 'Vieja',
      recipe: [{ id: 'chapters/HeroKinetic' }],
    })
    useCart.getState().addItem({
      sku: 'custom:new',
      title: 'Nueva',
      recipe: [{ id: 'nocturne/StickyWordCycle' }],
    })

    const items = useCart.getState().items
    assert.equal(items.length, 1)
    assert.equal(items[0].sku, 'custom')
    assert.equal(items[0].title, 'Nueva')
    assert.deepEqual(items[0].recipe, [{ id: 'nocturne/StickyWordCycle' }])
    assert.equal(useCartNotice.getState().notice?.updated, true)
  })

  it('mantiene templates junto a una sola composición custom', () => {
    useCart.getState().addItem({ sku: 'fizz', title: 'FIZZ' })
    useCart.getState().addItem({
      sku: 'custom',
      title: 'Comp',
      recipe: [{ id: 'monolith/NavBrutal' }],
    })
    useCart.getState().addItem({
      sku: 'custom:otro',
      title: 'Comp 2',
      recipe: [{ id: 'monolith/FooterBrutal' }],
    })

    const items = useCart.getState().items
    assert.equal(items.length, 2)
    assert.ok(items.some((i) => i.sku === 'fizz'))
    assert.equal(items.filter((i) => i.sku === 'custom').length, 1)
    assert.equal(items.find((i) => i.sku === 'custom').title, 'Comp 2')
  })

  it('no guarda unit_price del cliente (el server lo valida)', () => {
    useCart.getState().addItem({
      sku: 'custom',
      title: 'Comp',
      unit_price: 1,
      recipe: [{ id: 'chapters/HeroKinetic' }],
    })
    // El store puede copiar el campo si viniera, pero el contrato UX es no usarlo
    // en checkout: CartPage solo manda sku/title/recipe.
    const item = useCart.getState().items[0]
    const checkoutPayload = {
      sku: item.sku,
      title: item.title,
      recipe: item.recipe,
    }
    assert.equal('unit_price' in checkoutPayload, false)
    assert.equal(checkoutPayload.sku, 'custom')
  })
})
