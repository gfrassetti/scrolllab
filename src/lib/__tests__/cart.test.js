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
  cartItemKey,
  compositionNumber,
  cartLineTitle,
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
      recipe: [{ id: 'chapters/QuoteBreak' }],
    })

    const items = useCart.getState().items
    assert.equal(items.length, 1)
    assert.equal(items[0].sku, 'custom')
    assert.equal(items[0].title, 'Nueva')
    assert.deepEqual(items[0].recipe, [{ id: 'chapters/QuoteBreak' }])
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

  // Varias composiciones: cada una con su id, se cobra y se baja aparte.
  it('composiciones con distinto id conviven; la misma se reemplaza', () => {
    const add = (compositionId, id) =>
      useCart.getState().addItem({ sku: 'custom', title: 'Comp', compositionId, recipe: [{ id }] })
    add('a', 'chapters/HeroKinetic')
    add('b', 'unity/LanguageBlock')
    assert.equal(useCart.getState().items.length, 2)
    add('a', 'monolith/HeroThree')
    const items = useCart.getState().items
    assert.equal(items.length, 2)
    assert.deepEqual(items.find((i) => i.compositionId === 'a').recipe, [{ id: 'monolith/HeroThree' }])
    assert.equal(useCartNotice.getState().notice?.updated, true)
    assert.equal(compositionNumber(items, items[1]), 2)
    assert.equal(cartItemKey(items[0]), 'custom:a')
  })

  it('sincronizar toca solo la composición del builder abierta', () => {
    useCart.getState().addItem({ sku: 'custom', title: 'A', compositionId: 'a', recipe: [{ id: 'chapters/HeroKinetic' }] })
    useCart.getState().addItem({ sku: 'custom', title: 'B', compositionId: 'b', recipe: [{ id: 'unity/LanguageBlock' }] })
    useCart.getState().syncComposition([{ id: 'chapters/FooterCTA' }], 'b')
    const items = useCart.getState().items
    assert.deepEqual(items.find((i) => i.compositionId === 'a').recipe, [{ id: 'chapters/HeroKinetic' }])
    assert.deepEqual(items.find((i) => i.compositionId === 'b').recipe, [{ id: 'chapters/FooterCTA' }])
  })

  it('quitar una composición deja las otras; tope de MAX_CART_COMPOSITIONS', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      assert.equal(
        useCart.getState().addItem({ sku: 'custom', title: id, compositionId: id, recipe: [{ id: 'chapters/HeroKinetic' }] }),
        true,
      )
    }
    const sixth = useCart.getState().addItem({ sku: 'custom', title: 'f', compositionId: 'f', recipe: [{ id: 'chapters/HeroKinetic' }] })
    assert.equal(sixth, false)
    assert.equal(useCartNotice.getState().notice?.full, true)
    useCart.getState().removeItem('custom:c')
    assert.deepEqual(useCart.getState().items.map((i) => i.compositionId), ['a', 'b', 'd', 'e'])
  })

  // Guardar la composición como proyecto le cambia el id: sigue siendo la misma línea.
  it('renombrar una composición conserva la línea y no toca las otras', () => {
    useCart.getState().addItem({ sku: 'custom', title: 'A', compositionId: 'a', recipe: [{ id: 'chapters/HeroKinetic' }] })
    useCart.getState().addItem({ sku: 'custom', title: 'B', compositionId: 'b', recipe: [{ id: 'unity/LanguageBlock' }] })
    useCart.getState().renameComposition('a', 'project-123')
    assert.deepEqual(useCart.getState().items.map((i) => i.compositionId), ['project-123', 'b'])
    useCart.getState().renameComposition('nope', 'x')
    assert.deepEqual(useCart.getState().items.map((i) => i.compositionId), ['project-123', 'b'])
  })

  // Un proyecto guardado se reconoce por su nombre; renombrarlo renombra la línea.
  it('una composición de un proyecto se titula con su nombre', () => {
    const t = (key, vars) => `${key}:${vars.name || vars.n}:${vars.count}`
    useCart.getState().addItem({ sku: 'custom', title: 'C', compositionId: 'project-1', projectName: 'Home', recipe: [{ id: 'chapters/HeroKinetic' }, { id: 'chapters/FooterCTA' }] })
    useCart.getState().addItem({ sku: 'custom', title: 'C', compositionId: 'b', recipe: [{ id: 'chapters/HeroKinetic' }] })
    let [proj, other] = useCart.getState().items
    assert.equal(cartLineTitle(proj, useCart.getState().items, t), 'cart.projectLine:Home:2')
    assert.equal(cartLineTitle(other, useCart.getState().items, t), 'cart.compositionNOne:2:1')
    useCart.getState().setCompositionName('project-1', 'Home v2')
    ;[proj] = useCart.getState().items
    assert.equal(cartLineTitle(proj, useCart.getState().items, t), 'cart.projectLine:Home v2:2')
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
