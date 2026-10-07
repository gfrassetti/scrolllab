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

  /** Corre startCheckout con sesión contra un fetch falso y devuelve lo que se mandó. */
  async function checkoutWithSession(opts) {
    const calls = []
    const realFetch = globalThis.fetch
    globalThis.fetch = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) })
      return { ok: true, status: 200, json: async () => ({ init_point: 'https://mp.test/pay' }) }
    }
    globalThis.location = { href: '' }
    try {
      const result = await startCheckout({
        items: [{ sku: 'chapters', title: 'CHAPTERS' }],
        user: { id: 'u1' },
        navigate: () => {},
        ...opts,
      })
      return { result, calls, href: globalThis.location.href }
    } finally {
      globalThis.fetch = realFetch
      delete globalThis.location
    }
  }

  it('manda el cupón como código y nada más', async () => {
    const { result, calls, href } = await checkoutWithSession({ couponCode: 'SL-ABC234' })
    assert.equal(result, 'redirect')
    assert.equal(href, 'https://mp.test/pay')
    assert.equal(calls[0].url, '/api/checkout')
    assert.deepEqual(calls[0].body, {
      items: [{ sku: 'chapters', title: 'CHAPTERS' }],
      couponCode: 'SL-ABC234',
    })
  })

  it('sin cupón no manda el campo', async () => {
    const { calls } = await checkoutWithSession({})
    assert.deepEqual(calls[0].body, { items: [{ sku: 'chapters', title: 'CHAPTERS' }] })
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

  /**
   * Paddle.js falso (uno solo, como el real: se inicializa una vez). Al abrir
   * el overlay dispara `next.event` (completo o cerrado).
   */
  const next = { event: null }
  const seen = { opened: null, closed: 0, token: null, inits: 0 }
  let paddleCallback = null
  const FakePaddle = {
    Environment: { set: () => {} },
    Initialize: ({ token, eventCallback }) => {
      seen.token = token
      seen.inits += 1
      paddleCallback = eventCallback
    },
    Checkout: {
      open: (opts) => {
        seen.opened = opts
        queueMicrotask(() => paddleCallback(next.event))
      },
      close: () => (seen.closed += 1),
    },
  }

  async function paddleCheckout(event) {
    const calls = []
    const realFetch = globalThis.fetch
    next.event = event
    seen.closed = 0
    globalThis.window = Object.assign(globalThis.window || {}, { Paddle: FakePaddle })
    globalThis.fetch = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) })
      return {
        ok: true,
        status: 200,
        json: async () => ({
          provider: 'paddle',
          orderId: 'o1',
          transactionId: 'txn_abc',
          customerEmail: 'ana@test.com',
          paddle: { environment: 'sandbox', clientToken: 'test_tok' },
        }),
      }
    }
    const navigated = []
    try {
      const result = await startCheckout({
        items: [{ sku: 'chapters', title: 'CHAPTERS' }],
        user: { id: 'u1' },
        navigate: (to) => navigated.push(to),
        provider: 'paddle',
        locale: 'en',
      })
      return { result, calls, navigated }
    } finally {
      globalThis.fetch = realFetch
    }
  }

  it('Paddle: pide la transacción, abre el overlay y al pagar va a confirmar', async () => {
    const { result, calls, navigated } = await paddleCheckout({
      name: 'checkout.completed',
      data: { transaction_id: 'txn_abc' },
    })
    assert.equal(result, 'paid')
    assert.deepEqual(calls[0].body, {
      items: [{ sku: 'chapters', title: 'CHAPTERS' }],
      provider: 'paddle',
      locale: 'en',
    })
    assert.equal(seen.opened.transactionId, 'txn_abc')
    assert.deepEqual(seen.opened.customer, { email: 'ana@test.com' })
    assert.equal(seen.opened.settings.locale, 'en')
    assert.equal(seen.closed, 1)
    assert.deepEqual(navigated, ['/checkout/success?provider=paddle&txn=txn_abc'])
    assert.equal(seen.token, 'test_tok')
  })

  it('Paddle: si cierra el overlay sin pagar, vuelve al carrito sin navegar', async () => {
    const { result, navigated } = await paddleCheckout({ name: 'checkout.closed', data: {} })
    assert.equal(result, 'closed')
    assert.deepEqual(navigated, [])
    // Paddle.js se inicializa una sola vez por token.
    assert.equal(seen.inits, 1)
  })
})
