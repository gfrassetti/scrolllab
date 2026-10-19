import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { waitFor } from './helpers/fakeMercadoPago.js'
import { startAppAgainstFakePolar, signPolar } from './helpers/fakePolar.js'

/**
 * Compras del market y del builder cobradas por Polar (USD), contra el Polar simulado:
 * el checkout que arma el servidor, el webhook firmado, la vuelta del comprador, los
 * controles de que un pago solo cumple su orden, los reembolsos y el arrepentimiento.
 */
describe('Compras con Polar (Polar simulado)', () => {
  const OWNER = 'owner@scrolllab.test'
  let pl
  let mp
  let loginAs
  let polarWebhook
  let cleanup
  let fileDb
  let config
  let executeWithdrawal

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ pl, mp, loginAs, polarWebhook, cleanup, fileDb, config } = await startAppAgainstFakePolar())
    ;({ executeWithdrawal } = await import('../services/autoRefund.js'))
  })
  after(() => cleanup())

  const orderRow = (id) => fileDb.findOrderById(id)
  const alerts = (title) => mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))

  async function checkout(agent, items) {
    const res = await agent.post('/api/checkout').send({ items, provider: 'polar' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    return { ...res.body, checkoutId: res.body.init_point.split('polar_c_').pop() }
  }
  async function paid(email, items = [{ sku: 'chapters' }], payOpts = {}) {
    const agent = await loginAs(email)
    const out = await checkout(agent, items)
    const order = pl.pay(out.checkoutId, { email, ...payOpts })
    return { agent, out, order }
  }

  it('el carril internacional lo cobra Polar (sin secretos en la respuesta)', async () => {
    const agent = await loginAs('methods@test.com')
    const res = await agent.get('/api/checkout/methods').set('x-vercel-ip-country', 'ES')
    assert.equal(res.body.intl, 'polar')
    assert.equal(res.body.suggested, 'polar')
    assert.equal(res.body.providers.polar.enabled, true)
    assert.ok(!JSON.stringify(res.body).includes(pl.token))
  })

  it('crea el checkout con el total ad hoc en centavos (primera compra −10 %) y la orden queda en USD', async () => {
    const agent = await loginAs('lista@test.com')
    const out = await checkout(agent, [{ sku: 'chapters' }])
    assert.equal(out.provider, 'polar')
    const sent = pl.calls.filter((c) => c.route === 'POST /checkouts/').at(-1).body
    const productId = sent.products[0]
    assert.equal(sent.prices[productId][0].price_amount, 15210)
    assert.equal(sent.allow_discount_codes, false)
    assert.equal(sent.metadata.kind, 'order')
    assert.equal(sent.metadata.orderId, out.orderId)
    assert.match(sent.success_url, /\/checkout\/success\?provider=polar&orderId=/)
    const order = await orderRow(out.orderId)
    assert.equal(order.provider, 'polar')
    assert.equal(order.currency_id, 'USD')
    assert.equal(order.total, 152.1)
    assert.ok(order.polarCheckoutId)
    // El producto genérico se crea una sola vez.
    await checkout(agent, [{ sku: 'fizz' }])
    assert.equal(pl.calls.filter((c) => c.route === 'POST /products/').length, 1)
  })

  it('si Polar no crea el checkout, la orden se borra y el comprador ve un error claro', async () => {
    const agent = await loginAs('falla@test.com')
    pl.failNext['POST /checkouts/'] = 500
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }], provider: 'polar' })
    assert.equal(res.status, 502)
    assert.match(res.body.error, /pago internacional/)
    const rows = await fileDb.findOrdersByUser((await agent.get('/api/auth/me')).body.user.id)
    assert.equal(rows.length, 0)
  })

  it('webhook firmado: orden paga, ZIP, recibo con la nota de Polar y aviso al dueño', async () => {
    const { agent, out, order } = await paid('paga@test.com', [{ sku: 'chapters' }], { tax: 3194 })
    const res = await polarWebhook('order.paid', order)
    assert.equal(res.status, 202)
    const row = await orderRow(out.orderId)
    assert.equal(row.status, 'paid')
    assert.equal(row.polarOrderId, order.id)
    assert.ok(fs.existsSync(row.zipPath))
    await waitFor(() => mp.mailsTo('paga@test.com').some((m) => /Polar/.test(m.body.text)), 'el recibo con la nota de Polar')
    // La vuelta del comprador ya la encuentra paga.
    const back = await agent.post('/api/checkout/polar/confirm').send({ orderId: out.orderId })
    assert.equal(back.status, 200)
    assert.equal(back.body.status, 'paid')
    // El mismo evento otra vez: una sola entrega.
    await polarWebhook('order.paid', order)
    assert.equal(mp.mailsTo('paga@test.com').filter((m) => /Tu compra/i.test(m.body.subject)).length, 1)
  })

  it('la vuelta antes del webhook: 409; de otra cuenta: 403', async () => {
    const { agent, out } = await paid('vuelta@test.com')
    assert.equal((await agent.post('/api/checkout/polar/confirm').send({ orderId: out.orderId })).status, 409)
    const other = await loginAs('otro@test.com')
    assert.equal((await other.post('/api/checkout/polar/confirm').send({ orderId: out.orderId })).status, 403)
  })

  it('firma inválida o vencida: 401 y la orden no se toca', async () => {
    const { out, order } = await paid('firma@test.com')
    const raw = JSON.stringify({ type: 'order.paid', data: order })
    const bad = signPolar(raw, { secret: 'whsec_' + Buffer.from('otro').toString('base64') })
    assert.equal((await polarWebhook('order.paid', order, { headers: bad })).status, 401)
    const old = signPolar(JSON.stringify({ type: 'order.paid', timestamp: 'x', data: order }), { ts: Math.floor(Date.now() / 1000) - 3600 })
    assert.equal((await polarWebhook('order.paid', order, { headers: old })).status, 401)
    assert.equal((await orderRow(out.orderId)).status, 'pending')
  })

  it('otro monto, un descuento de Polar u otra moneda no cumplen la orden y avisan', async () => {
    const a = await paid('monto@test.com', [{ sku: 'chapters' }], { amount: 100 })
    await polarWebhook('order.paid', a.order)
    assert.equal((await orderRow(a.out.orderId)).status, 'pending')
    const b = await paid('desc@test.com', [{ sku: 'chapters' }], { discount: 500 })
    await polarWebhook('order.paid', b.order)
    assert.equal((await orderRow(b.out.orderId)).status, 'pending')
    const c = await paid('moneda@test.com', [{ sku: 'chapters' }], { currency: 'eur' })
    await polarWebhook('order.paid', c.order)
    assert.equal((await orderRow(c.out.orderId)).status, 'pending')
    await waitFor(() => alerts('PAGO NO COINCIDE CON LA ORDEN (Polar)').length >= 3, 'los avisos al dueño')
  })

  it('reembolso total desde el panel: la orden se corta y llega «Te devolvimos el dinero»; parcial: sigue paga', async () => {
    const full = await paid('reemb@test.com')
    await polarWebhook('order.paid', full.order)
    await polarWebhook('order.refunded', pl.refund(full.order.id))
    assert.equal((await orderRow(full.out.orderId)).status, 'refunded')
    await waitFor(() => mp.mailsTo('reemb@test.com').some((m) => /devolvimos/i.test(m.body.subject)), 'el mail de reembolso')

    const part = await paid('parcial@test.com')
    await polarWebhook('order.paid', part.order)
    await polarWebhook('order.refunded', pl.refund(part.order.id, 1000))
    assert.equal((await orderRow(part.out.orderId)).status, 'paid')
    assert.ok((await fileDb.listRefunds()).some((r) => r.provider === 'polar' && r.partial && r.amount === 10))
  })

  it('arrepentimiento sin descargar: se devuelve por la API de Polar (precio sin impuestos) y la orden se corta', async () => {
    const { out, order } = await paid('arrep@test.com', [{ sku: 'chapters' }], { tax: 3194 })
    await polarWebhook('order.paid', order)
    const result = await executeWithdrawal({ code: 'ARR-PL1', orderId: out.orderId, email: 'arrep@test.com' }, config)
    assert.equal(result.status, 'refunded', JSON.stringify(result))
    const refund = pl.calls.filter((c) => c.route === 'POST /refunds/').at(-1).body
    assert.equal(refund.order_id, order.id)
    assert.equal(refund.amount, 15210)
    assert.equal(refund.revoke_benefits, true)
    assert.equal((await orderRow(out.orderId)).status, 'refunded')
    // El webhook de la devolución, que llega después, no repite nada.
    await polarWebhook('order.refunded', pl.orders.get(order.id))
    await waitFor(() => mp.mailsTo('arrep@test.com').some((m) => /devolvimos/i.test(m.body.subject)), 'el mail')
    assert.equal(mp.mailsTo('arrep@test.com').filter((m) => /devolvimos/i.test(m.body.subject)).length, 1)
  })
})

describe('Polar en el entorno de prueba (sandbox): solo para las cuentas de QA', () => {
  let pl
  let loginAs
  let polarWebhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.QA_BUYER_EMAILS = 'qa-owner@test.com'
    ;({ pl, loginAs, polarWebhook, cleanup, fileDb } = await startAppAgainstFakePolar({ POLAR_ENV: 'sandbox' }))
  })
  after(() => cleanup())

  it('para un cliente cualquiera no hay carril internacional ni checkout', async () => {
    const agent = await loginAs('cliente@test.com')
    const methods = await agent.get('/api/checkout/methods').set('x-vercel-ip-country', 'ES')
    assert.equal(methods.body.intl, null)
    assert.equal(methods.body.providers.polar.enabled, false)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }], provider: 'polar' })
    assert.equal(res.status, 400)
    assert.equal(pl.calls.filter((c) => c.route === 'POST /checkouts/').length, 0)
  })

  it('para QA sí: el template de prueba a US$ 1 y la orden queda marcada de prueba', async () => {
    const agent = await loginAs('qa-owner@test.com')
    const methods = await agent.get('/api/checkout/methods')
    assert.equal(methods.body.intl, 'polar')
    assert.equal(methods.body.providers.polar.testMode, true)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'qa-template' }], provider: 'polar' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const order = await fileDb.findOrderById(res.body.orderId)
    assert.equal(order.qa, true)
    assert.equal(order.total, 1)
    const paidOrder = pl.pay(res.body.init_point.split('polar_c_').pop(), { email: 'qa-owner@test.com' })
    assert.equal((await polarWebhook('order.paid', paidOrder)).status, 202)
    assert.equal((await fileDb.findOrderById(res.body.orderId)).status, 'paid')
  })
})
