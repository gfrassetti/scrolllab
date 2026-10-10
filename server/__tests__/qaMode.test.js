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
  QA_LAB_PRICES_ARS,
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
  let config

  before(async () => {
    process.env.QA_BUYER_EMAILS = ` ${QA.toUpperCase()} , otra@test.com, lab-a@test.com, lab-b@test.com, lab-c@test.com, lab-d@test.com, lab-e@test.com`
    ;({ app, loginAs, webhook, cleanup, fileDb, config } = await startAppAgainstFakeMp(mp))
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

  it('una orden con el pago rechazado se muestra como rechazada, no «confirmando»', async () => {
    const agent = await loginAs(QA)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: QA_TEMPLATE_SKU }] })
    const payment = mp.pay(mp.lastPreference().id, { approved: false })
    assert.equal((await webhook('payment', payment.id)).status, 200)
    const row = (await agent.get('/api/orders')).body.orders.find((o) => o.id === res.body.orderId)
    assert.equal(row.status, 'pending')
    assert.equal(row.paymentFailed, true)
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

  /** Alta de prueba autorizada y con el primer cobro registrado (como MP). */
  async function qaSubscribed(email, plan = 'hosted_pro') {
    const agent = await loginAs(email)
    const res = await agent.post('/api/subscriptions').send({ plan, cycle: 'monthly', qa: true })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const pre = mp.lastPreapproval()
    mp.authorize(pre.id)
    await agent.post('/api/subscriptions/sync')
    const ap = billAndRecord(pre)
    assert.equal((await webhook('subscription_authorized_payment', ap.id)).status, 200)
    return { agent, pre, ap, subscriptionId: res.body.subscriptionId }
  }
  /** MP cobra la cuota y guarda su pago: el arrepentimiento lo devuelve por su id. */
  function billAndRecord(pre) {
    const ap = mp.bill(pre.id)
    mp.payments.set(String(ap.payment.id), {
      id: ap.payment.id,
      status: 'approved',
      operation_type: 'recurring_payment',
      transaction_amount: ap.transaction_amount,
      currency_id: 'ARS',
      external_reference: pre.external_reference,
    })
    return ap
  }
  const refundMails = (email) => mp.mailsTo(email).filter((m) => /devolvimos/i.test(m.body.subject))

  it('LAB de prueba: escalonado, sin prueba gratis, cobra al suscribirse y vuelve a /lab-test', async () => {
    const agent = await loginAs(QA)
    const plans = (await agent.get('/api/subscriptions/plans?qa=1')).body
    assert.equal(plans.qa, true)
    for (const p of plans.plans) {
      assert.equal(p.priceMonthly, QA_LAB_PRICES_ARS[p.id])
      assert.equal(p.priceYearly, QA_LAB_PRICES_ARS[p.id])
    }
    assert.ok(Object.values(QA_LAB_PRICES_ARS).every((n) => n >= 15), 'el piso de MP para suscripciones')

    const { pre, subscriptionId } = await qaSubscribed(QA)
    assert.equal(pre.auto_recurring.transaction_amount, QA_LAB_PRICES_ARS.hosted_pro)
    const sent = mp.calls.filter((c) => c.method === 'POST' && c.resource === 'preapproval').at(-1).body
    assert.match(sent.reason, /PRUEBA/)
    assert.match(sent.back_url, /\/lab-test\?suscripcion=volver$/)
    assert.equal(sent.auto_recurring.start_date, undefined, 'sin prueba gratis: cobra al suscribirse')
    const sub = await fileDb.findSubscriptionById(subscriptionId)
    assert.equal(sub.qa, true)
    assert.equal(sub.trialEndsAt, undefined)
    assert.equal(sub.firstChargeAmount, QA_LAB_PRICES_ARS.hosted_pro)
    const me = (await agent.get('/api/subscriptions/me')).body
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.qa, true)
  })

  it('subir de plan cobra la diferencia (desde $1); bajar no cobra; el arrepentimiento devuelve el primer cobro Y la diferencia', async () => {
    const { agent, pre, ap, subscriptionId } = await qaSubscribed('lab-a@test.com')

    // Subir a Studio: diferencia por los días que quedan (casi el mes entero).
    const quote = (await agent.get('/api/subscriptions/change/quote?plan=hosted_studio')).body
    assert.ok(quote.amount > 0 && quote.amount <= QA_LAB_PRICES_ARS.hosted_studio - QA_LAB_PRICES_ARS.hosted_pro)
    const change = await agent.post('/api/subscriptions/change').send({ plan: 'hosted_studio' })
    assert.equal(change.body.requiresPayment, true, JSON.stringify(change.body))
    const pref = mp.lastPreference()
    assert.equal(pref.items[0].unit_price, quote.amount)
    assert.match(pref.items[0].title, /PRUEBA/)
    assert.match(pref.back_urls.success, /\/lab-test\?upgrade=volver$/, 'vuelve a /lab-test, no al /lab real')
    const upg = mp.pay(pref.id)
    assert.equal((await webhook('payment', upg.id, { source: 'lab' })).status, 200)
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'hosted_studio')
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, QA_LAB_PRICES_ARS.hosted_studio)

    // Bajar a Starter: nada que pagar, desde el próximo cobro el precio de Starter.
    const down = (await agent.get('/api/subscriptions/change/quote?plan=hosted_starter')).body
    assert.equal(down.amount, 0)
    const downChange = await agent.post('/api/subscriptions/change').send({ plan: 'hosted_starter' })
    assert.equal(downChange.status, 200, JSON.stringify(downChange.body))
    assert.notEqual(downChange.body.requiresPayment, true)
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, QA_LAB_PRICES_ARS.hosted_starter)

    // Arrepentimiento dentro de los 14 días: vuelven el primer cobro y la diferencia.
    const w = await agent.post('/api/withdrawals').send({ email: 'lab-a@test.com', name: 'Cliente A' })
    assert.equal(w.body.outcome, 'refunded', JSON.stringify(w.body))
    const refunded = mp.refundCalls.map((c) => c.id)
    assert.ok(refunded.includes(String(ap.payment.id)), 'el primer cobro')
    assert.ok(refunded.includes(String(upg.id)), 'la diferencia de plan')
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'free')
    const ledger = (await fileDb.listRefunds()).filter((r) => r.subscriptionId === subscriptionId)
    assert.deepEqual(ledger.map((r) => r.externalId).sort(), [`mp-${ap.payment.id}`, `mp-${upg.id}`].sort())
    await waitFor(() => refundMails('lab-a@test.com').length === 2, 'los dos mails de devolución')
    // Y nuestro mail de baja (no solo el de MP).
    await waitFor(
      () => mp.mailsTo('lab-a@test.com').some((m) => /Cancelaste tu suscripción/.test(m.body.subject)),
      'el mail de baja',
    )
    const row = await fileDb.findWithdrawalByCode(w.body.code)
    assert.match(row.note, /primer cobro \+ diferencias de plan/)

    // Llega el webhook de MP de esa devolución: no repite nada.
    assert.equal((await webhook('payment', upg.id, { source: 'lab' })).status, 200)
    await new Promise((r) => setTimeout(r, 60))
    assert.equal(refundMails('lab-a@test.com').length, 2)
    assert.equal((await fileDb.listRefunds()).filter((r) => r.subscriptionId === subscriptionId).length, 2)
  })

  it('una diferencia de plan devuelta a mano desde MP queda en el libro y le avisa al cliente', async () => {
    const { agent } = await qaSubscribed('lab-b@test.com', 'hosted_starter')
    await agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
    const upg = mp.pay(mp.lastPreference().id)
    await webhook('payment', upg.id, { source: 'lab' })
    // El dueño la devuelve desde el panel de MP.
    const pay = mp.payments.get(String(upg.id))
    pay.status = 'refunded'
    pay.transaction_amount_refunded = pay.transaction_amount
    assert.equal((await webhook('payment', upg.id, { source: 'lab' })).status, 200)
    assert.ok((await fileDb.listRefunds()).some((r) => r.externalId === `mp-${upg.id}` && r.kind === 'lab'))
    await waitFor(() => refundMails('lab-b@test.com').length === 1, 'el mail de devolución')
    // La suscripción sigue (no era el primer cobro).
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'hosted_pro')
  })

  it('con prueba gratis: el alta no cobra y arrepentirse en la prueba solo da de baja, sin devolver nada', async () => {
    const agent = await loginAs('lab-c@test.com')
    const res = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly', qa: true, qaTrial: true })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.ok(res.body.trialEndsAt, 'tiene prueba')
    const sent = mp.calls.filter((c) => c.method === 'POST' && c.resource === 'preapproval').at(-1).body
    assert.ok(sent.auto_recurring.start_date, 'el primer cobro es al final de la prueba')
    mp.authorize(mp.lastPreapproval().id)
    await agent.post('/api/subscriptions/sync')
    const before = mp.refundCalls.length
    const w = await agent.post('/api/withdrawals').send({ email: 'lab-c@test.com', name: 'Cliente C' })
    assert.equal(w.body.outcome, 'canceled', JSON.stringify(w.body))
    assert.equal(mp.refundCalls.length, before, 'no hay nada que devolver')
  })

  it('arrepentirse antes de que llegue el primer cobro (alta sin prueba): no cancela sin devolver, reintenta', async () => {
    // Cuenta sin suscripciones anteriores: sin días pagos que arrastrar, el alta cobra al autorizar.
    const agent = await loginAs('lab-d@test.com')
    const res = await agent.post('/api/subscriptions').send({ plan: 'hosted_starter', cycle: 'monthly', qa: true })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const pre = mp.lastPreapproval()
    mp.authorize(pre.id)
    await agent.post('/api/subscriptions/sync') // autorizada, pero el aviso del cobro no llegó
    const w = await agent.post('/api/withdrawals').send({ email: 'lab-d@test.com', name: 'Cliente D' })
    assert.equal(w.body.outcome, 'pending', JSON.stringify(w.body))
    assert.equal((await fileDb.findWithdrawalByCode(w.body.code)).status, 'refund_retry')
    assert.equal(mp.preapprovals.get(pre.id).status, 'authorized', 'no la canceló a ciegas')

    // Llega el cobro y el barrido termina el trabajo.
    const ap = billAndRecord(pre)
    await webhook('subscription_authorized_payment', ap.id)
    const { retryPendingWithdrawals } = await import('../services/autoRefund.js')
    await retryPendingWithdrawals(config)
    assert.equal((await fileDb.findWithdrawalByCode(w.body.code)).status, 'refunded')
    assert.ok(mp.refundCalls.some((c) => c.id === String(ap.payment.id)))
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
  })

  it('cupo: bajar de plan con más publicados que el cupo nuevo se rechaza; dado de baja, queda solo el del plan gratis', async () => {
    const { default: request } = await import('supertest')
    const { agent } = await qaSubscribed('lab-e@test.com', 'hosted_pro')
    const sections = ['chapters/FooterCTA', 'nocturne/OutroCTA', 'fizz/FooterSplash', 'atrium/FooterAtrium', 'chapters/BigNumbers', 'velocity/HelmetGrid']
    const keys = []
    const ids = []
    for (const sectionId of sections) {
      const created = await agent.post('/api/hosted').send({ sectionId })
      assert.equal(created.status, 201, JSON.stringify(created.body))
      const pub = await agent.put(`/api/hosted/${created.body.instance.id}`).send({ publish: true })
      assert.equal(pub.status, 200, JSON.stringify(pub.body))
      ids.push(created.body.instance.id)
      keys.push(created.body.instance.key)
      await new Promise((r) => setTimeout(r, 5)) // createdAt distinto: queda el más viejo
    }

    // 6 publicados en Pro → Starter permite 5: no deja bajar y dice cuántos despublicar.
    const quote = await agent.get('/api/subscriptions/change/quote?plan=hosted_starter')
    assert.equal(quote.status, 402)
    assert.match(quote.body.error, /Despublicá 1 antes de bajar de plan/)
    assert.equal((await agent.post('/api/subscriptions/change').send({ plan: 'hosted_starter' })).status, 402)

    // Despublica uno (elige cuál) y ahí sí.
    await agent.put(`/api/hosted/${ids[5]}`).send({ unpublish: true })
    assert.equal((await agent.post('/api/subscriptions/change').send({ plan: 'hosted_starter' })).status, 200)

    // Se arrepiente: baja inmediata → plan gratis (1). Solo el más viejo sigue en los sitios.
    const w = await agent.post('/api/withdrawals').send({ email: 'lab-e@test.com', name: 'Cliente E' })
    assert.equal(w.body.outcome, 'refunded', JSON.stringify(w.body))
    const served = []
    for (const key of keys.slice(0, 5)) {
      served.push((await request(app).get(`/api/embed/${key}/config`)).status)
    }
    assert.deepEqual(served, [200, 402, 402, 402, 402])
    // Y no puede publicar otro.
    assert.equal((await agent.put(`/api/hosted/${ids[5]}`).send({ publish: true })).status, 402)
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
