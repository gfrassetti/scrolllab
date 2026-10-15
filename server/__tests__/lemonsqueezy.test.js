import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  buildCheckoutBody,
  createCheckout,
  lemonRequest,
  LemonError,
  parseLemonEvent,
  refundOrder,
  usdCents,
  verifyLemonSignature,
} from '../services/lemonsqueezy.js'

const config = { lemon: { apiKey: 'lsk_test', apiBase: 'https://ls.example/v1' } }
const sign = (body, secret) => crypto.createHmac('sha256', secret).update(body).digest('hex')

function stubFetch(t, handler) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return handler(url, init)
  })
  return calls
}
const json = (status, body) => new Response(JSON.stringify(body), { status })

test('usdCents redondea sin errores de punto flotante', () => {
  assert.equal(usdCents(0.1 + 0.2), 30)
  assert.equal(usdCents(152.1), 15210)
})

test('buildCheckoutBody: precio en centavos, datos de la orden y tienda/variante', () => {
  const body = buildCheckoutBody({
    storeId: 7,
    variantId: 99,
    orderId: 'ord_1',
    userId: 'u_1',
    title: 'CHAPTERS (primera compra −10 %)',
    totalUsd: 152.1,
    email: 'a@b.com',
    redirectUrl: 'https://www.scrolllab.com.ar/checkout/success?orderId=ord_1',
  })
  const a = body.data.attributes
  assert.equal(a.custom_price, 15210)
  assert.deepEqual(a.checkout_data.custom, { kind: 'order', orderId: 'ord_1', userId: 'u_1' })
  assert.equal(a.checkout_data.email, 'a@b.com')
  assert.equal(a.test_mode, false)
  assert.equal(body.data.relationships.store.data.id, '7')
  assert.equal(body.data.relationships.variant.data.id, '99')
})

test('createCheckout manda JSON:API con la clave y devuelve la URL', async (t) => {
  const calls = stubFetch(t, () => json(201, { data: { id: '55', attributes: { url: 'https://s.lemonsqueezy.com/checkout/custom/abc' } } }))
  const out = await createCheckout(config, { data: { type: 'checkouts' } })
  assert.deepEqual(out, { id: '55', url: 'https://s.lemonsqueezy.com/checkout/custom/abc' })
  assert.equal(calls[0].url, 'https://ls.example/v1/checkouts')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer lsk_test')
  assert.equal(calls[0].init.headers['Content-Type'], 'application/vnd.api+json')
})

test('un 4xx sale como LemonError con su status; un 5xx, como 502', async (t) => {
  stubFetch(t, () => json(422, { errors: [{ title: 'Unprocessable', detail: 'custom_price is invalid', status: '422' }] }))
  await assert.rejects(
    () => lemonRequest(config, 'POST', '/checkouts', {}),
    (e) => e instanceof LemonError && e.status === 422 && /custom_price/.test(e.message),
  )
  t.mock.restoreAll()
  stubFetch(t, () => json(500, {}))
  await assert.rejects(
    () => lemonRequest(config, 'GET', '/orders/1'),
    (e) => e instanceof LemonError && e.status === 502,
  )
})

test('sin API key no llama a la red', async (t) => {
  const calls = stubFetch(t, () => json(200, {}))
  await assert.rejects(
    () => lemonRequest({ lemon: { apiKey: '' } }, 'GET', '/orders/1'),
    (e) => e instanceof LemonError && e.status === 503,
  )
  assert.equal(calls.length, 0)
})

test('refundOrder: total sin monto y parcial con monto en centavos', async (t) => {
  const calls = stubFetch(t, () => json(200, { data: { id: '9', type: 'orders', attributes: { status: 'refunded' } } }))
  await refundOrder(config, '9')
  await refundOrder(config, '9', 5000.4)
  assert.equal(calls[0].url, 'https://ls.example/v1/orders/9/refund')
  assert.deepEqual(JSON.parse(calls[0].init.body).data.attributes, {})
  assert.deepEqual(JSON.parse(calls[1].init.body).data.attributes, { amount: 5000 })
})

test('verifyLemonSignature: válida, alterada, ausente y de otro secreto', () => {
  const raw = Buffer.from('{"meta":{"event_name":"order_created"}}')
  const secret = 'whsec_test'
  assert.doesNotThrow(() => verifyLemonSignature({ rawBody: raw, header: sign(raw, secret), secret }))
  assert.throws(() => verifyLemonSignature({ rawBody: Buffer.from('{}'), header: sign(raw, secret), secret }), /inválida/)
  assert.throws(() => verifyLemonSignature({ rawBody: raw, header: undefined, secret }), /ausente/)
  assert.throws(() => verifyLemonSignature({ rawBody: raw, header: sign(raw, 'otro'), secret }), /inválida/)
  assert.throws(() => verifyLemonSignature({ rawBody: raw, header: 'zz', secret }), /inválida/)
  assert.throws(() => verifyLemonSignature({ rawBody: raw, header: sign(raw, secret), secret: '' }), /no configurado/)
})

test('parseLemonEvent aplana una orden', () => {
  const ev = parseLemonEvent({
    meta: { event_name: 'order_created', custom_data: { kind: 'order', orderId: 'ord_1' } },
    data: {
      type: 'orders',
      id: '123',
      attributes: { status: 'paid', total: 15210, currency: 'USD', user_email: 'a@b.com', refunded: false, test_mode: true },
    },
  })
  assert.equal(ev.name, 'order_created')
  assert.equal(ev.custom.orderId, 'ord_1')
  assert.equal(ev.id, '123')
  assert.equal(ev.status, 'paid')
  assert.equal(ev.totalCents, 15210)
  assert.equal(ev.currency, 'USD')
  assert.equal(ev.testMode, true)
  assert.equal(parseLemonEvent({}).name, '')
})
