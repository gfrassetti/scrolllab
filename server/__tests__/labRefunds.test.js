import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeMercadoPago, startAppAgainstFakeMp, waitFor } from './helpers/fakeMercadoPago.js'

/**
 * Devoluciones de LAB (política: solo el primer cobro; al devolverlo, baja
 * inmediata) con Mercado Pago (Lemon Squeezy: lemonLab.test.js): el cobro devuelto queda en el libro, al
 * cliente le llega «Te devolvimos el dinero», al dueño el aviso, y la
 * suscripción se da de baja en la pasarela y acá. Una cuota posterior devuelta a
 * mano (excepción) se anota y avisa, pero la suscripción sigue.
 */
const OWNER = 'owner@scrolllab.test'
const refundMails = (outbox, email) =>
  outbox.filter((m) => m.body?.to?.includes(email) && /devolvimos|refunded/i.test(m.body.subject))

describe('LAB con Mercado Pago: devolución de cuotas', () => {
  const mp = createFakeMercadoPago()
  let loginAs
  let webhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ loginAs, webhook, cleanup, fileDb } = await startAppAgainstFakeMp(mp))
  })
  after(() => cleanup())

  const alerts = (title) => mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))

  async function subscribedAndCharged(email) {
    const agent = await loginAs(email)
    const res = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const pre = mp.lastPreapproval()
    mp.authorize(pre.id)
    await agent.post('/api/subscriptions/sync')
    const charge = async () => {
      const ap = mp.bill(pre.id)
      assert.equal((await webhook('subscription_authorized_payment', ap.id)).status, 200)
      return ap
    }
    const first = await charge()
    return { agent, pre, first, charge, subscriptionId: res.body.subscriptionId }
  }

  /** MP devuelve el pago de una cuota y avisa por el webhook de pagos. */
  async function mpRefunds(ap, pre) {
    const id = String(ap.payment.id)
    mp.payments.set(id, {
      id: ap.payment.id,
      status: 'refunded',
      operation_type: 'recurring_payment',
      transaction_amount: ap.transaction_amount,
      transaction_amount_refunded: ap.transaction_amount,
      currency_id: ap.currency_id,
      external_reference: pre.external_reference,
    })
    assert.equal((await webhook('payment', id)).status, 200)
  }

  it('devolver el primer cobro: baja inmediata en MP y acá, mail al cliente y aviso al dueño', async () => {
    const { agent, pre, first, subscriptionId } = await subscribedAndCharged('mp-primer@test.com')
    const row = await fileDb.findSubscriptionById(subscriptionId)
    assert.equal(row.firstChargeId, String(first.payment.id))
    assert.ok(row.firstPaidAt)

    await mpRefunds(first, pre)
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'free')
    assert.equal((await fileDb.findSubscriptionById(subscriptionId)).status, 'cancelled')

    const ledger = (await fileDb.listRefunds()).filter((r) => r.externalId === `mp-${first.payment.id}`)
    assert.equal(ledger.length, 1)
    assert.deepEqual([ledger[0].kind, ledger[0].amount, ledger[0].currency], ['lab', first.transaction_amount, 'ARS'])
    await waitFor(() => refundMails(mp.outbox, 'mp-primer@test.com').length === 1, 'el mail de devolución')
    assert.match(refundMails(mp.outbox, 'mp-primer@test.com')[0].body.text, /dada de baja/)
    await waitFor(() => alerts('DEVOLUCIÓN DEL PRIMER COBRO').length >= 1, 'el aviso al dueño')

    // El mismo webhook otra vez: nada nuevo.
    await mpRefunds(first, pre)
    await new Promise((r) => setTimeout(r, 80))
    assert.equal(refundMails(mp.outbox, 'mp-primer@test.com').length, 1)
  })

  // MP manda el cobro por dos webhooks y el de la cuota puede tardar horas: con
  // solo el de `payment`, la suscripción ya tiene su primer cobro (antes
  // figuraba «sin cobro» y el arrepentimiento la tomaba por prueba gratis).
  it('el cobro llega primero por el webhook payment: queda anotado y la cuota después no lo vuelve renovación', async () => {
    const agent = await loginAs('mp-payment-first@test.com')
    const res = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly' })
    const pre = mp.lastPreapproval()
    mp.authorize(pre.id)
    await agent.post('/api/subscriptions/sync')
    const ap = mp.bill(pre.id)
    assert.equal((await webhook('payment', String(ap.payment.id))).status, 200)
    let row = await fileDb.findSubscriptionById(res.body.subscriptionId)
    assert.equal(row.firstChargeId, String(ap.payment.id))
    assert.ok(row.firstPaidAt && row.lastPaidAt)
    const { labRefundEligibility } = await import('../../src/domain/policy.js')
    assert.equal(labRefundEligibility(row).reason, 'ok')

    // Llega la cuota del mismo cobro (y MP repite el de payment): nada cambia.
    assert.equal((await webhook('subscription_authorized_payment', ap.id)).status, 200)
    assert.equal((await webhook('payment', String(ap.payment.id))).status, 200)
    row = await fileDb.findSubscriptionById(res.body.subscriptionId)
    assert.equal(labRefundEligibility(row).reason, 'ok', 'el mismo cobro no es una renovación')
    assert.equal(row.firstChargeId, String(ap.payment.id))
  })

  it('arrepentimiento sin cobro anotado: se le pregunta a MP y el primer cobro se devuelve', async () => {
    const agent = await loginAs('mp-arr-sync@test.com')
    const res = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly' })
    const pre = mp.lastPreapproval()
    mp.authorize(pre.id)
    await agent.post('/api/subscriptions/sync')
    const ap = mp.bill(pre.id) // MP cobró, pero no llegó ningún webhook del cobro

    // El formulario ya no dice «prueba gratis»: muestra el cobro devolvible.
    const opts = await agent.get('/api/withdrawals/options')
    const lab = opts.body.options.find((o) => o.kind === 'lab')
    assert.equal(lab.reason, 'ok', JSON.stringify(lab))

    const out = await agent.post('/api/withdrawals').send({ email: 'mp-arr-sync@test.com', name: 'Lab', order: 'LAB' })
    assert.equal(out.body.outcome, 'refunded', JSON.stringify(out.body))
    assert.equal(mp.refundCalls.at(-1).id, String(ap.payment.id))
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
    assert.equal((await fileDb.findSubscriptionById(res.body.subscriptionId)).firstChargeId, String(ap.payment.id))
  })

  it('devolver una renovación (excepción a mano): se anota y avisa, la suscripción sigue', async () => {
    const { agent, pre, charge, subscriptionId } = await subscribedAndCharged('mp-renov@test.com')
    const second = await charge()
    await mpRefunds(second, pre)
    assert.equal(mp.preapprovals.get(pre.id).status, 'authorized')
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'hosted_pro')
    assert.equal((await fileDb.findSubscriptionById(subscriptionId)).status, 'authorized')
    await waitFor(() => alerts('DEVOLUCIÓN DE UNA CUOTA').length >= 1, 'el aviso al dueño')
    await waitFor(() => refundMails(mp.outbox, 'mp-renov@test.com').length === 1, 'el mail de devolución')
  })
})
