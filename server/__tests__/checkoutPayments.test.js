import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import {
  createFakeMercadoPago,
  startAppAgainstFakeMp,
  waitFor,
} from './helpers/fakeMercadoPago.js'

/**
 * Pagos de templates contra el MP simulado: lo que pasa después de que el
 * comprador paga. Un segundo pago de la misma orden, un pago cuya orden ya no
 * existe y un reembolso o contracargo le avisan al dueño por mail; el
 * reembolso además corta las descargas.
 */
describe('Pagos de templates (MP simulado)', () => {
  const OWNER = 'owner@scrolllab.test'
  const mp = createFakeMercadoPago()
  let app
  let loginAs
  let webhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ app, loginAs, webhook, cleanup, fileDb } = await startAppAgainstFakeMp(mp))
  })
  after(() => cleanup())

  const alerts = (title) =>
    mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))

  /** Compra hasta la preference de MP; devuelve la orden y la preference. */
  async function checkout(agent, items) {
    const res = await agent.post('/api/checkout').send({ items })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    return { orderId: res.body.orderId, pref: mp.lastPreference() }
  }

  async function paidOrder(email, items = [{ sku: 'chapters' }]) {
    const agent = await loginAs(email)
    const { orderId, pref } = await checkout(agent, items)
    const payment = mp.pay(pref.id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    return { agent, orderId, pref, payment }
  }

  it('la preference lleva lo que pide MP: comprador, descripción, categoría y vencimiento del efectivo', async () => {
    const agent = request.agent(app)
    await agent
      .post('/api/auth/dev-login')
      .send({ email: 'ana@test.com', name: 'Ana María Pérez' })
    const before = Date.now()
    const { pref } = await checkout(agent, [{ sku: 'chapters' }, { sku: 'nocturne' }])

    assert.deepEqual(pref.payer, { email: 'ana@test.com', name: 'Ana', surname: 'María Pérez' })
    assert.equal(pref.items.length, 2)
    for (const item of pref.items) {
      assert.equal(item.category_id, 'virtual_goods')
      assert.ok(item.description && item.description.length <= 250)
    }
    const ticketDays = (Date.parse(pref.date_of_expiration) - before) / 86_400_000
    assert.ok(ticketDays > 2.9 && ticketDays < 3.1, `vence en ${ticketDays} días`)
  })

  it('comprar dos templates juntos: MP cobra la suma y el ZIP trae los dos', async () => {
    const { agent, orderId, payment } = await paidOrder('two@test.com', [
      { sku: 'chapters' },
      { sku: 'nocturne' },
    ])
    const order = await fileDb.findOrderById(orderId)
    assert.equal(order.status, 'paid')
    assert.equal(payment.transaction_amount, order.total)

    const link = await agent.get(`/api/orders/${orderId}/download`)
    assert.equal(link.status, 200)
    const zip = fs.readFileSync(order.zipPath || (await fileDb.findOrderById(orderId)).zipPath)
    const names = zip.toString('latin1')
    assert.ok(names.includes('chapters/package.json'))
    assert.ok(names.includes('nocturne/package.json'))
  })

  it('pagar dos veces la misma orden: queda paga una vez y le llega el aviso al dueño', async () => {
    const { orderId, pref, payment: first } = await paidOrder('twice@test.com')
    const second = mp.pay(pref.id)
    assert.equal((await webhook('payment', second.id)).status, 200)
    assert.equal((await webhook('payment', second.id)).status, 200) // reintento de MP

    const order = await fileDb.findOrderById(orderId)
    assert.equal(order.status, 'paid')
    assert.equal(order.mpPaymentId, String(first.id))

    await waitFor(() => alerts('COMPRA PAGADA DOS VECES').length >= 1, 'el aviso de doble pago')
    const mails = alerts('COMPRA PAGADA DOS VECES')
    assert.ok(mails.every((m) => m.idempotencyKey === `scrolllab-alert-duplicate-${second.id}`))
    assert.match(mails[0].body.text, new RegExp(`pago MP ${second.id}`))
    assert.match(mails[0].body.text, /twice@test\.com/)
    // El primer pago no es un duplicado.
    assert.equal(
      mp.outbox.filter((m) => m.idempotencyKey === `scrolllab-alert-duplicate-${first.id}`).length,
      0,
    )
  })

  it('un pago cuya orden ya no existe avisa con el pago, el monto y el mail para entregar o reembolsar', async () => {
    const agent = await loginAs('late-cash@test.com')
    const { orderId, pref } = await checkout(agent, [{ sku: 'fizz' }])
    // La orden pendiente venció (índice TTL) antes de que se acreditara el pago.
    const file = path.join(process.env.FILE_DB_DIR, 'orders.json')
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'))
    fs.writeFileSync(file, JSON.stringify(rows.filter((r) => r.id !== orderId)))

    const payment = mp.pay(pref.id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    await waitFor(() => alerts('PAGO SIN ORDEN').length === 1, 'el aviso de pago sin orden')
    const [mail] = alerts('PAGO SIN ORDEN')
    assert.match(mail.body.text, new RegExp(`pago MP ${payment.id}`))
    assert.match(mail.body.text, new RegExp(String(payment.transaction_amount)))
    assert.match(mail.body.text, /late-cash@test\.com/)
  })

  it('los cobros de una suscripción de LAB que llegan como `payment` no disparan avisos', async () => {
    const before = alerts('PAGO SIN ORDEN').length
    const agent = await loginAs('lab-payment@test.com')
    await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly' })
    const sub = (await fileDb.findSubscriptionsByUser(
      (await fileDb.findUser({ email: 'lab-payment@test.com' })).id,
    ))[0]
    for (const [id, extra] of [
      ['900001', { operation_type: 'recurring_payment', external_reference: sub.id }],
      ['900002', { operation_type: 'regular_payment', external_reference: sub.id }],
    ]) {
      mp.payments.set(id, {
        id: Number(id),
        status: 'approved',
        transaction_amount: 99900,
        currency_id: 'ARS',
        ...extra,
      })
      assert.equal((await webhook('payment', id)).status, 200)
    }
    await new Promise((r) => setTimeout(r, 100))
    assert.equal(alerts('PAGO SIN ORDEN').length, before)
  })

  it('reembolso del pago: la orden queda reembolsada, no se descarga más y avisa', async () => {
    const { agent, orderId, payment } = await paidOrder('refund@test.com')
    assert.equal((await agent.get(`/api/orders/${orderId}/download`)).status, 200)

    mp.payments.get(String(payment.id)).status = 'refunded'
    assert.equal((await webhook('payment', payment.id)).status, 200)
    const order = await fileDb.findOrderById(orderId)
    assert.equal(order.status, 'refunded')
    assert.equal(order.refundReason, 'refunded')

    const link = await agent.get(`/api/orders/${orderId}/download`)
    assert.equal(link.status, 403)
    assert.match(link.body.error, /reembolsada/)
    const list = await agent.get('/api/orders')
    assert.equal(list.body.orders.find((o) => o.id === orderId).status, 'refunded')
    await waitFor(() => alerts('ORDEN REEMBOLSADA').length === 1, 'el aviso de reembolso')
  })

  it('contracargo: igual que el reembolso, con su propio aviso', async () => {
    const { orderId, payment } = await paidOrder('chargeback@test.com')
    mp.payments.get(String(payment.id)).status = 'charged_back'
    assert.equal((await webhook('payment', payment.id)).status, 200)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'refunded')
    await waitFor(() => alerts('CONTRACARGO').length === 1, 'el aviso de contracargo')
  })

  it('reembolsar el pago duplicado no toca la orden: sigue paga y descargable', async () => {
    const { agent, orderId, pref } = await paidOrder('dup-refund@test.com')
    const duplicate = mp.pay(pref.id)
    await webhook('payment', duplicate.id)

    const refundsBefore = alerts('ORDEN REEMBOLSADA').length
    mp.payments.get(String(duplicate.id)).status = 'refunded'
    assert.equal((await webhook('payment', duplicate.id)).status, 200)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
    assert.equal((await agent.get(`/api/orders/${orderId}/download`)).status, 200)
    await new Promise((r) => setTimeout(r, 100))
    assert.equal(alerts('ORDEN REEMBOLSADA').length, refundsBefore)
  })
})
