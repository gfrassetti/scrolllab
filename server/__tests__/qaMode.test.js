import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeMercadoPago, startAppAgainstFakeMp, waitFor } from './helpers/fakeMercadoPago.js'
import {
  QA_TEMPLATE_SKU,
  QA_TEMPLATE_MODEL,
  QA_TEMPLATE_ARS,
  QA_CUSTOM_SKU,
  QA_BUILDER_BASE_ARS,
  QA_BUILDER_EXTRA_SECTION_ARS,
  QA_BUILDER_COMMERCE_ARS,
  QA_LAB_PRICE_ARS,
  qaCustomPriceArs,
  qaDiscountedArs,
} from '../../src/domain/qa.js'
import { orderPriceSummary } from '../../src/domain/orderSummary.js'

/**
 * Modo prueba (src/domain/qa.js): productos a precio mínimo para probar en
 * producción con plata real. Solo para las cuentas de QA_BUYER_EMAILS; para el
 * resto no existen. Mismo circuito que una compra real (recibo, ZIP,
 * arrepentimiento con devolución), y fuera de las métricas.
 */
const QA = 'dueno-qa@test.com'
const RECIPE3 = ['chapters/HeroKinetic', 'nocturne/StickyWordCycle', 'chapters/BigNumbers']

describe('modo prueba (QA_BUYER_EMAILS)', () => {
  const mp = createFakeMercadoPago()
  let app
  let loginAs
  let webhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.QA_BUYER_EMAILS = ` ${QA.toUpperCase()} , otra@test.com`
    ;({ app, loginAs, webhook, cleanup, fileDb } = await startAppAgainstFakeMp(mp))
  })
  after(() => {
    delete process.env.QA_BUYER_EMAILS
    cleanup()
  })

  const receipts = (email) => mp.mailsTo(email).filter((m) => /Tu compra en SCROLLLAB/.test(m.body.subject))

  it('para una cuenta común no existe: ni el template, ni el builder, ni LAB, ni el flag', async () => {
    const agent = await loginAs('cliente-comun@test.com')
    assert.equal((await agent.get('/api/auth/me')).body.user.qa, undefined)
    let res = await agent.post('/api/checkout').send({ items: [{ sku: QA_TEMPLATE_SKU }] })
    assert.equal(res.status, 400)
    assert.match(res.body.error, /SKU inválido/)
    res = await agent.post('/api/checkout').send({ items: [{ sku: QA_CUSTOM_SKU, recipe: RECIPE3 }] })
    assert.equal(res.status, 400)
    res = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly', qa: true })
    assert.equal(res.status, 400)
    const plans = (await agent.get('/api/subscriptions/plans?qa=1')).body
    assert.equal(plans.qa, undefined)
    assert.ok(plans.plans.every((p) => p.priceMonthly > QA_LAB_PRICE_ARS))
  })

  it('el dueño ve el flag (el mail se compara sin mayúsculas ni espacios)', async () => {
    const agent = await loginAs(QA)
    assert.equal((await agent.get('/api/auth/me')).body.user.qa, true)
  })

  it('template de prueba: $1, recibo, ZIP real, orden marcada y fuera de las métricas', async () => {
    const agent = await loginAs(QA)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: QA_TEMPLATE_SKU }] })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const pref = mp.lastPreference()
    // A $1 el 10% no baja nada: ni se aplica ni se anuncia en la pantalla de MP.
    assert.equal(pref.items[0].unit_price, QA_TEMPLATE_ARS)
    assert.equal(pref.items[0].currency_id, 'ARS')
    assert.match(pref.items[0].title, /PRUEBA/)
    assert.doesNotMatch(pref.items[0].title, /off/)

    const order = await fileDb.findOrderById(res.body.orderId)
    assert.equal(order.qa, true)
    assert.equal(order.total, QA_TEMPLATE_ARS)
    assert.equal(order.couponCode, undefined, 'el cupón no se gasta en una prueba sin descuento')
    assert.equal(order.items[0].sku, QA_TEMPLATE_MODEL)
    assert.equal(order.items[0].list_ars, QA_TEMPLATE_ARS)
    const summary = orderPriceSummary(order)
    assert.deepEqual([summary.subtotal, summary.discount, summary.total], [QA_TEMPLATE_ARS, 0, QA_TEMPLATE_ARS])

    const payment = mp.pay(pref.id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    const paid = await fileDb.findOrderById(res.body.orderId)
    assert.equal(paid.status, 'paid')
    assert.ok(paid.zipPath, 'se empaquetó el ZIP del modelo')
    await waitFor(() => receipts(QA).length === 1, 'el recibo')
    assert.match(receipts(QA)[0].body.text, /PRUEBA/)

    const list = (await agent.get('/api/orders')).body.orders
    assert.equal(list.find((o) => o.id === res.body.orderId).qa, true)

    await agent.post('/api/checkout').send({ items: [{ sku: QA_TEMPLATE_SKU }] })
    assert.equal(mp.lastPreference().items[0].unit_price, QA_TEMPLATE_ARS)
  })

  it('con un precio de prueba que sí baja con el 10%, la primera compra lo aplica', () => {
    assert.equal(qaDiscountedArs(100, 10), 90)
    assert.equal(qaDiscountedArs(1, 10), 1, 'a $1 el 10% no baja nada')
  })

  it('arrepentimiento de una compra de prueba: se devuelve solo y llega «Te devolvimos el dinero»', async () => {
    const agent = await loginAs('otra@test.com')
    const res = await agent.post('/api/checkout').send({ items: [{ sku: QA_TEMPLATE_SKU }] })
    const payment = mp.pay(mp.lastPreference().id)
    await webhook('payment', payment.id)
    const w = await agent
      .post('/api/withdrawals')
      .send({ email: 'otra@test.com', name: 'Dueño', order: res.body.orderId })
    assert.equal(w.body.outcome, 'refunded', JSON.stringify(w.body))
    assert.equal((await fileDb.findOrderById(res.body.orderId)).status, 'refunded')
    assert.ok(mp.refundCalls.some((c) => c.id === String(payment.id)))
    await waitFor(
      () => mp.mailsTo('otra@test.com').some((m) => /devolvimos/.test(m.body.subject)),
      'el mail de devolución',
    )
  })

  it('builder de prueba: precio fijo en pesos (base, extras y commerce de src/domain/qa.js)', async () => {
    assert.equal(qaCustomPriceArs(RECIPE3), QA_BUILDER_BASE_ARS)
    const ten = Array.from({ length: 10 }, (_, i) => RECIPE3[i % 3])
    assert.equal(qaCustomPriceArs(ten), QA_BUILDER_BASE_ARS + 2 * QA_BUILDER_EXTRA_SECTION_ARS)
    assert.equal(
      qaCustomPriceArs([...RECIPE3, 'commerce/ProductGrid']),
      QA_BUILDER_BASE_ARS + QA_BUILDER_COMMERCE_ARS,
    )

    const agent = await loginAs(QA) // ya compró: precio de lista
    const res = await agent.post('/api/checkout').send({ items: [{ sku: QA_CUSTOM_SKU, recipe: RECIPE3 }] })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const order = await fileDb.findOrderById(res.body.orderId)
    assert.equal(order.total, QA_BUILDER_BASE_ARS)
    assert.match(order.items[0].sku, /^custom:/)
    assert.equal(order.items[0].recipe.length, 3)
    const payment = mp.pay(mp.lastPreference().id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    assert.ok((await fileDb.findOrderById(res.body.orderId)).zipPath)
  })

  it('no se mezcla con productos reales, va de a uno y no se cobra con Paddle', async () => {
    const agent = await loginAs(QA)
    let res = await agent.post('/api/checkout').send({ items: [{ sku: QA_TEMPLATE_SKU }, { sku: 'fizz' }] })
    assert.equal(res.status, 400)
    res = await agent.post('/api/checkout').send({ items: [{ sku: QA_TEMPLATE_SKU }, { sku: QA_CUSTOM_SKU, recipe: RECIPE3 }] })
    assert.equal(res.status, 400)
    res = await agent.post('/api/checkout').send({ items: [{ sku: QA_TEMPLATE_SKU }], provider: 'paddle' })
    assert.equal(res.status, 400)
    res = await agent.post('/api/checkout').send({ items: [{ sku: QA_CUSTOM_SKU, recipe: ['plum/Hero'] }] })
    assert.equal(res.status, 400, 'la receta se valida igual que en el builder real')
  })

  it('LAB de prueba: los tres planes al precio de prueba, sin prueba gratis, cobra al suscribirse y vuelve a /lab-test', async () => {
    const agent = await loginAs(QA)
    const plans = (await agent.get('/api/subscriptions/plans?qa=1')).body
    assert.equal(plans.qa, true)
    assert.ok(plans.plans.every((p) => p.priceMonthly === QA_LAB_PRICE_ARS && p.priceYearly === QA_LAB_PRICE_ARS))

    const res = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly', qa: true })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.trialEndsAt, null)
    const pre = mp.lastPreapproval()
    assert.equal(pre.auto_recurring.transaction_amount, QA_LAB_PRICE_ARS)
    const sent = mp.calls.filter((c) => c.method === 'POST' && c.resource === 'preapproval').at(-1).body
    assert.match(sent.reason, /PRUEBA/)
    assert.match(sent.back_url, /\/lab-test\?suscripcion=volver$/)
    assert.equal(sent.auto_recurring.start_date, undefined, 'sin prueba gratis: cobra al suscribirse')
    const sub = await fileDb.findSubscriptionById(res.body.subscriptionId)
    assert.equal(sub.qa, true)
    assert.equal(sub.trialEndsAt, undefined)

    mp.authorize(pre.id)
    await agent.post('/api/subscriptions/sync')
    const ap = mp.bill(pre.id)
    assert.equal((await webhook('subscription_authorized_payment', ap.id)).status, 200)
    const me = (await agent.get('/api/subscriptions/me')).body
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.qa, true)

    // Cambio de plan: los tres cuestan lo mismo, no hay diferencia que cobrar.
    const quote = (await agent.get('/api/subscriptions/change/quote?plan=hosted_studio')).body
    assert.equal(quote.amount, 0, JSON.stringify(quote))
    const change = await agent.post('/api/subscriptions/change').send({ plan: 'hosted_studio' })
    assert.equal(change.status, 200, JSON.stringify(change.body))
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, QA_LAB_PRICE_ARS)
  })

  it('las métricas del panel no cuentan las compras ni las suscripciones de prueba', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app).get('/api/admin/analytics').set('Host', 'localhost')
    assert.equal(res.status, 200)
    const qaOrders = (await fileDb.listOrders()).filter((o) => o.qa)
    assert.ok(qaOrders.length > 0)
    assert.equal(res.body.orders.total, (await fileDb.listOrders()).length - qaOrders.length)
  })
})
