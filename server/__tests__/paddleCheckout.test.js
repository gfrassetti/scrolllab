import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { waitFor } from './helpers/fakeMercadoPago.js'
import { startAppAgainstFakePaddle, signPaddle, paddleEvent, PADDLE_TEST_SECRET } from './helpers/fakePaddle.js'
import { readZip } from './helpers/zip.js'
import {
  TEMPLATE_PRICES_USD,
  CUSTOM_BASE_PRICE_USD,
  CUSTOM_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD,
} from '../../src/domain/catalog.js'

/**
 * Compras del market y del builder cobradas por Paddle (USD), contra el
 * Paddle simulado: la transacción que arma el servidor, el webhook firmado, el
 * confirm del front, los controles de que una transacción solo paga su orden,
 * los rechazos (mail diferido, una sola vez), los reembolsos y el pago
 * rechazado de Mercado Pago, que ahora también avisa.
 */
describe('Compras con Paddle (Paddle simulado)', () => {
  const OWNER = 'owner@scrolllab.test'
  let pd
  let mp
  let loginAs
  let paddleWebhook
  let webhook
  let cleanup
  let config
  let fileDb
  let sweep
  let DELAY

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ pd, mp, loginAs, paddleWebhook, webhook, cleanup, config, fileDb } =
      await startAppAgainstFakePaddle())
    ;({ sendDuePaymentFailedEmails: sweep, PAYMENT_FAILED_EMAIL_DELAY_MS: DELAY } = await import(
      '../services/paymentFailedSweep.js'
    ))
  })
  after(() => cleanup())

  const orderRow = (id) => fileDb.findOrderById(id)
  const alerts = (title) => mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))
  const later = () => new Date(Date.now() + DELAY + 60_000)

  async function paddleCheckout(agent, items, extra = {}) {
    const res = await agent.post('/api/checkout').send({ items, provider: 'paddle', ...extra })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    return { ...res.body, txn: pd.transactions.get(res.body.transactionId) }
  }

  async function paidOrder(email, items = [{ sku: 'chapters' }], extra = {}) {
    const agent = await loginAs(email)
    const out = await paddleCheckout(agent, items, extra)
    const { txn } = pd.pay(out.transactionId)
    assert.equal((await paddleWebhook('transaction.completed', txn)).status, 200)
    return { agent, ...out, txn }
  }

  describe('qué pasarela sugiere', () => {
    it('afuera de Argentina sugiere Paddle; en Argentina o sin país, Mercado Pago', async () => {
      const agent = await loginAs('methods@test.com')
      const es = await agent.get('/api/checkout/methods').set('x-vercel-ip-country', 'ES')
      assert.equal(es.status, 200)
      assert.equal(es.body.country, 'ES')
      assert.equal(es.body.suggested, 'paddle')
      assert.equal(es.body.providers.paddle.enabled, true)
      assert.equal(es.body.providers.paddle.environment, 'sandbox')
      assert.equal(es.body.providers.paddle.clientToken, 'test_fake_client_token')
      assert.equal(es.body.providers.paddle.currency, 'USD')
      // El token del cliente es público; la API key nunca sale.
      assert.ok(!JSON.stringify(es.body).includes(pd.apiKey))

      const ar = await agent.get('/api/checkout/methods').set('cf-ipcountry', 'AR')
      assert.equal(ar.body.suggested, 'mercadopago')
      const none = await agent.get('/api/checkout/methods')
      assert.equal(none.body.country, null)
      assert.equal(none.body.suggested, 'mercadopago')
    })
  })

  describe('checkout', () => {
    it('la transacción lleva el precio de lista en USD (centavos), la orden queda en USD', async () => {
      const agent = await loginAs('lista@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }, { sku: 'nocturne' }])
      assert.equal(out.provider, 'paddle')
      assert.match(out.transactionId, /^txn_/)
      assert.deepEqual(out.paddle, { environment: 'sandbox', clientToken: 'test_fake_client_token' })
      assert.equal(out.customerEmail, 'lista@test.com')

      const body = pd.lastCall('POST /transactions').body
      assert.equal(body.currency_code, 'USD')
      assert.deepEqual(body.custom_data, {
        kind: 'order',
        orderId: out.orderId,
        userId: (await orderRow(out.orderId)).userId,
      })
      assert.deepEqual(
        body.items.map((i) => i.price.unit_price.amount),
        [String(TEMPLATE_PRICES_USD.chapters * 100), String(TEMPLATE_PRICES_USD.nocturne * 100)],
      )
      assert.ok(body.items.every((i) => i.price.product.tax_category === 'standard'))

      const order = await orderRow(out.orderId)
      assert.equal(order.provider, 'paddle')
      assert.equal(order.currency_id, 'USD')
      assert.equal(order.total, TEMPLATE_PRICES_USD.chapters + TEMPLATE_PRICES_USD.nocturne)
      assert.equal(order.paddleTransactionId, out.transactionId)
      assert.equal(order.fxRate, undefined)
      assert.equal(order.status, 'pending')
    })

    it('el builder cobra la receta por tramos en USD', async () => {
      const agent = await loginAs('builder@test.com')
      const recipe = Array.from({ length: CUSTOM_BASE_SECTIONS + 2 }, () => 'chapters/HeroKinetic')
      const out = await paddleCheckout(agent, [{ sku: 'custom', recipe }])
      const expected = CUSTOM_BASE_PRICE_USD + 2 * CUSTOM_EXTRA_SECTION_USD
      assert.equal(pd.lastCall('POST /transactions').body.items[0].price.unit_price.amount, String(expected * 100))
      assert.equal((await orderRow(out.orderId)).total, expected)
    })

    it('el cupón de bienvenida descuenta en USD, en centavos', async () => {
      const agent = await loginAs('cupon-usd@test.com')
      const welcome = await agent.post('/api/coupons/welcome').send({})
      assert.equal(welcome.status, 200, JSON.stringify(welcome.body))
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }], {
        couponCode: welcome.body.coupon.code,
      })
      const pct = welcome.body.coupon.percent
      const expected = Math.round(TEMPLATE_PRICES_USD.chapters * (100 - pct)) / 100
      assert.equal(pd.lastCall('POST /transactions').body.items[0].price.unit_price.amount, String(Math.round(expected * 100)))
      const order = await orderRow(out.orderId)
      assert.equal(order.total, expected)
      assert.equal(order.discountPct, pct)
    })

    it('si Paddle no crea la transacción: 502 y la orden no queda colgada', async () => {
      const agent = await loginAs('caido@test.com')
      pd.failNext['POST /transactions'] = 500
      const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }], provider: 'paddle' })
      assert.equal(res.status, 502)
      const orders = await fileDb.findOrdersByUser((await agent.get('/api/auth/me')).body.user.id)
      assert.equal(orders.length, 0)
    })

    it('una pasarela inventada no pasa', async () => {
      const agent = await loginAs('otra@test.com')
      // El servidor lee solo 'paddle'; lo demás es Mercado Pago (default).
      const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }], provider: 'stripe' })
      assert.equal(res.status, 200)
      assert.ok(res.body.init_point)
      assert.equal(res.body.provider, undefined)
    })
  })

  describe('pago', () => {
    it('webhook firmado: orden paga, ZIP descargable, recibo en USD con la nota de Paddle y aviso al dueño', async () => {
      const { agent, orderId } = await paidOrder('paga@test.com')
      const order = await orderRow(orderId)
      assert.equal(order.status, 'paid')
      assert.equal(order.expiresAt, undefined)
      assert.equal(order.mpPaymentId, undefined)
      assert.ok(fs.existsSync(order.zipPath))
      const entries = [...readZip(fs.readFileSync(order.zipPath)).keys()]
      assert.ok(entries.some((e) => e.endsWith('LICENSE.txt')))

      const dl = await agent.get(`/api/orders/${orderId}/download`)
      assert.equal(dl.status, 200)

      await waitFor(() => mp.mailsTo('paga@test.com').length === 1, 'el recibo')
      const receipt = mp.mailsTo('paga@test.com')[0].body
      assert.match(receipt.subject, /Tu compra en SCROLLLAB/)
      assert.match(receipt.text, /US\$\s?149/)
      assert.match(receipt.text, /Paddle\.com/)
      await waitFor(() => mp.mailsTo(OWNER).length >= 1, 'el aviso al dueño')
    })

    it('`.paid` y `.completed` (y repetidos): una sola entrega, un solo recibo', async () => {
      const agent = await loginAs('doble@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'nocturne' }])
      const { txn } = pd.pay(out.transactionId)
      for (const type of ['transaction.paid', 'transaction.completed', 'transaction.completed']) {
        assert.equal((await paddleWebhook(type, txn)).status, 200)
      }
      await waitFor(() => mp.mailsTo('doble@test.com').length === 1, 'el recibo')
      await new Promise((r) => setTimeout(r, 100))
      assert.equal(mp.mailsTo('doble@test.com').length, 1)
    })

    it('en inglés: recibo en inglés', async () => {
      await paidOrder('english@test.com', [{ sku: 'chapters' }], { locale: 'en' })
      await waitFor(() => mp.mailsTo('english@test.com').length === 1, 'el recibo')
      const mail = mp.mailsTo('english@test.com')[0].body
      assert.match(mail.subject, /Your SCROLLLAB purchase/)
      assert.match(mail.text, /\$149/)
    })

    it('confirm del front: 409 mientras Paddle procesa, después cumple; idempotente; otra cuenta 403', async () => {
      const agent = await loginAs('confirm@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      const early = await agent.post('/api/checkout/paddle/confirm').send({ transactionId: out.transactionId })
      assert.equal(early.status, 409)

      pd.pay(out.transactionId)
      const ok = await agent.post('/api/checkout/paddle/confirm').send({ transactionId: out.transactionId })
      assert.equal(ok.status, 200, JSON.stringify(ok.body))
      assert.equal(ok.body.orderId, out.orderId)
      assert.equal(ok.body.order.currency_id, 'USD')
      assert.equal(ok.body.alreadyFulfilled, false)
      const again = await agent.post('/api/checkout/paddle/confirm').send({ transactionId: out.transactionId })
      assert.equal(again.body.alreadyFulfilled, true)

      const intruder = await loginAs('intruso@test.com')
      const stolen = await intruder.post('/api/checkout/paddle/confirm').send({ transactionId: out.transactionId })
      assert.equal(stolen.status, 403)
      const junk = await agent.post('/api/checkout/paddle/confirm').send({ transactionId: '../../x' })
      assert.equal(junk.status, 400)
    })

    it('una transacción con otro monto no paga la orden', async () => {
      const agent = await loginAs('monto@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      const { txn } = pd.pay(out.transactionId)
      const tampered = structuredClone(txn)
      tampered.items[0].price.unit_price.amount = '100'
      assert.equal((await paddleWebhook('transaction.completed', tampered)).status, 200)
      assert.equal((await orderRow(out.orderId)).status, 'pending')
      // Pagaron y no se entrega: le llega un mail al dueño con el motivo (uno solo).
      await waitFor(() => alerts('NO COINCIDE').some((m) => m.body.text.includes(txn.id)), 'el aviso de monto distinto')
      const mail = alerts('NO COINCIDE').find((m) => m.body.text.includes(txn.id))
      assert.match(mail.body.text, /Monto del pago no coincide/)
      assert.match(mail.body.text, new RegExp(`orden ${out.orderId} espera`))
      await paddleWebhook('transaction.completed', tampered)
      await new Promise((r) => setTimeout(r, 80))
      // Resend deduplica por la clave de idempotencia: el mismo evento repetido usa la misma.
      const keys = alerts('NO COINCIDE').filter((m) => m.body.text.includes(txn.id)).map((m) => m.idempotencyKey)
      assert.equal(new Set(keys).size, 1, keys.join(' | '))
    })

    it('una transacción en otra moneda tampoco paga la orden, y avisa', async () => {
      const agent = await loginAs('moneda@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      const { txn } = pd.pay(out.transactionId)
      const eur = { ...structuredClone(txn), currency_code: 'EUR' }
      assert.equal((await paddleWebhook('transaction.completed', eur)).status, 200)
      assert.equal((await orderRow(out.orderId)).status, 'pending')
      await waitFor(
        () => alerts('NO COINCIDE').some((m) => m.body.text.includes(txn.id) && /Moneda/.test(m.body.text)),
        'el aviso de moneda distinta',
      )
    })

    it('una transacción ajena con el orderId de otra orden no la paga', async () => {
      const victim = await loginAs('victima@test.com')
      const target = await paddleCheckout(victim, [{ sku: 'chapters' }])
      const attacker = await loginAs('atacante@test.com')
      const own = await paddleCheckout(attacker, [{ sku: 'chapters' }])
      const { txn } = pd.pay(own.transactionId)
      const forged = { ...structuredClone(txn), custom_data: { kind: 'order', orderId: target.orderId } }
      await paddleWebhook('transaction.completed', forged)
      assert.equal((await orderRow(target.orderId)).status, 'pending')
      assert.equal((await orderRow(own.orderId)).status, 'pending')
      await waitFor(
        () => alerts('NO COINCIDE').some((m) => m.body.text.includes(txn.id) && /Referencia/.test(m.body.text)),
        'el aviso de referencia que no coincide',
      )
    })

    it('un descuento hecho en Paddle no entrega el ZIP y avisa', async () => {
      const agent = await loginAs('descuento-paddle@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      const { txn } = pd.pay(out.transactionId)
      txn.discount_id = 'dsc_01'
      txn.details.totals.discount = '1500'
      assert.equal((await paddleWebhook('transaction.completed', txn)).status, 200)
      assert.equal((await orderRow(out.orderId)).status, 'pending')
      await waitFor(
        () => alerts('NO COINCIDE').some((m) => m.body.text.includes(txn.id) && /descuento hecho en Paddle/.test(m.body.text)),
        'el aviso del descuento',
      )
    })

    it('custom_data no decide: un pago de template que dice ser de LAB no activa nada de LAB', async () => {
      const agent = await loginAs('custom-lab@test.com')
      const lab = await agent.post('/api/subscriptions').send({ plan: 'hosted_studio', cycle: 'yearly', provider: 'paddle' })
      assert.equal(lab.status, 200, JSON.stringify(lab.body))
      const me = (await agent.get('/api/auth/me')).body.user
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      const { txn } = pd.pay(out.transactionId)
      const forged = {
        ...structuredClone(txn),
        custom_data: { kind: 'lab', subscriptionId: lab.body.subscriptionId, userId: me.id, plan: 'hosted_studio', cycle: 'yearly' },
      }
      assert.equal((await paddleWebhook('transaction.completed', forged)).status, 200)
      // Pagó un template: recibe el template; el alta de LAB sigue pendiente.
      assert.equal((await orderRow(out.orderId)).status, 'paid')
      assert.equal((await fileDb.findSubscriptionById(lab.body.subscriptionId)).status, 'pending')
      assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'free')
    })

    it('una transacción que nadie abrió (custom_data inventado) no activa nada y avisa', async () => {
      const agent = await loginAs('nadie-la-abrio@test.com')
      const lab = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly', provider: 'paddle' })
      const me = (await agent.get('/api/auth/me')).body.user
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      const { txn } = pd.pay(out.transactionId)
      const ghost = {
        ...structuredClone(txn),
        id: 'txn_ghost_000001',
        custom_data: { kind: 'lab', subscriptionId: lab.body.subscriptionId, userId: me.id },
      }
      assert.equal((await paddleWebhook('transaction.completed', ghost)).status, 200)
      assert.equal((await fileDb.findSubscriptionById(lab.body.subscriptionId)).status, 'pending')
      await waitFor(
        () => alerts('PAGO SIN ORDEN').some((m) => m.body.text.includes('txn_ghost_000001')),
        'el aviso de pago sin dueño',
      )
    })

    it('un error de la API de Paddle no llega crudo al navegador', async () => {
      const agent = await loginAs('error-crudo@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      pd.failNext['GET /transactions/:id'] = 404
      const res = await agent.post('/api/checkout/paddle/confirm').send({ transactionId: out.transactionId })
      assert.equal(res.status, 502)
      assert.equal(res.body.code, 'payment_provider')
      assert.match(res.body.error, /procesador de pagos/)
      assert.ok(!/fake Paddle|internal_error|txn_/.test(res.body.error))
    })

    it('webhook sin firma, con otra firma o viejo: 401 y no toca nada', async () => {
      const agent = await loginAs('firma@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      const { txn } = pd.pay(out.transactionId)
      assert.equal((await paddleWebhook('transaction.completed', txn, { signature: '' })).status, 401)
      assert.equal((await paddleWebhook('transaction.completed', txn, { secret: 'otro' })).status, 401)
      const raw = JSON.stringify(paddleEvent('transaction.completed', txn))
      const old = signPaddle(raw, PADDLE_TEST_SECRET, Math.floor(Date.now() / 1000) - 3600)
      assert.equal((await paddleWebhook('transaction.completed', txn, { signature: old })).status, 401)
      assert.equal((await orderRow(out.orderId)).status, 'pending')
    })

    it('un evento que no nos importa responde 200', async () => {
      assert.equal((await paddleWebhook('customer.created', { id: 'ctm_1' })).status, 200)
    })

    it('una transacción paga sin orden (venció) avisa al dueño para entregar o reembolsar', async () => {
      const agent = await loginAs('huerfana@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      const { txn } = pd.pay(out.transactionId)
      await fileDb.deletePendingOrder(out.orderId)
      assert.equal((await paddleWebhook('transaction.completed', txn)).status, 200)
      await waitFor(
        () => mp.mailsTo(OWNER).some((m) => m.body.subject.includes('PAGO SIN ORDEN') && m.body.text.includes(txn.id)),
        'la alerta de pago sin orden',
      )
    })
  })

  describe('rechazos', () => {
    it('Paddle rechaza: el mail sale recién en el barrido, una vez, en el idioma de la orden', async () => {
      const agent = await loginAs('rechazo@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }], { locale: 'en' })
      const txn = pd.decline(out.transactionId)
      assert.equal((await paddleWebhook('transaction.payment_failed', txn)).status, 200)
      assert.ok((await orderRow(out.orderId)).paymentFailedAt)
      assert.equal(mp.mailsTo('rechazo@test.com').length, 0)

      // Antes de la espera no sale (puede estar reintentando en el checkout).
      assert.equal((await sweep({ config })).sent, 0)
      assert.equal((await sweep({ config, now: later() })).sent, 1)
      assert.equal((await sweep({ config, now: later() })).sent, 0)
      const mail = mp.mailsTo('rechazo@test.com')
      assert.equal(mail.length, 1)
      assert.match(mail[0].body.subject, /couldn’t process your payment/)
      assert.match(mail[0].body.html, /localhost:5173\/cart/)
      assert.equal(mail[0].idempotencyKey, `scrolllab-order-failed-${out.orderId}`)
    })

    it('si reintenta y paga antes del barrido, no recibe el «rechazado»', async () => {
      const agent = await loginAs('reintenta@test.com')
      const out = await paddleCheckout(agent, [{ sku: 'chapters' }])
      await paddleWebhook('transaction.payment_failed', pd.decline(out.transactionId))
      const { txn } = pd.pay(out.transactionId)
      await paddleWebhook('transaction.completed', txn)
      await sweep({ config, now: later() })
      await waitFor(() => mp.mailsTo('reintenta@test.com').length === 1, 'el recibo')
      assert.match(mp.mailsTo('reintenta@test.com')[0].body.subject, /Tu compra/)
    })

    it('Mercado Pago rechazado: también avisa (en pesos), una vez', async () => {
      const agent = await loginAs('mp-rechazo@test.com')
      const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }] })
      assert.equal(res.status, 200)
      const pref = mp.lastPreference()
      const payment = mp.pay(pref.id, { approved: false })
      assert.equal(payment.status, 'rejected')
      assert.equal((await webhook('payment', payment.id)).status, 200)
      assert.equal((await webhook('payment', payment.id)).status, 200)
      await sweep({ config, now: later() })
      const mails = mp.mailsTo('mp-rechazo@test.com')
      assert.equal(mails.length, 1)
      assert.match(mails[0].body.text, /Mercado Pago rechazó/)
      assert.match(mails[0].body.text, /\$\s?\d{3}\.\d{3}/)
    })
  })

  describe('reembolsos', () => {
    it('reembolso total: orden refunded, descarga cortada, aviso al dueño', async () => {
      const { agent, orderId, txn } = await paidOrder('reembolso@test.com')
      assert.equal((await paddleWebhook('adjustment.created', pd.adjust(txn.id, { status: 'pending_approval' }))).status, 200)
      assert.equal((await orderRow(orderId)).status, 'paid')
      assert.equal((await paddleWebhook('adjustment.updated', pd.adjust(txn.id))).status, 200)
      const order = await orderRow(orderId)
      assert.equal(order.status, 'refunded')
      assert.equal(order.refundReason, 'refunded')
      assert.notEqual((await agent.get(`/api/orders/${orderId}/download`)).status, 200)
      await waitFor(
        () => mp.mailsTo(OWNER).some((m) => m.body.subject.includes('ORDEN REEMBOLSADA')),
        'el aviso de reembolso',
      )
      // Queda en el libro de reembolsos (lo muestra el panel): quién y cuánto.
      const rows = (await fileDb.listRefunds()).filter((r) => r.orderId === orderId)
      assert.equal(rows.length, 1)
      assert.equal(rows[0].email, 'reembolso@test.com')
      assert.equal(rows[0].amount, Number(txn.details.totals.grand_total) / 100)
      assert.deepEqual([rows[0].provider, rows[0].kind, rows[0].currency, rows[0].partial], ['paddle', 'order', 'USD', false])
    })

    it('contracargo: refunded con motivo charged_back', async () => {
      const { orderId, txn } = await paidOrder('contracargo@test.com')
      await paddleWebhook('adjustment.created', pd.adjust(txn.id, { action: 'chargeback' }))
      const order = await orderRow(orderId)
      assert.equal(order.status, 'refunded')
      assert.equal(order.refundReason, 'charged_back')
    })

    it('reembolso parcial: la orden sigue paga y el dueño revisa', async () => {
      const { orderId, txn } = await paidOrder('parcial@test.com')
      const adj = pd.adjust(txn.id, { type: 'partial' })
      await paddleWebhook('adjustment.created', adj)
      await paddleWebhook('adjustment.created', adj) // repetido: una sola fila
      assert.equal((await orderRow(orderId)).status, 'paid')
      const rows = (await fileDb.listRefunds()).filter((r) => r.orderId === orderId)
      assert.equal(rows.length, 1)
      assert.deepEqual([rows[0].email, rows[0].amount, rows[0].partial], ['parcial@test.com', 1, true])
      await waitFor(
        () => mp.mailsTo(OWNER).some((m) => m.body.subject.includes('REEMBOLSO PARCIAL')),
        'el aviso de reembolso parcial',
      )
    })
  })

  it('Mis compras muestra la orden de Paddle en USD', async () => {
    const { agent, orderId } = await paidOrder('miscompras@test.com')
    const res = await agent.get('/api/orders')
    assert.equal(res.status, 200)
    const order = (res.body.orders || res.body).find((o) => (o.id || o._id) === orderId)
    assert.ok(order, JSON.stringify(res.body).slice(0, 300))
    assert.equal(order.currency_id, 'USD')
    assert.equal(order.total, TEMPLATE_PRICES_USD.chapters)
    assert.ok(path.isAbsolute((await orderRow(orderId)).zipPath))
  })
})
