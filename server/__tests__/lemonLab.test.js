import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { waitFor } from './helpers/fakeMercadoPago.js'
import { startAppAgainstFakeLemon } from './helpers/fakeLemon.js'
import { HOSTED_PLANS } from '../catalog.js'

/**
 * LAB cobrado por Lemon Squeezy (USD) con el reloj simulado: alta con prueba gratis,
 * fin de la prueba y primer cobro, cuota rechazada, baja con días pagos, cambio de
 * plan (subir cobra el prorrateo, bajar no), alta sin prueba, la vuelta del checkout
 * antes del webhook y el arrepentimiento del primer cobro. Lemon Squeezy es el doble
 * en memoria y sus webhooks llegan firmados.
 */
describe('LAB con Lemon Squeezy (reloj simulado)', () => {
  const HOUR = 3_600_000
  const DAY = 24 * HOUR
  const T0 = Date.parse('2026-10-01T15:00:00.000Z')
  const OWNER = 'owner@scrolllab.test'

  let ls
  let mp
  let loginAs
  let lemonWebhook
  let cleanup
  let config
  let fileDb
  let executeWithdrawal

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    mock.timers.enable({ apis: ['Date'], now: T0 })
    ;({ ls, mp, loginAs, lemonWebhook, cleanup, config, fileDb } = await startAppAgainstFakeLemon({
      HOSTED_TRIAL_DAYS: '7',
      HOSTED_GRACE_DAYS: '7',
    }))
    ;({ executeWithdrawal } = await import('../services/autoRefund.js'))
  })
  after(() => {
    mock.timers.reset()
    cleanup()
  })

  const variantOf = (plan, cycle = 'monthly') => {
    const tier = HOSTED_PLANS[plan].tier
    return ls.labVariants.find((v) => v.name.toLowerCase().startsWith(tier) && v.interval === (cycle === 'yearly' ? 'year' : 'month'))
  }
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
      row: async () => (await rowsOf(agent))[0],
    }
  }

  async function openCheckout(c, plan, { cycle = 'monthly' } = {}) {
    // El front pide el carril internacional como `paddle`: sin Paddle, lo cobra Lemon Squeezy.
    const res = await c.agent.post('/api/subscriptions').send({ plan, cycle, provider: 'paddle' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.provider, 'lemonsqueezy')
    return { ...res.body, checkoutId: res.body.init_point.split('/').pop() }
  }

  /** Completa el checkout y llegan los webhooks como en prod. */
  async function subscribe(checkoutId) {
    const { sub, invoice } = ls.subscribe(checkoutId)
    assert.equal((await lemonWebhook('subscription_created', sub)).status, 200)
    if (invoice) assert.equal((await lemonWebhook('subscription_payment_success', invoice)).status, 200)
    return { lsub: sub, invoice }
  }

  it('los planes ofrecen Lemon Squeezy como carril internacional (modo real)', async () => {
    const res = await (await loginAs('planes@test.com')).get('/api/subscriptions/plans')
    assert.equal(res.body.providers.lemonsqueezy.enabled, true)
  })

  it('alta con prueba: checkout sobre la variante del plan, sin saltear la prueba; activa sin cobrar', async () => {
    const c = await customer('trial@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const body = ls.calls.filter((x) => x.route === 'POST /v1/checkouts').at(-1).body.data
    assert.equal(body.relationships.variant.data.id, variantOf('hosted_starter').id)
    assert.equal(body.attributes.checkout_options.skip_trial, false)
    // El checkout muestra solo el plan elegido.
    assert.deepEqual(body.attributes.product_options.enabled_variants, [Number(variantOf('hosted_starter').id)])
    assert.equal(body.attributes.checkout_data.custom.kind, 'lab')
    assert.equal(body.attributes.checkout_data.custom.subscriptionId, out.subscriptionId)

    const { lsub } = await subscribe(out.checkoutId)
    const row = await c.row()
    assert.equal(row.provider, 'lemonsqueezy')
    assert.equal(row.currency_id, 'USD')
    assert.equal(row.status, 'authorized')
    assert.equal(row.lemonSubscriptionId, lsub.id)
    assert.ok(row.trialEndsAt)
    assert.equal(new Date(row.currentPeriodEnd).getTime(), new Date(lsub.attributes.trial_ends_at).getTime())
    assert.equal(row.lastPaidAt, undefined)
  })

  it('fin de la prueba: el primer cobro extiende el período, anota la factura y manda el mail', async () => {
    const c = await customer('primer@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { lsub } = await subscribe(out.checkoutId)
    await c.goTo(7, 1)
    const invoice = ls.renew(lsub.id)
    assert.equal((await lemonWebhook('subscription_payment_success', invoice)).status, 200)
    const row = await c.row()
    assert.equal(row.firstChargeId, invoice.id)
    assert.ok(row.lastPaidAt)
    assert.equal(new Date(row.currentPeriodEnd).getTime(), new Date(ls.subscriptions.get(lsub.id).attributes.renews_at).getTime())
    assert.equal(row.paidPlan, 'hosted_starter')
    await waitFor(() => c.mails().some((m) => /Recibimos tu pago de ScrollLab LAB/.test(m.body.subject)), 'el mail del cobro')
  })

  it('el mismo cobro dos veces no regala días', async () => {
    const c = await customer('doble@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { lsub } = await subscribe(out.checkoutId)
    await c.goTo(7, 1)
    const invoice = ls.renew(lsub.id)
    await lemonWebhook('subscription_payment_success', invoice)
    const end1 = (await c.row()).currentPeriodEnd
    await lemonWebhook('subscription_payment_success', invoice)
    assert.equal(new Date((await c.row()).currentPeriodEnd).getTime(), new Date(end1).getTime())
  })

  it('cuota rechazada: queda en gracia y le llega el mail con el link para cambiar la tarjeta', async () => {
    const c = await customer('rechazo@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { lsub } = await subscribe(out.checkoutId)
    await c.goTo(7, 1)
    const failed = ls.renew(lsub.id, { decline: true })
    assert.equal((await lemonWebhook('subscription_payment_failed', failed)).status, 200)
    const row = await c.row()
    assert.ok(row.paymentFailedAt)
    assert.equal(row.status, 'authorized')
    await waitFor(() => c.mails().some((m) => m.body.text.includes('payment-details')), 'el mail con el link de la tarjeta')
    const link = await c.agent.get('/api/subscriptions/payment-method')
    assert.equal(link.status, 200)
    assert.match(link.body.url, /payment-details/)
  })

  it('baja: deja de cobrar en Lemon Squeezy y el acceso sigue hasta el fin del período', async () => {
    const c = await customer('baja@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { lsub } = await subscribe(out.checkoutId)
    const res = await c.agent.post('/api/subscriptions/cancel')
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.ok(ls.calls.some((x) => x.route === 'DELETE /v1/subscriptions/:id' && x.path.endsWith(lsub.id)))
    assert.equal((await lemonWebhook('subscription_cancelled', ls.subscriptions.get(lsub.id))).status, 200)
    const row = await c.row()
    assert.ok(row.canceledAt)
    assert.equal(row.status, 'authorized')
  })

  it('cambio de plan: subir con días pagos cobra el prorrateo; bajar no cobra', async () => {
    const c = await customer('cambio@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { lsub } = await subscribe(out.checkoutId)
    await c.goTo(7, 1)
    await lemonWebhook('subscription_payment_success', ls.renew(lsub.id))
    await c.goTo(15)

    const up = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
    assert.equal(up.status, 200, JSON.stringify(up.body))
    assert.equal(up.body.charged, true)
    const patchUp = ls.updates.at(-1)
    assert.equal(String(patchUp.attributes.variant_id), variantOf('hosted_pro').id)
    assert.equal(patchUp.attributes.invoice_immediately, true)
    assert.equal((await c.row()).plan, 'hosted_pro')
    // El cobro del prorrateo llega como una factura más.
    assert.equal((await lemonWebhook('subscription_payment_success', ls.lastProration)).status, 200)

    const down = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_starter' })
    assert.equal(down.status, 200, JSON.stringify(down.body))
    assert.equal(down.body.charged, false)
    assert.equal(ls.updates.at(-1).attributes.disable_prorations, true)
    assert.equal((await c.row()).plan, 'hosted_starter')
  })

  it('alta sin prueba (ya tuvo una): saltea la prueba, cobra en el acto y activa', async () => {
    const c = await customer('sinprueba@test.com')
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
    const out = await openCheckout(c, 'hosted_pro')
    const body = ls.calls.filter((x) => x.route === 'POST /v1/checkouts').at(-1).body.data
    assert.equal(body.attributes.checkout_options.skip_trial, true)
    const { invoice } = await subscribe(out.checkoutId)
    const rows = await rowsOf(c.agent)
    const row = rows.find((r) => r.provider === 'lemonsqueezy')
    assert.equal(row.status, 'authorized')
    assert.equal(row.firstChargeId, invoice.id)
    assert.equal(row.firstChargeAmount, HOSTED_PLANS.hosted_pro.priceMonthlyUsd)
  })

  it('arrepentimiento del primer cobro: se devuelve la factura por la API y se da de baja ya', async () => {
    const c = await customer('arrep@test.com')
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
    const out = await openCheckout(c, 'hosted_starter')
    const { lsub, invoice } = await subscribe(out.checkoutId)
    await c.goTo(2)
    const row = (await rowsOf(c.agent)).find((r) => r.provider === 'lemonsqueezy')
    const result = await executeWithdrawal({ code: 'ARR-LAB1', subscriptionId: String(row.id), email: c.email }, config)
    assert.equal(result.status, 'refunded', JSON.stringify(result))
    assert.ok(ls.calls.some((x) => x.route === 'POST /v1/subscription-invoices/:id/refund' && x.path.includes(invoice.id)))
    assert.ok(ls.calls.some((x) => x.route === 'DELETE /v1/subscriptions/:id' && x.path.endsWith(lsub.id)))
    const after = await fileDb.findSubscriptionById(String(row.id))
    assert.equal(after.status, 'cancelled')
    assert.ok(after.refundedAt)
    await waitFor(() => c.mails().some((m) => /devolvimos/i.test(m.body.subject)), 'el mail de la devolución')
  })

  it('la vuelta del checkout antes del webhook: el sync la encuentra por el mail y la activa', async () => {
    const c = await customer('vuelta@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { sub: lsub } = ls.subscribe(out.checkoutId)
    const res = await c.agent.post('/api/subscriptions/sync')
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.status, 'authorized')
    assert.equal((await c.row()).lemonSubscriptionId, lsub.id)
  })

  it('una variante con otro precio no se vende (no crea la fila)', async () => {
    const c = await customer('precio@test.com')
    const { resetLabVariantCache } = await import('../services/lemonsqueezy.js')
    const v = variantOf('hosted_studio')
    const original = v.price
    v.price = original + 100
    resetLabVariantCache()
    try {
      const res = await c.agent.post('/api/subscriptions').send({ plan: 'hosted_studio', cycle: 'monthly', provider: 'paddle' })
      assert.equal(res.status, 502)
      assert.equal((await rowsOf(c.agent)).length, 0)
    } finally {
      v.price = original
      resetLabVariantCache()
    }
  })

  it('una suscripción de otra variante que la vendida no da acceso y avisa', async () => {
    const c = await customer('otra@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { sub: lsub } = ls.subscribe(out.checkoutId)
    lsub.attributes.variant_id = Number(variantOf('hosted_studio').id)
    assert.equal((await lemonWebhook('subscription_created', lsub)).status, 200)
    assert.equal((await c.row()).status, 'pending')
    await waitFor(() => mp.mailsTo(OWNER).some((m) => m.body.subject.includes('NO COINCIDE')), 'el aviso al dueño')
  })
})

describe('LAB con Lemon Squeezy en modo prueba: solo para las cuentas de QA', () => {
  let loginAs
  let cleanup

  before(async () => {
    process.env.QA_BUYER_EMAILS = 'qa-owner@test.com'
    ;({ loginAs, cleanup } = await startAppAgainstFakeLemon({ LEMONSQUEEZY_TEST_MODE: 'true' }))
  })
  after(() => cleanup())

  it('para un cliente cualquiera no hay LAB internacional; para QA sí, y la fila queda de prueba', async () => {
    const stranger = await loginAs('cliente@test.com')
    const plans = await stranger.get('/api/subscriptions/plans')
    assert.equal(plans.body.providers.lemonsqueezy.enabled, false)
    const denied = await stranger.post('/api/subscriptions').send({ plan: 'hosted_starter', cycle: 'monthly', provider: 'lemonsqueezy' })
    assert.equal(denied.status, 400)

    const qa = await loginAs('qa-owner@test.com')
    assert.equal((await qa.get('/api/subscriptions/plans')).body.providers.lemonsqueezy.enabled, true)
    const res = await qa.post('/api/subscriptions').send({ plan: 'hosted_starter', cycle: 'monthly', provider: 'lemonsqueezy' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.provider, 'lemonsqueezy')
  })
})
