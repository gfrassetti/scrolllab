import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { waitFor } from './helpers/fakeMercadoPago.js'
import { startAppAgainstFakePolar } from './helpers/fakePolar.js'
import { HOSTED_PLANS } from '../catalog.js'

/**
 * LAB cobrado por Polar (USD), contra el Polar simulado y con el reloj simulado: alta
 * con y sin prueba, primer cobro, renovación, cuota rechazada, baja, cambio de plan,
 * arrepentimiento del primer cobro (por la API) y devoluciones hechas desde el panel.
 */
describe('LAB con Polar (reloj simulado)', () => {
  const HOUR = 3_600_000
  const DAY = 24 * HOUR
  const T0 = Date.parse('2026-10-01T15:00:00.000Z')
  const OWNER = 'owner@scrolllab.test'

  let pl
  let mp
  let loginAs
  let polarWebhook
  let cleanup
  let config
  let fileDb
  let executeWithdrawal

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    mock.timers.enable({ apis: ['Date'], now: T0 })
    ;({ pl, mp, loginAs, polarWebhook, cleanup, config, fileDb } = await startAppAgainstFakePolar({
      HOSTED_TRIAL_DAYS: '7',
      HOSTED_GRACE_DAYS: '7',
    }))
    ;({ executeWithdrawal } = await import('../services/autoRefund.js'))
  })
  after(() => {
    mock.timers.reset()
    cleanup()
  })

  const rowsOf = async (agent) => {
    const me = await agent.get('/api/auth/me')
    return fileDb.findSubscriptionsByUser(me.body.user.id)
  }
  async function customer(email) {
    mock.timers.setTime(T0)
    const agent = await loginAs(email)
    return {
      agent,
      email,
      async goTo(day, hour = 0) {
        mock.timers.setTime(T0 + day * DAY + hour * HOUR)
        await agent.post('/api/auth/dev-login').send({ email })
      },
      mails: () => mp.mailsTo(email),
      row: async () => (await rowsOf(agent)).find((r) => r.provider === 'polar'),
    }
  }
  async function openCheckout(c, plan, { cycle = 'monthly' } = {}) {
    const res = await c.agent.post('/api/subscriptions').send({ plan, cycle, provider: 'polar' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.provider, 'polar')
    return { ...res.body, checkoutId: res.body.init_point.split('polar_c_').pop() }
  }
  /** Completa el checkout y llegan los webhooks como en prod. */
  async function subscribe(c, checkoutId) {
    const { sub, order } = pl.subscribe(checkoutId, { email: c.email })
    assert.equal((await polarWebhook('subscription.created', sub)).status, 202)
    if (order) assert.equal((await polarWebhook('order.paid', order)).status, 202)
    return { psub: sub, order }
  }
  async function previousSubscription(c) {
    const me = await c.agent.get('/api/auth/me')
    await fileDb.createSubscription({
      userId: me.body.user.id,
      plan: 'hosted_starter',
      cycle: 'monthly',
      status: 'cancelled',
      provider: 'mercadopago',
      activatedAt: new Date(T0 - 90 * DAY),
      canceledAt: new Date(T0 - 60 * DAY),
      currentPeriodEnd: new Date(T0 - 60 * DAY),
    })
  }

  it('los planes ofrecen Polar como carril internacional', async () => {
    const res = await (await loginAs('planes@test.com')).get('/api/subscriptions/plans')
    assert.equal(res.body.providers.polar.enabled, true)
    assert.equal(res.body.intl, 'polar')
  })

  it('alta con prueba: producto del plan con su precio de lista, 7 días de prueba; activa sin cobrar', async () => {
    const c = await customer('trial@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const body = pl.calls.filter((x) => x.route === 'POST /checkouts/').at(-1).body
    const product = pl.products.find((p) => p.id === body.products[0])
    assert.match(product.name, /Starter \(monthly\)/)
    assert.equal(product.prices[0].price_amount, Math.round(HOSTED_PLANS.hosted_starter.priceMonthlyUsd * 100))
    assert.equal(body.allow_trial, true)
    assert.equal(body.trial_interval, 'day')
    assert.equal(body.trial_interval_count, 7)
    assert.equal(body.metadata.kind, 'lab')
    assert.equal(body.metadata.subscriptionId, out.subscriptionId)

    const { psub } = await subscribe(c, out.checkoutId)
    const row = await c.row()
    assert.equal(row.status, 'authorized')
    assert.equal(row.currency_id, 'USD')
    assert.equal(row.polarSubscriptionId, psub.id)
    assert.ok(row.trialEndsAt)
    assert.equal(row.lastPaidAt, undefined)
  })

  it('fin de la prueba: el primer cobro extiende el período, se anota y manda el mail; el mismo cobro dos veces no regala días', async () => {
    const c = await customer('primer@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await subscribe(c, out.checkoutId)
    await c.goTo(7, 1)
    const { order } = pl.renew(psub.id)
    assert.equal((await polarWebhook('order.paid', order)).status, 202)
    const row = await c.row()
    assert.equal(row.firstChargeId, order.id)
    assert.ok(row.lastPaidAt)
    assert.equal(row.paidPlan, 'hosted_starter')
    const end1 = row.currentPeriodEnd
    assert.equal(new Date(end1).getTime(), new Date(pl.subscriptions.get(psub.id).current_period_end).getTime())
    await waitFor(() => c.mails().some((m) => /Recibimos tu pago de ScrollLab LAB/.test(m.body.subject)), 'el mail del cobro')
    await polarWebhook('order.paid', order)
    assert.equal(new Date((await c.row()).currentPeriodEnd).getTime(), new Date(end1).getTime())
  })

  it('alta sin prueba (ya tuvo una): cobra en el acto y activa', async () => {
    const c = await customer('sinprueba@test.com')
    await previousSubscription(c)
    const out = await openCheckout(c, 'hosted_pro')
    const body = pl.calls.filter((x) => x.route === 'POST /checkouts/').at(-1).body
    assert.equal(body.allow_trial, false)
    const { order } = await subscribe(c, out.checkoutId)
    const row = await c.row()
    assert.equal(row.status, 'authorized')
    assert.equal(row.firstChargeId, order.id)
    assert.equal(row.firstChargeAmount, HOSTED_PLANS.hosted_pro.priceMonthlyUsd)
  })

  it('cuota rechazada: queda en gracia y le llega el mail con el link del portal para cambiar la tarjeta', async () => {
    const c = await customer('rechazo@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await subscribe(c, out.checkoutId)
    await c.goTo(7, 1)
    await polarWebhook('order.paid', pl.renew(psub.id).order)
    await c.goTo(38)
    const { sub } = pl.renew(psub.id, { decline: true })
    assert.equal((await polarWebhook('subscription.past_due', sub)).status, 202)
    const row = await c.row()
    assert.ok(row.paymentFailedAt)
    assert.equal(row.status, 'authorized')
    await waitFor(() => c.mails().some((m) => /portal/.test(m.body.text)), 'el mail con el link del portal')
    const link = await c.agent.get('/api/subscriptions/payment-method')
    assert.equal(link.status, 200)
    assert.match(link.body.url, /sandbox\.polar\.sh\/portal\//)
  })

  it('baja: deja de cobrar en Polar y el acceso sigue hasta el fin del período', async () => {
    const c = await customer('baja@test.com')
    await previousSubscription(c)
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await subscribe(c, out.checkoutId)
    const res = await c.agent.post('/api/subscriptions/cancel')
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(pl.calls.filter((x) => x.route === 'PATCH /subscriptions/:id').at(-1).body.cancel_at_period_end, true)
    assert.equal(pl.subscriptions.get(psub.id).cancel_at_period_end, true)
    const row = await c.row()
    assert.ok(row.canceledAt)
    assert.equal(row.status, 'authorized')
    // El aviso de Polar (sigue activa con la baja pedida) no rompe nada.
    await polarWebhook('subscription.canceled', pl.subscriptions.get(psub.id))
    assert.equal((await c.row()).status, 'authorized')
  })

  it('cambio de plan: subir cobra la diferencia (invoice) y queda aparte; bajar no cobra (next_period)', async () => {
    const c = await customer('cambio@test.com')
    await previousSubscription(c)
    const out = await openCheckout(c, 'hosted_starter')
    await subscribe(c, out.checkoutId)
    await c.goTo(10)
    const up = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
    assert.equal(up.status, 200, JSON.stringify(up.body))
    const patch = pl.calls.filter((x) => x.route === 'PATCH /subscriptions/:id').at(-1).body
    assert.equal(patch.proration_behavior, 'invoice')
    assert.equal((await c.row()).plan, 'hosted_pro')
    const before = (await c.row()).lastPaidAt
    await polarWebhook('order.paid', pl.lastProration)
    const afterUp = await c.row()
    assert.equal(new Date(afterUp.lastPaidAt).getTime(), new Date(before).getTime())
    assert.equal(afterUp.upgradePayments[0].paymentId, pl.lastProration.id)

    const down = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_starter' })
    assert.equal(down.status, 200, JSON.stringify(down.body))
    assert.equal(pl.calls.filter((x) => x.route === 'PATCH /subscriptions/:id').at(-1).body.proration_behavior, 'next_period')
    assert.equal((await c.row()).plan, 'hosted_starter')
  })

  it('arrepentimiento del primer cobro (y la diferencia de plan): se devuelven por la API y se da de baja ya', async () => {
    const c = await customer('arrep@test.com')
    await previousSubscription(c)
    const out = await openCheckout(c, 'hosted_starter')
    const { psub, order } = await subscribe(c, out.checkoutId)
    await c.goTo(1)
    await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
    await polarWebhook('order.paid', pl.lastProration)
    await c.goTo(2)
    const row = await c.row()
    const result = await executeWithdrawal({ code: 'ARR-PLAB', subscriptionId: String(row.id), email: c.email }, config)
    assert.equal(result.status, 'refunded', JSON.stringify(result))
    const refunded = pl.calls.filter((x) => x.route === 'POST /refunds/').map((x) => x.body.order_id)
    assert.ok(refunded.includes(order.id))
    assert.ok(refunded.includes(pl.lastProration.id))
    assert.ok(pl.calls.some((x) => x.route === 'PATCH /subscriptions/:id' && x.body.revoke === true))
    assert.equal(pl.subscriptions.get(psub.id).status, 'canceled')
    const after = await c.row()
    assert.equal(after.status, 'cancelled')
    assert.ok(after.refundedAt)
    await waitFor(() => c.mails().some((m) => /devolvimos/i.test(m.body.subject)), 'el mail de la devolución')
  })

  it('el primer cobro devuelto desde el panel: baja inmediata, libro y aviso; una renovación devuelta: sigue', async () => {
    const c = await customer('panel@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await subscribe(c, out.checkoutId)
    await c.goTo(7, 1)
    const first = pl.renew(psub.id).order
    await polarWebhook('order.paid', first)
    await c.goTo(9)
    await polarWebhook('order.refunded', pl.refund(first.id))
    const row = await c.row()
    assert.equal(row.status, 'cancelled')
    assert.ok(row.refundedAt)
    assert.ok((await fileDb.listRefunds()).some((r) => r.provider === 'polar' && r.kind === 'lab'))
    await waitFor(() => mp.mailsTo(OWNER).some((m) => /PRIMER COBRO/.test(m.body.subject)), 'el aviso al dueño')

    const d = await customer('panel-renov@test.com')
    const out2 = await openCheckout(d, 'hosted_starter')
    const s2 = (await subscribe(d, out2.checkoutId)).psub
    await d.goTo(7, 1)
    await polarWebhook('order.paid', pl.renew(s2.id).order)
    await d.goTo(38)
    const second = pl.renew(s2.id).order
    await polarWebhook('order.paid', second)
    await polarWebhook('order.refunded', pl.refund(second.id))
    assert.equal((await d.row()).status, 'authorized')
  })

  it('la vuelta del checkout antes del webhook: el sync la encuentra entre las del usuario y la activa', async () => {
    const c = await customer('vuelta@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    pl.subscribe(out.checkoutId, { email: c.email })
    const res = await c.agent.post('/api/subscriptions/sync')
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.status, 'authorized')
  })

  it('un producto de LAB con otro precio no se vende (no crea la fila)', async () => {
    const product = pl.products.find((p) => /Studio \(monthly\)/.test(p.name)) || null
    const { resetPolarLabCache } = await import('../services/polar.js')
    if (product) product.prices[0].price_amount += 100
    else {
      pl.products.push({
        id: '00000000-0000-4000-8000-999999999999',
        name: 'ScrollLab LAB — Studio (monthly)',
        is_recurring: true,
        recurring_interval: 'month',
        prices: [{ amount_type: 'fixed', price_amount: 1, price_currency: 'usd', is_archived: false }],
      })
    }
    resetPolarLabCache()
    const c = await customer('precio@test.com')
    const res = await c.agent.post('/api/subscriptions').send({ plan: 'hosted_studio', cycle: 'monthly', provider: 'polar' })
    assert.equal(res.status, 502)
    assert.equal((await rowsOf(c.agent)).length, 0)
  })
})
