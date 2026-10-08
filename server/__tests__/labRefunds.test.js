import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeMercadoPago, startAppAgainstFakeMp, waitFor } from './helpers/fakeMercadoPago.js'
import { startAppAgainstFakePaddle } from './helpers/fakePaddle.js'

/**
 * Devoluciones de LAB (política: solo el primer cobro; al devolverlo, baja
 * inmediata) en las dos pasarelas: el cobro devuelto queda en el libro, al
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

describe('LAB con Paddle: devolución de cuotas', () => {
  let pd
  let mp
  let loginAs
  let paddleWebhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ pd, mp, loginAs, paddleWebhook, cleanup, fileDb } = await startAppAgainstFakePaddle({ HOSTED_TRIAL_DAYS: '7' }))
  })
  after(() => cleanup())

  const alerts = (title) => mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))

  async function subscribedAndCharged(email) {
    const agent = await loginAs(email)
    const out = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly', provider: 'paddle' })
    assert.equal(out.status, 200, JSON.stringify(out.body))
    const { txn, sub } = pd.pay(out.body.transactionId)
    await paddleWebhook('transaction.completed', txn)
    await paddleWebhook('subscription.created', sub)
    const charge = async () => {
      const t = pd.renew(sub.id)
      await paddleWebhook('subscription.updated', pd.subscriptions.get(sub.id))
      await paddleWebhook('transaction.completed', t)
      return t
    }
    const first = await charge() // fin de la prueba: primer cobro
    return { agent, psub: sub, first, charge, subscriptionId: out.body.subscriptionId }
  }

  it('devolver el primer cobro: baja inmediata en Paddle y acá, mail y aviso', async () => {
    const { agent, psub, first, subscriptionId } = await subscribedAndCharged('pd-primer@test.com')
    assert.equal((await fileDb.findSubscriptionById(subscriptionId)).firstChargeId, first.id)

    assert.equal((await paddleWebhook('adjustment.updated', pd.adjust(first.id))).status, 200)
    assert.equal(pd.subscriptions.get(psub.id).status, 'canceled')
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'free')
    const ledger = (await fileDb.listRefunds()).filter((r) => r.subscriptionId === subscriptionId)
    assert.deepEqual([ledger.length, ledger[0].kind, ledger[0].currency], [1, 'lab', 'USD'])
    await waitFor(() => refundMails(mp.outbox, 'pd-primer@test.com').length === 1, 'el mail de devolución')
    await waitFor(() => alerts('DEVOLUCIÓN DEL PRIMER COBRO').length >= 1, 'el aviso al dueño')
  })

  it('si Paddle activa la prueba antes de tiempo (origin subscription_update), ese es el primer cobro', async () => {
    const agent = await loginAs('pd-activa@test.com')
    const out = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly', provider: 'paddle' })
    const { txn, sub } = pd.pay(out.body.transactionId)
    await paddleWebhook('transaction.completed', txn)
    await paddleWebhook('subscription.created', sub)
    const early = pd.renew(sub.id)
    early.origin = 'subscription_update'
    await paddleWebhook('transaction.completed', early)
    assert.equal((await fileDb.findSubscriptionById(out.body.subscriptionId)).firstChargeId, early.id)
    await paddleWebhook('adjustment.updated', pd.adjust(early.id))
    assert.equal(pd.subscriptions.get(sub.id).status, 'canceled')
  })

  it('devolver una renovación: la suscripción sigue', async () => {
    const { agent, psub, charge } = await subscribedAndCharged('pd-renov@test.com')
    const second = await charge()
    await paddleWebhook('adjustment.updated', pd.adjust(second.id))
    assert.equal(pd.subscriptions.get(psub.id).status, 'active')
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'hosted_pro')
    await waitFor(() => alerts('DEVOLUCIÓN DE UNA CUOTA').length >= 1, 'el aviso al dueño')
  })

  it('un contracargo da de baja aunque no sea el primer cobro, sin mail de devolución al cliente', async () => {
    const { agent, psub, charge } = await subscribedAndCharged('pd-contracargo@test.com')
    const second = await charge()
    await paddleWebhook('adjustment.updated', pd.adjust(second.id, { action: 'chargeback' }))
    assert.equal(pd.subscriptions.get(psub.id).status, 'canceled')
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'free')
    await waitFor(() => alerts('CONTRACARGO').length >= 1, 'el aviso al dueño')
    assert.equal(refundMails(mp.outbox, 'pd-contracargo@test.com').length, 0)
  })
})

describe('Botón de arrepentimiento con Paddle: devolución automática', () => {
  let pd
  let mp
  let loginAs
  let paddleWebhook
  let cleanup
  let fileDb
  let config

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ pd, mp, loginAs, paddleWebhook, cleanup, fileDb, config } = await startAppAgainstFakePaddle({ HOSTED_TRIAL_DAYS: '7' }))
  })
  after(() => cleanup())

  async function paidOrder(email) {
    const agent = await loginAs(email)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }], provider: 'paddle' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const { txn } = pd.pay(res.body.transactionId)
    await paddleWebhook('transaction.completed', txn)
    return { agent, orderId: res.body.orderId, txn }
  }

  it('compra sin descargar, pedida desde su cuenta: Paddle aprueba y la orden se corta al instante', async () => {
    const { agent, orderId, txn } = await paidOrder('pd-arr@test.com')
    const res = await agent.post('/api/withdrawals').send({ email: 'pd-arr@test.com', name: 'Ana', order: orderId })
    assert.equal(res.body.outcome, 'refunded')
    const adj = pd.adjustmentsCreated.at(-1)
    assert.deepEqual([adj.transaction_id, adj.type, adj.action], [txn.id, 'full', 'refund'])
    assert.match(adj.reason, new RegExp(res.body.code))
    assert.equal((await fileDb.findOrderById(orderId)).status, 'refunded')
    await waitFor(() => refundMails(mp.outbox, 'pd-arr@test.com').length === 1, 'el mail de devolución')
    // El webhook de Paddle llega después: no repite nada.
    await paddleWebhook('adjustment.updated', adj)
    await new Promise((r) => setTimeout(r, 80))
    assert.equal(refundMails(mp.outbox, 'pd-arr@test.com').length, 1)
  })

  it('si Paddle la deja en revisión, queda pendiente y se aplica con su webhook', async () => {
    const { agent, orderId } = await paidOrder('pd-rev@test.com')
    pd.adjustmentStatus = 'pending_approval'
    try {
      const res = await agent.post('/api/withdrawals').send({ email: 'pd-rev@test.com', name: 'Ana', order: orderId })
      assert.equal(res.body.outcome, 'pending')
      assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
      const adj = pd.adjustmentsCreated.at(-1)
      await paddleWebhook('adjustment.updated', { ...adj, status: 'approved' })
      assert.equal((await fileDb.findOrderById(orderId)).status, 'refunded')
    } finally {
      pd.adjustmentStatus = 'approved'
    }
  })

  it('si Paddle todavía no completó el cobro, el barrido reintenta y devuelve', async () => {
    const { agent, orderId, txn } = await paidOrder('pd-retry@test.com')
    pd.transactions.get(txn.id).status = 'paid'
    const res = await agent.post('/api/withdrawals').send({ email: 'pd-retry@test.com', name: 'Ana', order: orderId })
    assert.equal(res.body.outcome, 'pending')
    assert.equal((await fileDb.findWithdrawalByCode(res.body.code)).status, 'refund_retry')
    pd.transactions.get(txn.id).status = 'completed'
    const { retryPendingWithdrawals } = await import('../services/autoRefund.js')
    await retryPendingWithdrawals(config)
    assert.equal((await fileDb.findWithdrawalByCode(res.body.code)).status, 'refunded')
    assert.equal((await fileDb.findOrderById(orderId)).status, 'refunded')
  })

  it('LAB con el primer cobro en plazo: se devuelve y se da de baja en Paddle', async () => {
    const agent = await loginAs('pd-lab-arr@test.com')
    const out = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly', provider: 'paddle' })
    const { txn, sub } = pd.pay(out.body.transactionId)
    await paddleWebhook('transaction.completed', txn)
    await paddleWebhook('subscription.created', sub)
    const first = pd.renew(sub.id)
    await paddleWebhook('transaction.completed', first)
    const res = await agent.post('/api/withdrawals').send({ email: 'pd-lab-arr@test.com', name: 'Lab' })
    assert.equal(res.body.outcome, 'refunded')
    assert.equal(pd.adjustmentsCreated.at(-1).transaction_id, first.id)
    assert.equal(pd.subscriptions.get(sub.id).status, 'canceled')
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'free')
  })
})
