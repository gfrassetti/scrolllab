import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { waitFor } from './helpers/fakeMercadoPago.js'
import { startAppAgainstFakeLemon } from './helpers/fakeLemon.js'

/**
 * Compras del market y del builder cobradas por Lemon Squeezy (USD), contra el
 * Lemon Squeezy simulado: el checkout que arma el servidor, el webhook firmado, la
 * vuelta del comprador, los controles de que un pago solo cumple su orden y los
 * reembolsos. El carril «internacional» lo pide el front como `paddle`; sin Paddle
 * habilitado lo cobra Lemon Squeezy.
 */
describe('Compras con Lemon Squeezy (Lemon Squeezy simulado)', () => {
  const OWNER = 'owner@scrolllab.test'
  let ls
  let mp
  let loginAs
  let lemonWebhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    process.env.QA_BUYER_EMAILS = 'qa-owner@test.com'
    ;({ ls, mp, loginAs, lemonWebhook, cleanup, fileDb } = await startAppAgainstFakeLemon())
  })
  after(() => cleanup())

  const orderRow = (id) => fileDb.findOrderById(id)
  const alerts = (title) => mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))

  async function checkout(agent, items, extra = {}) {
    const res = await agent.post('/api/checkout').send({ items, provider: 'paddle', ...extra })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const checkoutId = res.body.init_point.split('/').pop()
    return { ...res.body, checkoutId }
  }
  async function paid(email, items = [{ sku: 'chapters' }], payOpts = {}) {
    const agent = await loginAs(email)
    const out = await checkout(agent, items)
    const lemon = ls.pay(out.checkoutId, { email, ...payOpts })
    return { agent, out, lemon }
  }

  describe('qué carril ofrece', () => {
    it('sin Paddle, el carril internacional lo cobra Lemon Squeezy (sin token de cliente)', async () => {
      const agent = await loginAs('methods@test.com')
      const es = await agent.get('/api/checkout/methods').set('x-vercel-ip-country', 'ES')
      assert.equal(es.body.suggested, 'paddle')
      assert.equal(es.body.providers.paddle.enabled, true)
      assert.equal(es.body.providers.paddle.gateway, 'lemonsqueezy')
      assert.equal(es.body.providers.paddle.clientToken, undefined)
      assert.ok(!JSON.stringify(es.body).includes(ls.apiKey))
      const ar = await agent.get('/api/checkout/methods').set('cf-ipcountry', 'AR')
      assert.equal(ar.body.suggested, 'mercadopago')
    })
  })

  describe('checkout', () => {
    it('crea el checkout con el total en centavos (primera compra −10 %) y la orden queda en USD', async () => {
      const agent = await loginAs('lista@test.com')
      const out = await checkout(agent, [{ sku: 'chapters' }])
      assert.equal(out.provider, 'lemonsqueezy')
      assert.match(out.init_point, /^https:\/\/scrolllab\.lemonsqueezy\.com\/checkout\/custom\//)

      const sent = ls.calls.find((c) => c.route === 'POST /v1/checkouts').body.data.attributes
      assert.equal(sent.custom_price, 15210)
      assert.equal(sent.test_mode, false)
      assert.equal(sent.checkout_data.email, 'lista@test.com')
      assert.equal(sent.checkout_data.custom.kind, 'order')
      assert.equal(sent.checkout_data.custom.orderId, out.orderId)
      assert.match(sent.product_options.redirect_url, /\/checkout\/success\?provider=lemonsqueezy&orderId=/)

      const order = await orderRow(out.orderId)
      assert.equal(order.provider, 'lemonsqueezy')
      assert.equal(order.currency_id, 'USD')
      assert.equal(order.status, 'pending')
      assert.equal(order.total, 152.1)
      assert.ok(order.lemonCheckoutId)
    })

    it('si Lemon Squeezy no crea el checkout, la orden se borra y el comprador ve un error claro', async () => {
      const agent = await loginAs('caido@test.com')
      ls.failNext['POST /v1/checkouts'] = 500
      const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }], provider: 'paddle' })
      assert.equal(res.status, 502)
      const me = await agent.get('/api/auth/me')
      assert.equal((await fileDb.findOrdersByUser(me.body.user.id)).length, 0)
    })

    it('el producto de prueba: solo para las cuentas de QA, a US$ 1 fijos y sin el 10 %', async () => {
      const stranger = await loginAs('curioso@test.com')
      const denied = await stranger.post('/api/checkout').send({ items: [{ sku: 'qa-template' }], provider: 'lemonsqueezy' })
      // Como con Mercado Pago: para quien no es de QA, el producto simplemente no existe.
      assert.equal(denied.status, 400, JSON.stringify(denied.body))
      assert.match(JSON.stringify(denied.body), /SKU inválido/)

      const agent = await loginAs('qa-owner@test.com')
      const res = await agent.post('/api/checkout').send({ items: [{ sku: 'qa-template' }], provider: 'lemonsqueezy' })
      assert.equal(res.status, 200, JSON.stringify(res.body))
      assert.equal(res.body.provider, 'lemonsqueezy')
      const sent = ls.calls.filter((c) => c.route === 'POST /v1/checkouts').at(-1).body.data.attributes
      assert.equal(sent.custom_price, 100)
      const order = await orderRow(res.body.orderId)
      assert.equal(order.qa, true)
      assert.equal(order.currency_id, 'USD')
      assert.equal(order.total, 1)
      assert.equal(order.discountPct, undefined)

      // Pagar (con el webhook) cumple la orden de prueba y entrega su ZIP.
      const lemon = ls.pay(res.body.init_point.split('/').pop(), { email: 'qa-owner@test.com' })
      assert.equal((await lemonWebhook('order_created', lemon)).status, 200)
      const paidOrder = await orderRow(res.body.orderId)
      assert.equal(paidOrder.status, 'paid')
      assert.ok(fs.existsSync(paidOrder.zipPath))
    })

    it('Paddle no cobra productos de prueba', async () => {
      // Aunque el front pida `paddle`, con Lemon Squeezy como carril ya se resuelve ahí;
      // el rechazo de Paddle real está cubierto en paddleCheckout.test.js.
      const agent = await loginAs('qa-owner@test.com')
      const res = await agent.post('/api/checkout').send({ items: [{ sku: 'qa-template' }], provider: 'paddle' })
      assert.equal(res.status, 200)
      assert.equal(res.body.provider, 'lemonsqueezy')
    })
  })

  describe('pago', () => {
    it('webhook firmado: orden paga, ZIP descargable, recibo con la nota de Lemon Squeezy y aviso al dueño', async () => {
      const { agent, out, lemon } = await paid('paga@test.com')
      const res = await lemonWebhook('order_created', lemon)
      assert.equal(res.status, 200)
      const order = await orderRow(out.orderId)
      assert.equal(order.status, 'paid')
      assert.equal(order.lemonOrderId, lemon.id)
      assert.equal(order.expiresAt, undefined)
      assert.ok(fs.existsSync(order.zipPath))
      assert.equal((await agent.get(`/api/orders/${out.orderId}/download`)).status, 200)

      await waitFor(() => mp.mailsTo('paga@test.com').length === 1, 'el recibo')
      const receipt = mp.mailsTo('paga@test.com')[0].body
      assert.match(receipt.text, /US\$\s?152[.,]10/)
      assert.match(receipt.text, /Lemon Squeezy/)
      await waitFor(() => mp.mailsTo(OWNER).length >= 1, 'el aviso al dueño')
    })

    it('con tax del país del comprador igual coincide (se compara el subtotal)', async () => {
      const { out, lemon } = await paid('tax@test.com', [{ sku: 'nocturne' }], { tax: 3200 })
      assert.equal((await lemonWebhook('order_created', lemon)).status, 200)
      assert.equal((await orderRow(out.orderId)).status, 'paid')
    })

    it('el mismo evento repetido: una sola entrega y un solo recibo', async () => {
      const { out, lemon } = await paid('doble@test.com', [{ sku: 'nocturne' }])
      for (let i = 0; i < 3; i += 1) assert.equal((await lemonWebhook('order_created', lemon)).status, 200)
      await waitFor(() => mp.mailsTo('doble@test.com').length === 1, 'el recibo')
      await new Promise((r) => setTimeout(r, 100))
      assert.equal(mp.mailsTo('doble@test.com').length, 1)
      assert.equal((await orderRow(out.orderId)).status, 'paid')
    })

    it('firma inválida: 401 y la orden no se toca', async () => {
      const { out, lemon } = await paid('firma@test.com')
      assert.equal((await lemonWebhook('order_created', lemon, { secret: 'otro-secreto' })).status, 401)
      assert.equal((await lemonWebhook('order_created', lemon, { signature: 'zz' })).status, 401)
      assert.equal((await orderRow(out.orderId)).status, 'pending')
    })

    it('un pago con otro monto no cumple la orden y avisa al dueño', async () => {
      const { out, lemon } = await paid('monto@test.com')
      const res = await lemonWebhook('order_created', lemon, { overrides: { subtotal: 100, total: 100 } })
      assert.equal(res.status, 200)
      assert.equal((await orderRow(out.orderId)).status, 'pending')
      await waitFor(() => alerts('NO COINCIDE').some((m) => m.body.text.includes(lemon.id)), 'el aviso de monto distinto')
      assert.match(alerts('NO COINCIDE').find((m) => m.body.text.includes(lemon.id)).body.text, /Monto del pago no coincide/)
    })

    it('un descuento hecho en Lemon Squeezy no cumple la orden', async () => {
      const { out, lemon } = await paid('desc@test.com', [{ sku: 'chapters' }], { discount: 5000 })
      assert.equal((await lemonWebhook('order_created', lemon)).status, 200)
      assert.equal((await orderRow(out.orderId)).status, 'pending')
    })

    it('una orden de otro modo (real vs prueba) no se cumple', async () => {
      const { out, lemon } = await paid('modo@test.com', [{ sku: 'chapters' }], { testMode: true })
      assert.equal((await lemonWebhook('order_created', lemon)).status, 200)
      assert.equal((await orderRow(out.orderId)).status, 'pending')
    })

    it('un pago sin orden conocida avisa al dueño y no rompe', async () => {
      const lemon = { id: '999001', custom: { kind: 'order', orderId: 'no-existe' }, attributes: { status: 'paid', currency: 'USD', subtotal: 100, discount_total: 0, total: 100, user_email: 'x@y.com', test_mode: false } }
      assert.equal((await lemonWebhook('order_created', lemon)).status, 200)
      await waitFor(() => alerts('SIN ORDEN').length >= 1, 'el aviso de pago sin orden')
    })

    it('la vuelta del comprador: 409 mientras el webhook no llegó, después paga; otra cuenta 403', async () => {
      const agent = await loginAs('vuelta@test.com')
      const out = await checkout(agent, [{ sku: 'chapters' }])
      const early = await agent.post('/api/checkout/lemonsqueezy/confirm').send({ orderId: out.orderId })
      assert.equal(early.status, 409)

      const lemon = ls.pay(out.checkoutId, { email: 'vuelta@test.com' })
      await lemonWebhook('order_created', lemon)
      const ok = await agent.post('/api/checkout/lemonsqueezy/confirm').send({ orderId: out.orderId })
      assert.equal(ok.status, 200, JSON.stringify(ok.body))
      assert.equal(ok.body.order.currency_id, 'USD')
      assert.equal(ok.body.alreadyFulfilled, true)

      const intruder = await loginAs('intruso@test.com')
      assert.equal((await intruder.post('/api/checkout/lemonsqueezy/confirm').send({ orderId: out.orderId })).status, 403)
      assert.equal((await agent.post('/api/checkout/lemonsqueezy/confirm').send({ orderId: 'no-existe' })).status, 404)
    })
  })

  describe('reembolsos', () => {
    it('total: la orden pasa a reembolsada, se corta la descarga y le llega «Te devolvimos el dinero»', async () => {
      const { agent, out, lemon } = await paid('refund@test.com')
      await lemonWebhook('order_created', lemon)
      assert.equal((await agent.get(`/api/orders/${out.orderId}/download`)).status, 200)

      const res = await lemonWebhook('order_refunded', lemon, {
        overrides: { status: 'refunded', refunded: true, refunded_amount: lemon.attributes.total },
      })
      assert.equal(res.status, 200)
      const order = await orderRow(out.orderId)
      assert.equal(order.status, 'refunded')
      assert.equal((await agent.get(`/api/orders/${out.orderId}/download`)).status >= 400, true)

      await waitFor(() => mp.mailsTo('refund@test.com').some((m) => /devolvimos|refund/i.test(m.body.subject)), 'el mail de reembolso')
      await waitFor(() => alerts('REEMBOLSADA').length >= 1, 'el aviso al dueño')
      const row = await fileDb.findRefund(`lemon-${lemon.id}`)
      assert.equal(row.provider, 'lemonsqueezy')
      assert.equal(row.amount, 152.1)
    })

    it('parcial: la orden sigue paga y avisa al dueño', async () => {
      const { out, lemon } = await paid('parcial@test.com', [{ sku: 'nocturne' }])
      await lemonWebhook('order_created', lemon)
      await lemonWebhook('order_refunded', lemon, {
        overrides: { status: 'partial_refund', refunded: true, refunded_amount: 1000 },
      })
      assert.equal((await orderRow(out.orderId)).status, 'paid')
      await waitFor(() => alerts('PARCIAL').length >= 1, 'el aviso de reembolso parcial')
    })
  })
})

describe('Arrepentimiento sobre una compra de Lemon Squeezy', () => {
  let ls
  let mp
  let loginAs
  let lemonWebhook
  let cleanup
  let fileDb
  let config
  let executeWithdrawal

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = 'owner@scrolllab.test'
    ;({ ls, mp, loginAs, lemonWebhook, cleanup, fileDb, config } = await startAppAgainstFakeLemon())
    ;({ executeWithdrawal } = await import('../services/autoRefund.js'))
  })
  after(() => cleanup())

  async function paidOrder(email) {
    const agent = await loginAs(email)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }], provider: 'paddle' })
    const lemon = ls.pay(res.body.init_point.split('/').pop(), { email })
    await lemonWebhook('order_created', lemon)
    return { orderId: res.body.orderId, lemon }
  }

  it('sin descargar y en plazo: se devuelve por la API de Lemon Squeezy y la orden se corta', async () => {
    const { orderId, lemon } = await paidOrder('arrep@test.com')
    const row = await fileDb.createWithdrawal?.({ code: 'ARR-T1', orderId, email: 'arrep@test.com', name: 'A', status: 'pending' })
    const refunded = []
    const out = await executeWithdrawal(row || { code: 'ARR-T1', orderId, email: 'arrep@test.com' }, config, {
      refundLemonOrder: async (_cfg, id) => {
        refunded.push(id)
        return { attributes: { status: 'refunded' } }
      },
    })
    assert.equal(out.status, 'refunded', JSON.stringify(out))
    assert.deepEqual(refunded, [lemon.id])
    assert.equal((await fileDb.findOrderById(orderId)).status, 'refunded')
    await waitFor(() => mp.mailsTo('arrep@test.com').some((m) => /devolvimos/i.test(m.body.subject)), 'el mail de reembolso')
  })

  it('con el ZIP descargado no hay devolución automática', async () => {
    const { orderId } = await paidOrder('bajado@test.com')
    const order = await fileDb.findOrderById(orderId)
    order.downloadCount = 1
    await order.save()
    const out = await executeWithdrawal({ code: 'ARR-T2', orderId, email: 'bajado@test.com' }, config, {
      refundLemonOrder: async () => {
        throw new Error('no debería llamarse')
      },
    })
    assert.equal(out.status, 'manual')
    assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
  })
})

describe('Lemon Squeezy en modo prueba: solo para las cuentas de QA', () => {
  let ls
  let loginAs
  let lemonWebhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.QA_BUYER_EMAILS = 'qa-owner@test.com'
    ;({ ls, loginAs, lemonWebhook, cleanup, fileDb } = await startAppAgainstFakeLemon({ LEMONSQUEEZY_TEST_MODE: 'true' }))
  })
  after(() => cleanup())

  it('para un cliente cualquiera no hay carril internacional ni checkout (no se puede «pagar» con la 4242)', async () => {
    const agent = await loginAs('cliente@test.com')
    const methods = await agent.get('/api/checkout/methods').set('x-vercel-ip-country', 'ES')
    assert.equal(methods.body.providers.paddle.enabled, false)
    assert.equal(methods.body.suggested, 'mercadopago')
    for (const provider of ['paddle', 'lemonsqueezy']) {
      const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }], provider })
      assert.equal(res.status, 400, `${provider}: ${JSON.stringify(res.body)}`)
    }
    assert.equal(ls.calls.filter((c) => c.route === 'POST /v1/checkouts').length, 0)
  })

  it('para QA sí, y la orden (aunque sea un producto real) queda marcada de prueba', async () => {
    const agent = await loginAs('qa-owner@test.com')
    const methods = await agent.get('/api/checkout/methods')
    assert.equal(methods.body.providers.paddle.gateway, 'lemonsqueezy')
    assert.equal(methods.body.providers.paddle.testMode, true)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'bundle' }], provider: 'paddle' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const order = await fileDb.findOrderById(res.body.orderId)
    assert.equal(order.qa, true)
    const lemon = ls.pay(res.body.init_point.split('/').pop(), { email: 'qa-owner@test.com' })
    assert.equal((await lemonWebhook('order_created', lemon)).status, 200)
    assert.equal((await fileDb.findOrderById(res.body.orderId)).status, 'paid')
  })

  it('un pago de prueba nunca cumple una orden real (defensa extra)', async () => {
    const me = await (await loginAs('real@test.com')).get('/api/auth/me')
    const order = await fileDb.createOrder({
      userId: me.body.user.id,
      status: 'pending',
      provider: 'lemonsqueezy',
      currency_id: 'USD',
      items: [{ sku: 'chapters', title: 'CHAPTERS' }],
      total: 169,
    })
    const lemon = {
      id: '990001',
      custom: { kind: 'order', orderId: order.id },
      attributes: { status: 'paid', currency: 'USD', subtotal: 16900, discount_total: 0, total: 16900, user_email: 'real@test.com', test_mode: true },
    }
    assert.equal((await lemonWebhook('order_created', lemon)).status, 200)
    assert.equal((await fileDb.findOrderById(order.id)).status, 'pending')
  })
})
