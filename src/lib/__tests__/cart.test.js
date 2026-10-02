import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()

const {
  useCart,
  useCartNotice,
  cartLinePriceArs,
  cartLinePriceUsd,
  markCheckoutIntent,
  takeCheckoutIntent,
  withoutBundleOverlap,
} = await import('../cart.js')
const { estimateCustomPriceUsd, arsFromUsd } = await import('../pricing.js')

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

  it('un modelo que el bundle ya trae no se agrega aparte', () => {
    useCart.getState().addItem({ sku: 'bundle', title: 'BUNDLE' })
    const ok = useCart.getState().addItem({ sku: 'fizz', title: 'FIZZ' })
    assert.equal(ok, false)
    assert.deepEqual(useCart.getState().items.map((i) => i.sku), ['bundle'])
    assert.equal(useCartNotice.getState().notice?.inBundle, true)
  })

  it('el bundle reemplaza los modelos sueltos que ya trae', () => {
    useCart.getState().addItem({ sku: 'chapters', title: 'CHAPTERS' })
    useCart.getState().addItem({ sku: 'fizz', title: 'FIZZ' })
    useCart.getState().addItem({
      sku: 'custom:x',
      title: 'Mía',
      recipe: [{ id: 'chapters/HeroKinetic' }],
    })
    useCart.getState().addItem({ sku: 'bundle', title: 'BUNDLE' })
    assert.deepEqual(
      useCart.getState().items.map((i) => i.sku),
      ['custom', 'bundle'],
    )
    assert.equal(useCartNotice.getState().notice?.absorbed, 2)
    // Un carrito viejo guardado con los dos se limpia igual.
    assert.deepEqual(
      withoutBundleOverlap([{ sku: 'bundle' }, { sku: 'comic' }]).map((i) => i.sku),
      ['bundle'],
    )
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

  // Agregar al carrito y seguir editando en el builder: antes se pagaba la foto
  // del momento en que se agregó y el ZIP no traía lo editado después.
  it('la composición del carrito sigue a la del builder', () => {
    useCart.getState().addItem({ sku: 'chapters', title: 'CHAPTERS' })
    useCart.getState().addItem({
      sku: 'custom',
      title: 'Mía',
      recipe: [{ id: 'chapters/HeroKinetic', props: { lineOne: 'Antes' } }],
    })
    const edited = [
      { id: 'chapters/HeroKinetic', props: { lineOne: 'Después' } },
      { id: 'chapters/FooterCTA' },
    ]
    useCart.getState().syncComposition(edited)
    const items = useCart.getState().items
    assert.deepEqual(items.find((i) => i.sku === 'custom').recipe, edited)
    assert.equal(items.find((i) => i.sku === 'custom').title, 'Mía')
    assert.deepEqual(items.map((i) => i.sku), ['chapters', 'custom'])
  })

  it('sincronizar no agrega una composición que no estaba ni borra la que está', () => {
    useCart.getState().syncComposition([{ id: 'chapters/HeroKinetic' }])
    assert.deepEqual(useCart.getState().items, [])

    const recipe = [{ id: 'chapters/HeroKinetic' }]
    useCart.getState().addItem({ sku: 'custom', title: 'Mía', recipe })
    useCart.getState().syncComposition([])
    assert.deepEqual(useCart.getState().items[0].recipe, recipe)
  })

  it('vacía todos los ítems de una', () => {
    useCart.getState().addItem({ sku: 'chapters', title: 'CHAPTERS' })
    useCart.getState().addItem({ sku: 'fizz', title: 'FIZZ' })
    assert.equal(useCart.getState().items.length, 2)
    useCart.getState().clear()
    assert.equal(useCart.getState().items.length, 0)
  })
})

describe('cartLinePriceArs', () => {
  const RATE = 1560
  const catalog = { chapters: { unit_price: 202000 } }
  const recipeOf = (n, extra = []) => [
    ...Array.from({ length: n }, () => ({ id: 'chapters/HeroKinetic' })),
    ...extra,
  ]

  it('los templates salen del catálogo del servidor', () => {
    assert.equal(cartLinePriceArs({ sku: 'chapters' }, catalog, RATE), 202000)
  })

  /**
   * El carrito viejo de localStorage guarda la receta, nunca el monto: al
   * recalcular con la fórmula vigente muestra lo mismo que cobra el checkout.
   */
  it('recalcula la composición según las secciones guardadas', () => {
    for (const count of [1, 8, 9, 30]) {
      assert.equal(
        cartLinePriceArs({ sku: 'custom', recipe: recipeOf(count) }, catalog, RATE),
        arsFromUsd(estimateCustomPriceUsd(count, false), RATE),
      )
    }
  })

  it('detecta el kit de commerce en la receta guardada', () => {
    const recipe = recipeOf(2, [{ id: 'commerce/ProductGrid' }])
    assert.equal(
      cartLinePriceArs({ sku: 'custom:algo', recipe }, catalog, RATE),
      arsFromUsd(estimateCustomPriceUsd(3, true), RATE),
    )
  })
})

describe('cartLinePriceUsd', () => {
  const catalog = { chapters: { unit_price: 233000, unit_price_usd: 149 } }

  it('usa unit_price_usd del catálogo', () => {
    assert.equal(cartLinePriceUsd({ sku: 'chapters' }, catalog), 149)
  })

  it('recalcula custom en USD de lista', () => {
    const recipe = Array.from({ length: 10 }, () => ({
      id: 'chapters/HeroKinetic',
    }))
    assert.equal(
      cartLinePriceUsd({ sku: 'custom', recipe }, catalog),
      estimateCustomPriceUsd(10, false),
    )
  })
})

/**
 * Apretar Pagar sin sesión manda al login: al volver, el carrito tiene que
 * retomar el pago solo, y una sola vez.
 */
describe('intención de checkout', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('sin marca no retoma nada', () => {
    assert.equal(takeCheckoutIntent(), false)
  })

  it('retoma una sola vez', () => {
    markCheckoutIntent()
    assert.equal(takeCheckoutIntent(), true)
    assert.equal(takeCheckoutIntent(), false)
  })

  it('descarta una intención vieja', () => {
    const now = Date.now()
    markCheckoutIntent(now - 31 * 60 * 1000)
    assert.equal(takeCheckoutIntent(now), false)
  })
})
