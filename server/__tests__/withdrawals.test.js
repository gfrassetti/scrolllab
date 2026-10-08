import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import {
  createFakeMercadoPago,
  startAppAgainstFakeMp,
  waitFor,
} from './helpers/fakeMercadoPago.js'
import { refundEligibility, labRefundEligibility, REFUND_DAYS } from '../../src/domain/policy.js'

const DAY = 86_400_000

/**
 * Elegibilidad del reembolso por arrepentimiento (pura) y el botón de
 * arrepentimiento (Res. 424/2020): público, sin cuenta, con código de
 * seguimiento, mail al cliente y aviso al dueño con el veredicto del reembolso.
 */
describe('refundEligibility', () => {
  const now = Date.parse('2026-10-20T12:00:00Z')
  const paid = (extra = {}) => ({
    status: 'paid',
    paidAt: new Date(now - 3 * DAY).toISOString(),
    downloadCount: 0,
    ...extra,
  })

  it('pagada, dentro del plazo y sin descargar: elegible, con su fecha límite', () => {
    const r = refundEligibility(paid(), { now })
    assert.equal(r.eligible, true)
    assert.equal(r.reason, 'ok')
    assert.equal(r.days, REFUND_DAYS)
    assert.equal(r.deadline, new Date(now - 3 * DAY + REFUND_DAYS * DAY).toISOString())
  })

  it('el ZIP descargado corta el reembolso por arrepentimiento', () => {
    const r = refundEligibility(paid({ downloadCount: 1 }), { now })
    assert.deepEqual([r.eligible, r.reason, r.downloads], [false, 'downloaded', 1])
  })

  it('pasado el plazo no hay reembolso (aunque no haya descargado)', () => {
    const old = paid({ paidAt: new Date(now - (REFUND_DAYS + 1) * DAY).toISOString() })
    assert.equal(refundEligibility(old, { now }).reason, 'expired')
    // El último día todavía vale.
    const edge = paid({ paidAt: new Date(now - REFUND_DAYS * DAY + 60_000).toISOString() })
    assert.equal(refundEligibility(edge, { now }).eligible, true)
  })

  it('pendiente, reembolsada o inexistente: no elegible, cada una con su motivo', () => {
    assert.equal(refundEligibility({ status: 'pending' }, { now }).reason, 'not_paid')
    assert.equal(refundEligibility({ status: 'refunded' }, { now }).reason, 'refunded')
    assert.equal(refundEligibility(null, { now }).reason, 'no_order')
  })

  it('órdenes viejas sin paidAt cuentan desde que se crearon', () => {
    const legacy = { status: 'paid', createdAt: new Date(now - 2 * DAY).toISOString() }
    assert.equal(refundEligibility(legacy, { now }).eligible, true)
  })
})

describe('labRefundEligibility', () => {
  const now = Date.parse('2026-10-20T12:00:00Z')
  const ago = (d) => new Date(now - d * DAY).toISOString()

  it('en la prueba no hay cobro: alcanza con cancelar', () => {
    assert.equal(labRefundEligibility({ activatedAt: ago(3) }, { now }).reason, 'trial')
  })
  it('primer cobro dentro de los 14 días desde el alta (prueba adentro): elegible', () => {
    const r = labRefundEligibility({ activatedAt: ago(9), firstPaidAt: ago(2), lastPaidAt: ago(2) }, { now })
    assert.equal(r.eligible, true)
    assert.equal(r.deadline, new Date(now - 9 * DAY + REFUND_DAYS * DAY).toISOString())
  })
  it('el plazo corre desde el alta, no desde el cobro: día 15 ya no', () => {
    const r = labRefundEligibility({ activatedAt: ago(REFUND_DAYS + 1), firstPaidAt: ago(REFUND_DAYS - 6), lastPaidAt: ago(REFUND_DAYS - 6) }, { now })
    assert.equal(r.reason, 'expired')
  })
  it('las renovaciones no se devuelven', () => {
    const r = labRefundEligibility({ activatedAt: ago(40), firstPaidAt: ago(33), lastPaidAt: ago(3) }, { now })
    assert.equal(r.reason, 'renewal')
  })
  it('sin suscripción', () => {
    assert.equal(labRefundEligibility(null, { now }).reason, 'no_subscription')
  })
})

describe('Botón de arrepentimiento (MP simulado)', () => {
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

  const alerts = (title) => mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))
  const withdraw = (body) => request(app).post('/api/withdrawals').send(body)
  /** Mails de arrepentimiento que recibió un cliente (aparte del recibo de su compra). */
  const confirmations = (email) =>
    mp.mailsTo(email).filter((m) => /arrepentimiento|withdrawal request/i.test(m.body.subject))

  async function paidOrder(email) {
    const agent = await loginAs(email)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }] })
    assert.equal(res.status, 200)
    const payment = mp.pay(mp.lastPreference().id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    return { agent, orderId: res.body.orderId }
  }

  /** Baja el ZIP de verdad (link firmado + archivo): el contador sube con el archivo, no con el link. */
  async function download(agent, orderId) {
    const link = await agent.get(`/api/orders/${orderId}/download`)
    assert.equal(link.status, 200)
    const file = await agent.get(new URL(link.body.url, 'http://x').pathname + new URL(link.body.url, 'http://x').search)
    assert.equal(file.status, 200)
  }

  const ordersOf = async (agent) => (await agent.get('/api/orders')).body.orders

  it('al cobrar la orden queda con paidAt, y «Mis compras» dice que el reembolso está disponible', async () => {
    const { agent, orderId } = await paidOrder('eleg@test.com')
    const order = await fileDb.findOrderById(orderId)
    assert.ok(order.paidAt)
    const [mine] = await ordersOf(agent)
    assert.equal(mine.refund.eligible, true)
    assert.equal(mine.refund.reason, 'ok')
    assert.equal(mine.refund.downloads, 0)
    const left = (Date.parse(mine.refund.deadline) - Date.now()) / DAY
    assert.ok(left > REFUND_DAYS - 0.1 && left <= REFUND_DAYS, String(left))
  })

  it('descargar el ZIP cierra el reembolso: «Mis compras» lo refleja', async () => {
    const { agent, orderId } = await paidOrder('baja@test.com')
    // Pedir solo el link no cuenta: tiene que bajarse el archivo.
    const link = await agent.get(`/api/orders/${orderId}/download`)
    assert.equal(link.status, 200)
    assert.equal((await ordersOf(agent))[0].refund.eligible, true)
    await download(agent, orderId)
    const [after] = await ordersOf(agent)
    assert.equal(after.refund.eligible, false)
    assert.equal(after.refund.reason, 'downloaded')
    assert.equal(after.downloadCount, 1)
  })

  const confirmMails = (email) => mp.mailsTo(email).filter((m) => /Confirmá la devolución|Confirm the refund/.test(m.body.subject))
  const refundMails = (email) => mp.mailsTo(email).filter((m) => /devolvimos/.test(m.body.subject))
  const tokenFrom = (mail) => decodeURIComponent(mail.body.text.match(/confirmar=([^\s]+)/)[1])
  const confirm = (token) => request(app).post('/api/withdrawals/confirm').send({ token })

  it('sin sesión: no filtra nada, manda el link de confirmación y al confirmar se devuelve solo', async () => {
    const { agent, orderId } = await paidOrder('cliente@test.com')
    const res = await withdraw({ email: 'Cliente@Test.com', name: 'Ana Pérez', order: orderId.slice(-8), message: 'No era lo que esperaba' })
    assert.equal(res.status, 201)
    assert.match(res.body.code, /^ARR-[A-Z2-9]{6}$/)
    assert.deepEqual(res.body, { ok: true, code: res.body.code, outcome: 'check_email' })

    await waitFor(() => alerts(res.body.code).length >= 1, 'el aviso al dueño')
    const text = alerts(`solicitud ${res.body.code}`)[0].body.text
    assert.match(text, /ELEGIBLE — se devuelve solo/)
    assert.match(text, /link para confirmar/)
    assert.match(text, new RegExp(`orden ${orderId}`))
    assert.match(text, /No era lo que esperaba/)

    await waitFor(() => confirmMails('cliente@test.com').length === 1, 'el link de confirmación')
    const mail = confirmMails('cliente@test.com')[0]
    assert.match(mail.body.text, /CHAPTERS/)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'paid') // todavía no

    const ok = await confirm(tokenFrom(mail))
    assert.deepEqual(ok.body, { ok: true, code: res.body.code, outcome: 'refunded' })
    assert.equal((await fileDb.findOrderById(orderId)).status, 'refunded')
    assert.equal((await agent.get(`/api/orders/${orderId}/download`)).status, 403)
    assert.equal(mp.refundCalls.filter((c) => c.key === `scrolllab-withdrawal-${res.body.code}`).length, 1)
    await waitFor(() => refundMails('cliente@test.com').length === 1, 'el mail «Te devolvimos el dinero»')
    await waitFor(() => alerts('DEVUELTO AUTOMÁTICAMENTE').some((m) => m.body.subject.includes(res.body.code)), 'el aviso de la devolución')

    // Tocar el link otra vez no devuelve dos veces.
    const again = await confirm(tokenFrom(mail))
    assert.equal(again.body.outcome, 'refunded')
    assert.equal(mp.refundCalls.filter((c) => c.key === `scrolllab-withdrawal-${res.body.code}`).length, 1)
  })

  it('un link adulterado o vencido no devuelve nada', async () => {
    const { orderId } = await paidOrder('adulterado@test.com')
    const res = await withdraw({ email: 'adulterado@test.com', name: 'Ana', order: orderId })
    await waitFor(() => confirmMails('adulterado@test.com').length === 1, 'el link')
    const token = tokenFrom(confirmMails('adulterado@test.com')[0])
    const bad = await confirm(token.slice(0, -2) + (token.endsWith('A') ? 'BB' : 'AA'))
    assert.equal(bad.status, 400)
    assert.equal((await confirm('basura')).status, 400)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
    assert.ok(res.body.code)
  })

  it('con la sesión de la cuenta de la compra: se devuelve al instante, sin link', async () => {
    const { agent, orderId } = await paidOrder('sesion@test.com')
    const res = await agent.post('/api/withdrawals').send({ email: 'sesion@test.com', name: 'Ses', order: orderId })
    assert.equal(res.body.outcome, 'refunded')
    assert.equal((await fileDb.findOrderById(orderId)).status, 'refunded')
    assert.equal(confirmMails('sesion@test.com').length, 0)
    await waitFor(() => refundMails('sesion@test.com').length === 1, 'el mail de devolución')
  })

  it('si Mercado Pago no puede devolver (saldo), queda para el dueño y se lo avisa', async () => {
    const { agent, orderId } = await paidOrder('sinsaldo@test.com')
    mp.refundFails = 'Insufficient balance'
    try {
      const res = await agent.post('/api/withdrawals').send({ email: 'sinsaldo@test.com', name: 'Sin', order: orderId })
      assert.equal(res.body.outcome, 'review')
      assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
      await waitFor(() => alerts('NO SE PUDO DEVOLVER SOLO').some((m) => m.body.text.includes('Insufficient balance')), 'el aviso')
    } finally {
      mp.refundFails = null
    }
  })

  it('con el ZIP descargado no se devuelve solo: lo revisa el dueño (NO elegible y por qué)', async () => {
    const { agent, orderId } = await paidOrder('bajo@test.com')
    await download(agent, orderId)
    const res = await agent.post('/api/withdrawals').send({ email: 'bajo@test.com', name: 'Beto', order: orderId })
    assert.equal(res.body.outcome, 'review')
    await waitFor(() => alerts(res.body.code).length === 1, 'el aviso al dueño')
    const text = alerts(res.body.code)[0].body.text
    assert.match(text, /NO elegible por arrepentimiento: el ZIP se descargó 1 vez/)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
    await waitFor(() => confirmations('bajo@test.com').some((m) => /Recibimos tu solicitud/.test(m.body.subject)), 'el código por mail')
  })

  it('pedirlo dos veces el mismo día devuelve el mismo código y manda un solo link', async () => {
    const { orderId } = await paidOrder('doble@test.com')
    const a = await withdraw({ email: 'doble@test.com', name: 'Doble', order: orderId.slice(-8) })
    const b = await withdraw({ email: 'doble@test.com', name: 'Doble', order: orderId.slice(-8) })
    assert.equal(a.status, 201)
    assert.equal(b.status, 200)
    assert.equal(b.body.code, a.body.code)
    await waitFor(() => confirmMails('doble@test.com').length >= 1, 'el link')
    await new Promise((r) => setTimeout(r, 100))
    assert.equal(confirmMails('doble@test.com').length, 1)
  })

  it('un mail que no es el de la compra no asocia nada y la respuesta es la misma (no filtra)', async () => {
    const { orderId } = await paidOrder('dueno@test.com')
    const res = await withdraw({ email: 'otro@test.com', name: 'Otro', order: orderId })
    assert.deepEqual(Object.keys(res.body).sort(), ['code', 'ok', 'outcome'])
    assert.equal(res.body.outcome, 'check_email')
    await waitFor(() => alerts(res.body.code).length === 1, 'el aviso')
    assert.match(alerts(res.body.code)[0].body.text, /SIN COMPRA/)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
    const ghost = await withdraw({ email: 'dueno@test.com', name: 'Dueño', order: 'ffffffff' })
    assert.equal(ghost.body.outcome, 'check_email')
  })

  it('sin compra ni suscripción: lo revisa el dueño, el código sale por mail (en inglés si corresponde)', async () => {
    const res = await withdraw({ email: 'nadie@test.com', name: 'Lab User', locale: 'en', message: 'LAB subscription' })
    assert.equal(res.status, 201)
    await waitFor(() => confirmations('nadie@test.com').length === 1, 'el mail')
    const mail = confirmations('nadie@test.com')[0].body
    assert.match(mail.subject, /We received your withdrawal request/)
    assert.match(mail.text, new RegExp(res.body.code))
    await waitFor(() => alerts(res.body.code).length === 1, 'el aviso')
    assert.match(alerts(res.body.code)[0].body.text, /SIN COMPRA/)
  })

  describe('LAB', () => {
    async function subscribed(email) {
      const agent = await loginAs(email)
      const res = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly' })
      assert.equal(res.status, 200, JSON.stringify(res.body))
      const pre = mp.lastPreapproval()
      mp.authorize(pre.id)
      await agent.post('/api/subscriptions/sync')
      return { agent, pre, subscriptionId: res.body.subscriptionId }
    }

    it('en la prueba gratis: arrepentirse da de baja la suscripción (no hay nada que devolver)', async () => {
      const { agent, pre, subscriptionId } = await subscribed('lab-prueba@test.com')
      const res = await agent.post('/api/withdrawals').send({ email: 'lab-prueba@test.com', name: 'Lab' })
      assert.equal(res.body.outcome, 'canceled')
      assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
      assert.ok((await fileDb.findSubscriptionById(subscriptionId)).canceledAt)
      assert.equal(refundMails('lab-prueba@test.com').length, 0)
    })

    it('con el primer cobro en plazo: se devuelve ese cobro y la suscripción se da de baja ya', async () => {
      const { agent, pre, subscriptionId } = await subscribed('lab-cobro@test.com')
      const ap = mp.bill(pre.id)
      assert.equal((await webhook('subscription_authorized_payment', ap.id)).status, 200)
      // El pago de la cuota, como lo devuelve MP.
      mp.payments.set(String(ap.payment.id), {
        id: ap.payment.id,
        status: 'approved',
        operation_type: 'recurring_payment',
        transaction_amount: ap.transaction_amount,
        currency_id: ap.currency_id,
        external_reference: pre.external_reference,
      })
      const res = await agent.post('/api/withdrawals').send({ email: 'lab-cobro@test.com', name: 'Lab' })
      assert.equal(res.body.outcome, 'refunded')
      assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
      assert.equal((await fileDb.findSubscriptionById(subscriptionId)).status, 'cancelled')
      assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'free')
      await waitFor(() => refundMails('lab-cobro@test.com').length === 1, 'el mail de devolución')
    })
  })

  it('valida lo mínimo: mail válido y nombre', async () => {
    assert.equal((await withdraw({ email: 'no-es-un-mail', name: 'Ana' })).status, 400)
    assert.equal((await withdraw({ email: 'ana@test.com', name: ' ' })).status, 400)
    assert.equal((await withdraw({})).status, 400)
    const bad = await withdraw({ email: 'ana@test.com', name: '' })
    assert.match(bad.body.error, /nombre/i)
  })

  it('el reembolso aprobado de una compra sin descargar la deja reembolsada y «Mis compras» no ofrece más', async () => {
    const { agent, orderId, } = await paidOrder('reemb@test.com')
    const payment = [...mp.payments.values()].at(-1)
    mp.payments.get(String(payment.id)).status = 'refunded'
    assert.equal((await webhook('payment', payment.id)).status, 200)
    const [mine] = await ordersOf(agent)
    assert.equal(mine.status, 'refunded')
    assert.equal(mine.refund.eligible, false)
    assert.equal(mine.refund.reason, 'refunded')
    assert.ok(orderId)
  })
})
