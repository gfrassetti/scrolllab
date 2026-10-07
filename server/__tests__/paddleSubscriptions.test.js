import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { waitFor } from './helpers/fakeMercadoPago.js'
import { startAppAgainstFakePaddle } from './helpers/fakePaddle.js'
import { HOSTED_PLANS } from '../catalog.js'

/**
 * LAB cobrado por Paddle (USD) con el reloj simulado: alta con prueba gratis,
 * primer cobro, renovación, cuota rechazada y recuperada, baja con días pagos,
 * cambio de plan con prorrateo de Paddle, alta abandonada y el mail de un alta
 * rechazada. Paddle es el doble en memoria y sus webhooks llegan firmados.
 */
describe('LAB con Paddle (reloj simulado)', () => {
  const HOUR = 3_600_000
  const DAY = 24 * HOUR
  const T0 = Date.parse('2026-10-01T15:00:00.000Z')
  const iso = (d) => new Date(d).toISOString()
  const usd = (plan, cycle = 'monthly') =>
    cycle === 'yearly' ? HOSTED_PLANS[plan].priceYearlyUsd : HOSTED_PLANS[plan].priceMonthlyUsd

  let pd
  let mp
  let loginAs
  let paddleWebhook
  let cleanup
  let config
  let fileDb
  let sweep
  let DELAY

  const OWNER = 'owner@scrolllab.test'
  const alerts = (title) => mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    mock.timers.enable({ apis: ['Date'], now: T0 })
    ;({ pd, mp, loginAs, paddleWebhook, cleanup, config, fileDb } =
      await startAppAgainstFakePaddle({ HOSTED_TRIAL_DAYS: '7', HOSTED_GRACE_DAYS: '7' }))
    ;({ sendDuePaymentFailedEmails: sweep, PAYMENT_FAILED_EMAIL_DELAY_MS: DELAY } = await import(
      '../services/paymentFailedSweep.js'
    ))
  })
  after(() => {
    mock.timers.reset()
    cleanup()
  })

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
      me: async () => (await agent.get('/api/subscriptions/me')).body,
      mails: () => mp.mailsTo(email),
    }
  }

  /** Alta en LAB con Paddle: abre el checkout (transacción del servidor). */
  async function openCheckout(c, plan, { cycle = 'monthly', locale } = {}) {
    const res = await c.agent
      .post('/api/subscriptions')
      .send({ plan, cycle, provider: 'paddle', locale })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    return res.body
  }

  /** Paga en el overlay y llegan los webhooks como en prod. */
  async function payCheckout(transactionId) {
    const { txn, sub } = pd.pay(transactionId)
    assert.equal((await paddleWebhook('transaction.completed', txn)).status, 200)
    assert.equal((await paddleWebhook('subscription.created', sub)).status, 200)
    return { txn, psub: sub }
  }

  async function renews(psub, opts) {
    const txn = pd.renew(psub.id, opts)
    if (opts?.decline) {
      assert.equal((await paddleWebhook('transaction.payment_failed', txn)).status, 200)
      assert.equal((await paddleWebhook('subscription.past_due', pd.subscriptions.get(psub.id))).status, 200)
    } else {
      assert.equal((await paddleWebhook('subscription.updated', pd.subscriptions.get(psub.id))).status, 200)
      assert.equal((await paddleWebhook('transaction.completed', txn)).status, 200)
    }
    return txn
  }

  it('el alta arma una transacción recurrente en USD con la prueba y los planes muestran USD', async () => {
    const plans = await (await loginAs('planes@test.com')).get('/api/subscriptions/plans')
    assert.equal(plans.body.providers.paddle.enabled, true)
    const pro = plans.body.plans.find((p) => p.id === 'hosted_pro')
    assert.equal(pro.priceMonthlyUsd, usd('hosted_pro'))
    assert.equal(pro.priceYearlyUsd, usd('hosted_pro', 'yearly'))

    const c = await customer('alta-paddle@test.com')
    const out = await openCheckout(c, 'hosted_pro')
    assert.equal(out.provider, 'paddle')
    assert.match(out.transactionId, /^txn_/)
    assert.deepEqual(out.paddle, { environment: 'sandbox', clientToken: 'test_fake_client_token' })
    assert.equal(iso(out.trialEndsAt), iso(T0 + 7 * DAY))

    const body = pd.lastCall('POST /transactions').body
    const price = body.items[0].price
    assert.equal(price.unit_price.amount, String(usd('hosted_pro') * 100))
    assert.deepEqual(price.billing_cycle, { interval: 'month', frequency: 1 })
    assert.deepEqual(price.trial_period, { interval: 'day', frequency: 7 })
    assert.equal(price.product.tax_category, 'saas')
    assert.equal(body.custom_data.kind, 'lab')
    assert.equal(body.custom_data.subscriptionId, out.subscriptionId)

    const row = await fileDb.findSubscriptionById(out.subscriptionId)
    assert.equal(row.provider, 'paddle')
    assert.equal(row.currency_id, 'USD')
    assert.equal(row.status, 'pending')
    assert.equal(row.paddleTransactionId, out.transactionId)
  })

  it('si Paddle cobra antes de que venza la prueba, la prueba termina ahí', async () => {
    const c = await customer('activa-antes@test.com')
    const out = await openCheckout(c, 'hosted_pro')
    const { psub } = await payCheckout(out.transactionId)
    assert.equal((await c.me()).trialing, true)
    // Día 2: se activa antes de tiempo (soporte o el propio Paddle) y cobra el mes.
    await c.goTo(2)
    const charge = await renews(psub)
    const me = await c.me()
    assert.equal(me.trialing, false)
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(iso(me.trialEndsAt), iso(charge.billed_at))
    assert.equal(iso(me.currentPeriodEnd), charge.billing_period.ends_at)
  })

  it('recorrido completo: prueba → primer cobro → renovación → baja → acceso hasta el fin', async () => {
    const c = await customer('recorrido-paddle@test.com')
    const out = await openCheckout(c, 'hosted_pro', { locale: 'en' })
    const { psub } = await payCheckout(out.transactionId)

    let me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.trialing, true)
    assert.equal(me.provider, 'paddle')
    assert.equal(me.currency_id, 'USD')
    assert.equal(iso(me.currentPeriodEnd), iso(T0 + 7 * DAY))
    await waitFor(() => c.mails().length === 1, 'la bienvenida')
    assert.match(c.mails()[0].body.subject, /free trial has started/)
    assert.match(c.mails()[0].body.text, /\$79/)

    // Día 7: Paddle cobra el primer mes.
    await c.goTo(7)
    const first = await renews(psub)
    me = await c.me()
    assert.equal(me.trialing, false)
    assert.equal(iso(me.currentPeriodEnd), first.billing_period.ends_at)
    await waitFor(() => c.mails().length === 2, 'el mail del primer cobro')
    assert.match(c.mails()[1].body.subject, /We received your ScrollLab LAB payment/)
    assert.match(c.mails()[1].body.text, /\$79/)

    // Webhooks repetidos no duplican el mail ni corren el período.
    await paddleWebhook('transaction.completed', first)
    await new Promise((r) => setTimeout(r, 60))
    assert.equal(c.mails().length, 2)
    assert.equal(iso((await c.me()).currentPeriodEnd), first.billing_period.ends_at)

    // Un mes después renueva sola.
    await c.goTo(38)
    const second = await renews(psub)
    assert.equal(iso((await c.me()).currentPeriodEnd), second.billing_period.ends_at)
    await waitFor(() => c.mails().length === 3, 'el mail de la renovación')

    // Día 50: cancela. Paddle la programa para el fin del período pagado.
    await c.goTo(50)
    const cancel = await c.agent.post('/api/subscriptions/cancel')
    assert.equal(cancel.status, 200, JSON.stringify(cancel.body))
    assert.equal(iso(cancel.body.endsAt), second.billing_period.ends_at)
    assert.equal(pd.lastCall('POST /subscriptions/:id/cancel').body.effective_from, 'next_billing_period')
    assert.equal(pd.subscriptions.get(psub.id).scheduled_change.action, 'cancel')
    await paddleWebhook('subscription.updated', pd.subscriptions.get(psub.id))
    me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.ok(me.canceledAt)
    await waitFor(() => c.mails().length === 4, 'el mail de baja')
    assert.match(c.mails()[3].body.subject, /You canceled/)

    // Paddle la cierra al fin del período: sigue con acceso hasta ahí y después free.
    await paddleWebhook('subscription.canceled', pd.endScheduledCancel(psub.id))
    assert.equal((await c.me()).plan, 'hosted_pro')
    mock.timers.setTime(Date.parse(second.billing_period.ends_at) + HOUR)
    await c.agent.post('/api/auth/dev-login').send({ email: c.email })
    assert.equal((await c.me()).plan, 'free')
  })

  it('sync manual al cerrar el overlay activa sin esperar al webhook', async () => {
    const c = await customer('sync-paddle@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    pd.pay(out.transactionId)
    const synced = await c.agent.post('/api/subscriptions/sync')
    assert.equal(synced.status, 200, JSON.stringify(synced.body))
    assert.equal(synced.body.status, 'authorized')
    const me = await c.me()
    assert.equal(me.plan, 'hosted_starter')
    assert.equal(me.trialing, true)
  })

  it('cuota rechazada: gracia, mail con el link para cambiar la tarjeta; el reintento la recupera', async () => {
    const c = await customer('rechazo-paddle@test.com')
    const out = await openCheckout(c, 'hosted_pro')
    const { psub } = await payCheckout(out.transactionId)
    await c.goTo(7)
    await renews(psub)
    await waitFor(() => c.mails().length === 2, 'bienvenida y primer cobro')

    // Día 38: la renovación rebota.
    await c.goTo(38, 1)
    const failed = await renews(psub, { decline: true })
    let me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.paymentFailed, true)
    assert.equal(me.pastDue, true)
    await waitFor(() => c.mails().length === 3, 'el mail de cuota rechazada')
    const mail = c.mails()[2].body
    assert.match(mail.subject, /No pudimos cobrar tu plan Pro/)
    assert.match(mail.html, /sandbox-customer-portal\.paddle\.com\/update/)
    assert.match(mail.text, /Tus secciones siguen publicadas hasta el/)
    // El mismo rechazo repetido no repite el mail.
    await paddleWebhook('transaction.payment_failed', failed)
    await new Promise((r) => setTimeout(r, 60))
    assert.equal(c.mails().length, 3)

    // El link para cambiar la tarjeta se pide en el momento.
    const pm = await c.agent.get('/api/subscriptions/payment-method')
    assert.equal(pm.status, 200)
    assert.match(pm.body.url, /update/)

    // Paddle reintenta y cobra: vuelve a la normalidad.
    await c.goTo(40)
    await paddleWebhook('transaction.completed', pd.recover(failed.id))
    await paddleWebhook('subscription.updated', pd.subscriptions.get(psub.id))
    me = await c.me()
    assert.equal(me.paymentFailed, false)
    assert.equal(me.pastDue, false)
    assert.equal(iso(me.currentPeriodEnd), failed.billing_period.ends_at)
  })

  it('cuota rechazada sin recuperar: pasada la gracia queda en free', async () => {
    const c = await customer('caida-paddle@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await payCheckout(out.transactionId)
    await c.goTo(7)
    await renews(psub)
    const end = Date.parse((await c.me()).currentPeriodEnd)
    mock.timers.setTime(end + HOUR)
    await renews(psub, { decline: true })
    mock.timers.setTime(end + 8 * DAY)
    await c.agent.post('/api/auth/dev-login').send({ email: c.email })
    const me = await c.me()
    assert.equal(me.plan, 'free')
    assert.equal(me.lapsedPlan, 'hosted_starter')
    // Vencido sigue siendo de Paddle (USD): «Mi cuenta» ofrece actualizar la tarjeta.
    assert.equal(me.provider, 'paddle')
    assert.equal(me.currency_id, 'USD')
  })

  it('subir con días pagos: la misma diferencia que MP, cobrada como cargo único', async () => {
    const c = await customer('sube-paddle@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await payCheckout(out.transactionId)
    await c.goTo(7)
    await renews(psub)
    await c.goTo(17)

    const quote = await c.agent.get('/api/subscriptions/change/quote?plan=hosted_pro')
    assert.equal(quote.status, 200, JSON.stringify(quote.body))
    assert.equal(quote.body.direction, 'upgrade')
    assert.equal(quote.body.currency_id, 'USD')
    assert.equal(quote.body.provider, 'paddle')
    assert.ok(quote.body.amount > 0 && quote.body.amount < usd('hosted_pro'), String(quote.body.amount))
    // Cobrado el día 7, cambia el día 17: quedan (período − 10) días → (79 − 19) × fracción.
    const period = (Date.parse(psub.current_billing_period.ends_at) - Date.parse(psub.current_billing_period.starts_at)) / DAY
    const expected = Math.ceil((usd('hosted_pro') - usd('hosted_starter')) * ((period - 10) / period) * 100) / 100
    assert.equal(quote.body.amount, expected)

    const res = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.requiresPayment, false)
    assert.equal(res.body.charged, true)
    // Lo que cotizó es lo que se cobra: cargo único, nuestra cuenta, al instante.
    const charge = pd.lastCall('POST /subscriptions/:id/charge').body
    assert.equal(charge.effective_from, 'immediately')
    assert.equal(charge.on_payment_failure, 'prevent_change')
    assert.equal(charge.items[0].price.unit_price.amount, String(Math.round(expected * 100)))
    assert.equal(charge.items[0].price.product.tax_category, 'saas')
    // El precio recurrente pasa al nuevo sin que Paddle prorratee por su cuenta.
    const patch = pd.lastCall('PATCH /subscriptions/:id').body
    assert.equal(patch.proration_billing_mode, 'do_not_bill')
    assert.equal(patch.items[0].price.unit_price.amount, String(usd('hosted_pro') * 100))
    const me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.paidPlan, 'hosted_pro')

    // El cobro de la diferencia llega por webhook: no corre el período.
    const before = (await c.me()).currentPeriodEnd
    await paddleWebhook('transaction.completed', pd.lastUpgradeTransaction)
    assert.equal(iso((await c.me()).currentPeriodEnd), iso(before))
    assert.equal((await c.me()).plan, 'hosted_pro')
  })

  it('bajó y vuelve a subir en el mismo período: paga solo lo que no había pagado (como MP)', async () => {
    const c = await customer('baja-y-sube@test.com')
    const out = await openCheckout(c, 'hosted_pro')
    const { psub } = await payCheckout(out.transactionId)
    await c.goTo(7)
    await renews(psub) // pagó Pro el día 7
    await c.goTo(10)
    const down = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_starter' })
    assert.equal(down.status, 200)
    assert.equal(down.body.charged, false)
    // Volver a Pro: ya está pago. Sin cobro.
    const back = await c.agent.get('/api/subscriptions/change/quote?plan=hosted_pro')
    assert.equal(back.body.amount, 0)
    // Subir a Studio: Studio − Pro (lo pagado), no Studio − Starter (el plan de ahora).
    await c.goTo(17)
    const before = pd.calls.filter((x) => x.route === 'POST /subscriptions/:id/charge').length
    const up = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_studio' })
    assert.equal(up.status, 200, JSON.stringify(up.body))
    const period = (Date.parse(psub.current_billing_period.ends_at) - Date.parse(psub.current_billing_period.starts_at)) / DAY
    const expected = Math.ceil((usd('hosted_studio') - usd('hosted_pro')) * ((period - 10) / period) * 100) / 100
    assert.equal(pd.calls.filter((x) => x.route === 'POST /subscriptions/:id/charge').length, before + 1)
    assert.equal(pd.lastCall('POST /subscriptions/:id/charge').body.items[0].price.unit_price.amount, String(Math.round(expected * 100)))
    assert.equal((await c.me()).plan, 'hosted_studio')
  })

  it('cobró la diferencia pero Paddle no cambió el precio: igual sube y avisa para corregir', async () => {
    const c = await customer('sube-sin-patch@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await payCheckout(out.transactionId)
    await c.goTo(7)
    await renews(psub)
    await c.goTo(12)
    pd.failPlanPatch = true
    try {
      const res = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
      assert.equal(res.status, 200, JSON.stringify(res.body))
      assert.equal((await c.me()).plan, 'hosted_pro')
      await waitFor(
        () => alerts('PAGÓ LA SUBIDA PERO PADDLE NO CAMBIÓ EL PRECIO').some((m) => m.body.text.includes(psub.id)),
        'el aviso para corregir el precio en Paddle',
      )
    } finally {
      pd.failPlanPatch = false
    }
  })

  it('subir con la tarjeta rechazada: 402 y no cambia nada', async () => {
    const c = await customer('sube-rechazo@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await payCheckout(out.transactionId)
    await c.goTo(7)
    await renews(psub)
    await c.goTo(10)
    pd.declineUpgrades = true
    try {
      const res = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_studio' })
      assert.equal(res.status, 402)
      assert.match(res.body.error, /rechazó el cobro de la diferencia/)
      assert.equal((await c.me()).plan, 'hosted_starter')
    } finally {
      pd.declineUpgrades = false
    }
  })

  it('bajar de plan o cambiar en la prueba: sin cobro (do_not_bill)', async () => {
    const c = await customer('baja-plan-paddle@test.com')
    const out = await openCheckout(c, 'hosted_pro')
    await payCheckout(out.transactionId)
    const res = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_studio' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.charged, false)
    assert.equal(pd.lastCall('PATCH /subscriptions/:id').body.proration_billing_mode, 'do_not_bill')
    const down = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_starter' })
    assert.equal(down.status, 200)
    assert.equal(pd.lastCall('PATCH /subscriptions/:id').body.proration_billing_mode, 'do_not_bill')
    assert.equal((await c.me()).plan, 'hosted_starter')
  })

  it('si Paddle no confirma la baja: 502 y la suscripción sigue igual', async () => {
    const c = await customer('baja-falla@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    await payCheckout(out.transactionId)
    pd.failNext['POST /subscriptions/:id/cancel'] = 500
    const res = await c.agent.post('/api/subscriptions/cancel')
    assert.equal(res.status, 502)
    assert.equal((await c.me()).canceledAt, null)
  })

  it('alta abandonada: la transacción vieja se cancela en Paddle antes de abrir otra', async () => {
    const c = await customer('abandona-paddle@test.com')
    const first = await openCheckout(c, 'hosted_starter')
    const second = await openCheckout(c, 'hosted_pro')
    assert.equal(pd.transactions.get(first.transactionId).status, 'canceled')
    assert.notEqual(first.transactionId, second.transactionId)
    assert.ok((await fileDb.findSubscriptionById(first.subscriptionId)).abandonedAt)
    // La prueba sigue disponible: el alta abandonada no la quemó.
    assert.equal(iso(second.trialEndsAt), iso(T0 + 7 * DAY))
  })

  it('alta abandonada que Paddle no deja cancelar: no bloquea, abre otra', async () => {
    const c = await customer('no-cancela@test.com')
    const first = await openCheckout(c, 'hosted_starter')
    pd.failNext['PATCH /transactions/:id'] = 400
    const second = await openCheckout(c, 'hosted_pro')
    assert.notEqual(first.transactionId, second.transactionId)
    assert.ok((await fileDb.findSubscriptionById(first.subscriptionId)).abandonedAt)
  })

  it('si lo que cobra Paddle no es el plan vendido, no se activa y avisa', async () => {
    const c = await customer('precio-raro@test.com')
    const out = await openCheckout(c, 'hosted_studio')
    // Precio alterado en la transacción (no es el que armó el servidor).
    pd.transactions.get(out.transactionId).items[0].price.unit_price.amount = '100'
    const { psub } = await payCheckout(out.transactionId)
    assert.equal((await c.me()).plan, 'free')
    assert.equal((await fileDb.findSubscriptionById(out.subscriptionId)).status, 'pending')
    await waitFor(
      () => alerts('NO COINCIDE CON EL PLAN').some((m) => m.body.text.includes(psub.id) && /precio 100/.test(m.body.text)),
      'el aviso del plan que no coincide',
    )
  })

  it('subscription.created antes que el cobro: se asocia solo si Paddle confirma la transacción del alta', async () => {
    const c = await customer('created-primero@test.com')
    const out = await openCheckout(c, 'hosted_pro')
    const { sub } = pd.pay(out.transactionId)
    // Llega primero la suscripción (la fila todavía no tiene su id).
    assert.equal((await paddleWebhook('subscription.created', sub)).status, 200)
    assert.equal((await c.me()).plan, 'hosted_pro')
    // Una suscripción ajena que copia el custom_data de esta fila no la toma.
    const other = await customer('copia-custom@test.com')
    const otherOut = await openCheckout(other, 'hosted_starter')
    const { sub: otherSub } = pd.pay(otherOut.transactionId)
    otherSub.custom_data = { ...sub.custom_data }
    pd.subscriptions.get(otherSub.id).custom_data = { ...sub.custom_data }
    assert.equal((await paddleWebhook('subscription.created', otherSub)).status, 200)
    assert.equal((await fileDb.findSubscriptionById(out.subscriptionId)).paddleSubscriptionId, sub.id)
  })

  it('alta que en realidad se pagó: al reintentar se activa en vez de abrir otra', async () => {
    const c = await customer('pagada-sin-aviso@test.com')
    const first = await openCheckout(c, 'hosted_starter')
    pd.pay(first.transactionId) // pagó, pero ningún webhook llegó todavía
    const again = await c.agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly', provider: 'paddle' })
    assert.equal(again.status, 409)
    assert.equal((await c.me()).plan, 'hosted_starter')
  })

  it('un cobro de LAB que no se puede asociar a un acceso avisa al dueño para reembolsar', async () => {
    const ghost = {
      id: 'txn_ghost_lab',
      status: 'completed',
      currency_code: 'USD',
      customer_id: 'ctm_ghost',
      subscription_id: 'sub_ghost',
      custom_data: { kind: 'lab', subscriptionId: 'f'.repeat(24), userId: 'u' },
      details: { totals: { grand_total: '7900', total: '7900' } },
      billing_period: { ends_at: '2026-11-01T00:00:00Z' },
      items: [],
    }
    assert.equal((await paddleWebhook('transaction.completed', ghost)).status, 200)
    await waitFor(() => alerts('COBRO DE LAB SIN SUSCRIPCIÓN').length === 1, 'el aviso de cobro sin suscripción')
    const [mail] = alerts('COBRO DE LAB SIN SUSCRIPCIÓN')
    assert.match(mail.body.text, /txn_ghost_lab/)
    assert.match(mail.body.text, /79 USD/)
    await paddleWebhook('transaction.completed', ghost)
    await new Promise((r) => setTimeout(r, 80))
    const keys = alerts('COBRO DE LAB SIN SUSCRIPCIÓN').map((m) => m.idempotencyKey)
    assert.equal(new Set(keys).size, 1, keys.join(' | '))
  })

  it('un cobro sobre una suscripción dada de baja avisa para reembolsar (antes solo el log)', async () => {
    const c = await customer('cobro-baja@test.com')
    const out = await openCheckout(c, 'hosted_starter')
    const { psub } = await payCheckout(out.transactionId)
    await c.goTo(7)
    await renews(psub)
    await c.goTo(10)
    assert.equal((await c.agent.post('/api/subscriptions/cancel')).status, 200)
    // Paddle cobra igual (p. ej. un cobro que ya estaba en curso).
    await c.goTo(38, 1)
    const txn = await renews(psub)
    await waitFor(() => alerts('COBRO DE LAB SOBRE UNA BAJA').some((m) => m.body.text.includes(txn.id)), 'el aviso de cobro sobre una baja')
  })

  it('alta rechazada en el checkout: un mail después de la espera, si no se pagó', async () => {
    const c = await customer('alta-rechazada@test.com')
    const out = await openCheckout(c, 'hosted_pro')
    const txn = pd.decline(out.transactionId)
    assert.equal((await paddleWebhook('transaction.payment_failed', txn)).status, 200)
    assert.equal(c.mails().length, 0)
    assert.equal((await sweep({ config, now: new Date(Date.now() + DELAY + 1000) })).sent, 1)
    assert.equal((await sweep({ config, now: new Date(Date.now() + DELAY + 2000) })).sent, 0)
    const mails = c.mails()
    assert.equal(mails.length, 1)
    assert.match(mails[0].body.subject, /no se activó/)
  })
})
