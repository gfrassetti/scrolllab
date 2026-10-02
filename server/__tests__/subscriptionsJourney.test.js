import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import {
  createFakeMercadoPago,
  startAppAgainstFakeMp,
  waitFor,
} from './helpers/fakeMercadoPago.js'

/**
 * Recorridos completos de un cliente de LAB con el reloj simulado: alta con
 * prueba gratis, cobro del día 7, renovaciones, cambios de plan, bajas y
 * cobros rechazados. MP es el doble en memoria: `mp.bill` hace lo que MP hace
 * en la fecha de cobro y después llegan sus webhooks firmados, como en prod.
 */
describe('Recorridos de suscripción (reloj simulado)', () => {
  const HOUR = 3_600_000
  const DAY = 24 * HOUR
  // Jueves 1/10 15:00 UTC: lejos de fin de mes (los meses de 28-31 días no
  // mueven las fechas esperadas).
  const T0 = Date.parse('2026-10-01T15:00:00.000Z')
  const at = (day, hour = 0) => new Date(T0 + day * DAY + hour * HOUR).toISOString()
  const iso = (d) => new Date(d).toISOString()

  const mp = createFakeMercadoPago()
  let app
  let loginAs
  let webhook
  let cleanup
  let fileDb

  before(async () => {
    mock.timers.enable({ apis: ['Date'], now: T0 })
    ;({ app, loginAs, webhook, cleanup, fileDb } = await startAppAgainstFakeMp(mp))
  })

  after(() => {
    mock.timers.reset()
    cleanup()
  })

  /** Un cliente nuevo, logueado el día 0 del recorrido. */
  async function customer(email) {
    mock.timers.setTime(T0)
    const agent = await loginAs(email)
    return {
      agent,
      email,
      // Pasa el tiempo. La sesión dura 14 días: vuelve a entrar.
      async goTo(day, hour = 0) {
        mock.timers.setTime(T0 + day * DAY + hour * HOUR)
        await agent.post('/api/auth/dev-login').send({ email })
      },
      me: async () => (await agent.get('/api/subscriptions/me')).body,
      mails: () => mp.mailsTo(email),
    }
  }

  /** Alta desde /lab → autoriza en el checkout de MP → vuelve y sincroniza. */
  async function subscribe(c, plan, cycle = 'monthly') {
    const res = await c.agent.post('/api/subscriptions').send({ plan, cycle })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const pre = mp.lastPreapproval()
    mp.authorize(pre.id)
    const synced = await c.agent.post('/api/subscriptions/sync')
    assert.equal(synced.body.status, 'authorized')
    return { pre, res }
  }

  /** MP cobra la cuota que vence y avisa (webhooks de preapproval y de pago). */
  async function mpCharges(pre, { approved = true } = {}) {
    const ap = mp.bill(pre.id, { approved })
    assert.equal((await webhook('subscription_preapproval', pre.id)).status, 200)
    assert.equal((await webhook('subscription_authorized_payment', ap.id)).status, 200)
    return ap
  }

  async function mpRetries(ap, { approved = true } = {}) {
    mp.retry(ap.id, { approved })
    assert.equal((await webhook('subscription_authorized_payment', ap.id)).status, 200)
  }

  async function publish(c) {
    // Un minuto entre publicaciones, como en la vida real: con el reloj
    // congelado todas nacerían en el mismo ms y "la más vieja" (la que sigue
    // en vivo si el plan cae) se desempataría por id.
    mock.timers.setTime(Date.now() + 60_000)
    const created = await c.agent.post('/api/hosted').send({ sectionId: 'chapters/FooterCTA' })
    const res = await c.agent
      .put(`/api/hosted/${created.body.instance.id}`)
      .send({ draftProps: { ctaWord: 'X' }, publish: true })
    return res
  }

  const embedStatus = (key) =>
    request(app)
      .get(`/api/embed/${key}/config`)
      .then((r) => r.status)

  it('compra completa Pro mensual: prueba 7 días → cobro del día 7 → renovación → baja → acceso hasta el fin → vence', async () => {
    const c = await customer('journey-full@test.com')
    const { pre } = await subscribe(c, 'hosted_pro')

    // Día 0: prueba gratis. MP agenda el primer cobro para el día 7 y no cobra nada.
    assert.equal(mp.lastCall('POST', 'preapproval').body.auto_recurring.start_date, at(7))
    let me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.trialing, true)
    assert.equal(me.quota, 15)
    assert.equal(iso(me.currentPeriodEnd), at(7))
    assert.equal(mp.charges(pre.id).length, 0)
    await waitFor(() => c.mails().length === 1, 'el mail de bienvenida')
    assert.match(c.mails()[0].body.subject, /prueba gratis/)

    const keys = []
    for (let i = 0; i < 3; i++) {
      const r = await publish(c)
      assert.equal(r.status, 200)
      keys.push(r.body.instance.key)
    }

    await c.goTo(3)
    assert.equal((await c.me()).trialing, true)

    // Día 7: MP cobra el primer mes.
    await c.goTo(7, 1)
    await mpCharges(pre)
    me = await c.me()
    assert.equal(me.trialing, false)
    assert.equal(me.pastDue, false)
    assert.equal(iso(me.currentPeriodEnd), '2026-11-08T15:00:00.000Z')

    // Un mes después: renueva sola.
    await c.goTo(38, 1)
    await mpCharges(pre)
    me = await c.me()
    assert.equal(iso(me.currentPeriodEnd), '2026-12-08T15:00:00.000Z')
    assert.equal(mp.charges(pre.id).length, 2)
    assert.ok(mp.charges(pre.id).every((a) => a.transaction_amount === 99900))

    // Día 50: cancela. Sigue con acceso hasta lo pagado (8/12).
    await c.goTo(50)
    const cancel = await c.agent.post('/api/subscriptions/cancel')
    assert.equal(cancel.status, 200)
    assert.equal(iso(cancel.body.endsAt), '2026-12-08T15:00:00.000Z')
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
    await webhook('subscription_preapproval', pre.id) // MP avisa la baja
    me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.ok(me.canceledAt)
    await waitFor(() => c.mails().length === 2, 'el mail de baja')
    assert.match(c.mails()[1].body.text, /hasta el 8 de diciembre de 2026/)
    assert.match(c.mails()[1].body.text, /No se te va a cobrar de nuevo/)

    await c.goTo(67)
    assert.equal((await c.me()).plan, 'hosted_pro')
    for (const key of keys) assert.equal(await embedStatus(key), 200)

    // Vence: pasa a free. Queda en vivo la más vieja (tope gratis = 1).
    await c.goTo(68, 1)
    me = await c.me()
    assert.equal(me.plan, 'free')
    assert.equal(me.lapsedPlan, null)
    assert.deepEqual(
      await Promise.all(keys.map(embedStatus)),
      [200, 402, 402],
    )
    // MP ya no puede cobrarle: la baja está hecha.
    assert.throws(() => mp.bill(pre.id))
    assert.equal(mp.charges(pre.id).length, 2)
  })

  it('se arrepiente en la prueba: cancela el día 3 → nunca se cobra → el día 7 queda en free', async () => {
    const c = await customer('journey-regret@test.com')
    const { pre } = await subscribe(c, 'hosted_starter')

    await c.goTo(3)
    const cancel = await c.agent.post('/api/subscriptions/cancel')
    assert.equal(cancel.status, 200)
    assert.equal(iso(cancel.body.endsAt), at(7))
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
    await waitFor(() => c.mails().length === 2, 'el mail de baja')
    assert.match(c.mails()[1].body.text, /Cancelaste durante la prueba gratis: no se te cobra nada/)
    assert.equal((await c.me()).plan, 'hosted_starter') // usa lo que queda de la prueba

    await c.goTo(7, 1)
    assert.equal((await c.me()).plan, 'free')
    assert.throws(() => mp.bill(pre.id))
    assert.equal(mp.charges(pre.id).length, 0)

    // La prueba era una sola: si vuelve, se cobra desde el alta.
    const again = await c.agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    assert.equal(again.body.trialEndsAt, null)
    assert.equal('start_date' in mp.lastCall('POST', 'preapproval').body.auto_recurring, false)
  })

  it('cancela en la prueba y reactiva: el cobro sigue siendo el día 7, una sola vez', async () => {
    const c = await customer('journey-reactivate@test.com')
    const { pre: first } = await subscribe(c, 'hosted_pro')

    await c.goTo(3)
    await c.agent.post('/api/subscriptions/cancel')
    await c.goTo(4)
    const { pre: second, res } = await subscribe(c, 'hosted_pro')
    assert.equal(res.body.trialEndsAt, null) // no es otra prueba
    assert.equal(mp.lastCall('POST', 'preapproval').body.auto_recurring.start_date, at(7))
    let me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.canceledAt, null)

    await c.goTo(7, 1)
    await mpCharges(second)
    me = await c.me()
    assert.equal(iso(me.currentPeriodEnd), '2026-11-08T15:00:00.000Z')
    assert.equal(mp.charges(second.id).length, 1)
    assert.equal(mp.charges(first.id).length, 0)
  })

  it('tarjeta rechazada el día 7: 1 día de margen, suspendido, y vuelve solo cuando MP logra cobrar', async () => {
    const c = await customer('journey-rejected-first@test.com')
    const { pre } = await subscribe(c, 'hosted_pro')
    const keys = [(await publish(c)).body.instance.key, (await publish(c)).body.instance.key]

    await c.goTo(7, 1)
    const ap = await mpCharges(pre, { approved: false })
    let me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.pastDue, true)
    assert.equal(me.paymentFailed, true)
    assert.equal(iso(me.graceEndsAt), at(8))

    await c.goTo(8, 2)
    me = await c.me()
    assert.equal(me.plan, 'free')
    assert.equal(me.lapsedPlan, 'hosted_pro')
    assert.deepEqual(await Promise.all(keys.map(embedStatus)), [200, 402])

    // MP reintenta (hasta 4 veces en 10 días) y esta vez entra.
    await c.goTo(10)
    await mpRetries(ap)
    me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.pastDue, false)
    assert.equal(me.paymentFailed, false)
    assert.equal(iso(me.currentPeriodEnd), '2026-11-08T15:00:00.000Z')
    assert.deepEqual(await Promise.all(keys.map(embedStatus)), [200, 200])
    assert.equal(mp.charges(pre.id).length, 1)
  })

  it('renovación rechazada de un cliente que ya pagaba: 7 días de gracia; si MP no cobra y da de baja, queda free', async () => {
    const c = await customer('journey-rejected-renewal@test.com')
    const { pre } = await subscribe(c, 'hosted_pro')
    const key = (await publish(c)).body.instance.key
    await c.goTo(7, 1)
    await mpCharges(pre)

    await c.goTo(38, 1)
    await mpCharges(pre, { approved: false })
    let me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.pastDue, true)
    assert.equal(me.paymentFailed, true)
    assert.equal(iso(me.graceEndsAt), '2026-11-15T15:00:00.000Z')

    await c.goTo(44)
    assert.equal((await c.me()).plan, 'hosted_pro') // en gracia, su sitio sigue andando
    assert.equal(await embedStatus(key), 200)

    await c.goTo(45, 1)
    me = await c.me()
    assert.equal(me.plan, 'free')
    assert.equal(me.lapsedPlan, 'hosted_pro')

    // MP da de baja tras las cuotas rechazadas y avisa.
    mp.preapprovals.get(pre.id).status = 'cancelled'
    await webhook('subscription_preapproval', pre.id)
    me = await c.me()
    assert.equal(me.plan, 'free')
    assert.equal(me.lapsedPlan, null)
    assert.equal(mp.charges(pre.id).length, 1)
  })

  it('suspendido que prefiere no seguir: cancela desde /account y MP deja de reintentar', async () => {
    const c = await customer('journey-lapsed-cancel@test.com')
    const { pre } = await subscribe(c, 'hosted_starter')
    await c.goTo(7, 1)
    const ap = await mpCharges(pre, { approved: false })

    await c.goTo(9)
    assert.equal((await c.me()).lapsedPlan, 'hosted_starter')
    const cancel = await c.agent.post('/api/subscriptions/cancel')
    assert.equal(cancel.status, 200)
    assert.equal(cancel.body.status, 'cancelled')
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
    assert.throws(() => mp.retry(ap.id))
    const me = await c.me()
    assert.equal(me.plan, 'free')
    assert.equal(me.lapsedPlan, null)
  })

  /** Pide subir de plan: tiene que abrir el checkout de la diferencia. */
  async function upgradeCheckout(c, plan, amount) {
    const change = await c.agent.post('/api/subscriptions/change').send({ plan })
    assert.equal(change.status, 200, JSON.stringify(change.body))
    assert.equal(change.body.requiresPayment, true)
    assert.equal(change.body.amount, amount)
    const pref = mp.lastPreference()
    assert.equal(change.body.init_point, pref.init_point)
    assert.equal(pref.items[0].unit_price, amount)
    return pref
  }

  it('sube de Starter a Pro a mitad de mes: paga la diferencia por los días que quedan y MP cobra Pro desde el próximo ciclo', async () => {
    const c = await customer('journey-upgrade@test.com')
    const { pre } = await subscribe(c, 'hosted_starter')
    await c.goTo(7, 1)
    await mpCharges(pre) // pagó Starter del 8/10 al 8/11

    for (let i = 0; i < 5; i++) assert.equal((await publish(c)).status, 200)
    assert.equal((await publish(c)).status, 402)

    // 21/10: quedan 18 de los 31 días pagos → (99.900 − 24.900) × 18/31.
    await c.goTo(20)
    const quote = await c.agent.get('/api/subscriptions/change/quote?plan=hosted_pro')
    assert.equal(quote.status, 200)
    assert.equal(quote.body.amount, 43549)
    assert.equal(quote.body.days, 18)
    assert.equal(quote.body.newPrice, 99900)
    assert.equal(iso(quote.body.priceEffectiveAt), '2026-11-08T15:00:00.000Z')

    const preapprovalsBefore = mp.preapprovals.size
    const pref = await upgradeCheckout(c, 'hosted_pro', 43549)
    assert.equal(pref.binary_mode, true)
    assert.match(pref.notification_url, /\/api\/webhooks\/mercadopago\?source=lab$/)
    assert.match(pref.back_urls.success, /\/lab\?upgrade=volver$/)
    assert.ok(new Date(pref.expiration_date_to) > new Date())
    // Dos clicks no abren dos checkouts.
    await upgradeCheckout(c, 'hosted_pro', 43549)
    assert.equal(mp.lastPreference().id, pref.id)
    // Hasta que paga, sigue en Starter.
    assert.equal((await c.me()).plan, 'hosted_starter')
    assert.equal((await publish(c)).status, 402)

    const payment = mp.pay(pref.id)
    assert.equal((await webhook('payment', payment.id, { source: 'lab' })).status, 200)
    const me = await c.me()
    assert.equal(me.plan, 'hosted_pro')
    assert.equal(me.quota, 15)
    assert.equal((await publish(c)).status, 200)
    // Cambia el monto de la MISMA suscripción: no hay otra que cobre Starter aparte.
    assert.equal(mp.preapprovals.size, preapprovalsBefore)
    assert.equal(mp.preapprovals.get(pre.id).status, 'authorized')
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, 99900)

    // Volver de MP después del webhook, o el webhook repetido: no aplica dos veces.
    const confirm = await c.agent
      .post('/api/subscriptions/upgrade/confirm')
      .send({ paymentId: payment.id })
    assert.equal(confirm.status, 200)
    assert.equal(confirm.body.alreadyApplied, true)
    assert.equal((await webhook('payment', payment.id, { source: 'lab' })).status, 200)
    const sub = await fileDb.findSubscriptionByPreapproval(pre.id)
    assert.equal(sub.upgradePayments.length, 1)

    await c.goTo(38, 1)
    await mpCharges(pre)
    assert.deepEqual(
      mp.charges(pre.id).map((a) => a.transaction_amount),
      [24900, 99900],
    )
  })

  it('vuelve de MP sin webhook: el confirm aplica el plan; si MP no responde al actualizar el monto, no se marca nada y el reintento entra', async () => {
    const c = await customer('journey-upgrade-confirm@test.com')
    const { pre } = await subscribe(c, 'hosted_starter')
    await c.goTo(7, 1)
    await mpCharges(pre)

    await c.goTo(15) // 16/10: quedan 23 de 31 días → 275.000 × 23/31
    const payment = mp.pay((await upgradeCheckout(c, 'hosted_studio', 204033)).id)

    mp.failNext['PUT /preapproval'] = 400
    const failed = await c.agent
      .post('/api/subscriptions/upgrade/confirm')
      .send({ paymentId: payment.id })
    assert.equal(failed.status, 502)
    assert.equal((await c.me()).plan, 'hosted_starter')
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, 24900)

    const ok = await c.agent
      .post('/api/subscriptions/upgrade/confirm')
      .send({ paymentId: payment.id })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.plan, 'hosted_studio')
    assert.equal(ok.body.alreadyApplied, false)
    assert.equal((await c.me()).plan, 'hosted_studio')
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, 299900)

    // Otra cuenta no puede usar ese pago.
    const intruder = await loginAs('journey-intruder@test.com')
    const stolen = await intruder
      .post('/api/subscriptions/upgrade/confirm')
      .send({ paymentId: payment.id })
    assert.equal(stolen.status, 403)
  })

  it('en la prueba gratis cambiar de plan no cobra nada: el primer cobro ya sale con el precio nuevo', async () => {
    const c = await customer('journey-upgrade-trial@test.com')
    const { pre } = await subscribe(c, 'hosted_starter')
    await c.goTo(3)
    const quote = await c.agent.get('/api/subscriptions/change/quote?plan=hosted_studio')
    assert.equal(quote.body.amount, 0)
    assert.equal(quote.body.trialing, true)

    const prefsBefore = mp.preferences.size
    const change = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_studio' })
    assert.equal(change.status, 200)
    assert.equal(change.body.requiresPayment, false)
    assert.equal(mp.preferences.size, prefsBefore)
    assert.equal((await c.me()).plan, 'hosted_studio')

    await c.goTo(7, 1)
    await mpCharges(pre)
    assert.deepEqual(mp.charges(pre.id).map((a) => a.transaction_amount), [299900])
  })

  it('anual: subir de Starter a Studio al día siguiente del cobro cuesta la diferencia de casi todo el año', async () => {
    const c = await customer('journey-upgrade-yearly@test.com')
    const { pre } = await subscribe(c, 'hosted_starter', 'yearly')
    await c.goTo(7, 1)
    await mpCharges(pre) // pagó 249.000 hasta el 8/10/2027

    // 9/10 16:00: quedan 364 días menos 1 h de 365 → 2.750.000 × 8735/8760.
    await c.goTo(8, 1)
    const payment = mp.pay((await upgradeCheckout(c, 'hosted_studio', 2742152)).id)
    assert.equal((await webhook('payment', payment.id, { source: 'lab' })).status, 200)
    assert.equal((await c.me()).plan, 'hosted_studio')
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, 2999000)
  })

  it('baja de plan y vuelve a subir en el mismo período: no paga dos veces lo que ya pagó', async () => {
    const c = await customer('journey-down-up@test.com')
    const { pre } = await subscribe(c, 'hosted_pro')
    await c.goTo(7, 1)
    await mpCharges(pre) // pagó Pro hasta el 8/11

    await c.goTo(10)
    const down = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_starter' })
    assert.equal(down.body.requiresPayment, false)
    assert.equal((await c.me()).plan, 'hosted_starter')

    await c.goTo(12)
    const back = await c.agent.get('/api/subscriptions/change/quote?plan=hosted_pro')
    assert.equal(back.body.amount, 0)
    const up = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
    assert.equal(up.body.requiresPayment, false)
    assert.equal((await c.me()).plan, 'hosted_pro')
    // A Studio sí: la diferencia con Pro (lo pagado), 26 de 31 días.
    const studio = await c.agent.get('/api/subscriptions/change/quote?plan=hosted_studio')
    assert.equal(studio.body.amount, 167742)
  })

  it('cancelado con días pagos: no se re-suscribe a un plan más caro sin pagar la diferencia; reactiva y sube pagándola', async () => {
    const c = await customer('journey-carry-upgrade@test.com')
    const { pre } = await subscribe(c, 'hosted_starter')
    await c.goTo(7, 1)
    await mpCharges(pre) // Starter pago hasta el 8/11
    await c.goTo(15)
    assert.equal((await c.agent.post('/api/subscriptions/cancel')).status, 200)

    const preapprovalsBefore = mp.preapprovals.size
    const higher = await c.agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_studio', cycle: 'monthly' })
    assert.equal(higher.status, 409)
    assert.match(higher.body.error, /reactivalo/)
    assert.equal(mp.preapprovals.size, preapprovalsBefore)

    // Reactiva Starter (primer cobro al fin de lo pagado) y sube a Pro.
    const { pre: again } = await subscribe(c, 'hosted_starter')
    assert.equal(
      mp.lastCall('POST', 'preapproval').body.auto_recurring.start_date,
      '2026-11-08T15:00:00.000Z',
    )
    // 16/10: quedan 23 de los 31 días que pagó con la suscripción vieja.
    const payment = mp.pay((await upgradeCheckout(c, 'hosted_pro', 55646)).id)
    assert.equal((await webhook('payment', payment.id, { source: 'lab' })).status, 200)
    assert.equal((await c.me()).plan, 'hosted_pro')
    // El monto nuevo va a la suscripción nueva: su primer cobro ya sale con Pro.
    assert.equal(mp.preapprovals.get(again.id).auto_recurring.transaction_amount, 99900)

    await c.goTo(38, 1)
    await mpCharges(again)
    assert.deepEqual(mp.charges(again.id).map((a) => a.transaction_amount), [99900])
    assert.equal(mp.charges(pre.id).length, 1)
  })

  it('un pago de diferencia que no corresponde no cambia el plan: monto distinto, o suscripción dada de baja (queda para reembolsar)', async () => {
    const c = await customer('journey-upgrade-orphan@test.com')
    const { pre } = await subscribe(c, 'hosted_starter')
    await c.goTo(7, 1)
    await mpCharges(pre)
    await c.goTo(12)
    const pref = await upgradeCheckout(c, 'hosted_pro', 62904)

    const wrong = mp.pay(pref.id, { amount: 1000 })
    assert.equal((await webhook('payment', wrong.id, { source: 'lab' })).status, 200)
    assert.equal((await c.me()).plan, 'hosted_starter')

    // Cancela con el checkout abierto y después paga.
    assert.equal((await c.agent.post('/api/subscriptions/cancel')).status, 200)
    const late = mp.pay(pref.id)
    assert.equal((await webhook('payment', late.id, { source: 'lab' })).status, 200)
    const me = await c.me()
    assert.equal(me.plan, 'hosted_starter')
    assert.ok(me.canceledAt)
    const sub = await fileDb.findSubscriptionByPreapproval(pre.id)
    assert.deepEqual(
      sub.upgradePayments.map((p) => [p.paymentId, p.outcome]),
      [[String(late.id), 'refund']],
    )
    // Tampoco sube de plan pagando otra vez.
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, 24900)
  })

  it('pasa de mensual a anual sin pagar dos veces: el anual empieza a cobrarse cuando termina el mes pagado', async () => {
    const c = await customer('journey-yearly@test.com')
    const { pre: monthly } = await subscribe(c, 'hosted_pro')
    await c.goTo(7, 1)
    await mpCharges(monthly) // pagó hasta el 8/11

    await c.goTo(15)
    assert.equal((await c.agent.post('/api/subscriptions/cancel')).status, 200)
    const { pre: yearly } = await subscribe(c, 'hosted_pro', 'yearly')
    const ar = mp.lastCall('POST', 'preapproval').body.auto_recurring
    assert.equal(ar.frequency, 12) // MP no acepta 'years': el anual son 12 meses
    assert.equal(ar.frequency_type, 'months')
    assert.equal(ar.transaction_amount, 999000)
    assert.equal(ar.start_date, '2026-11-08T15:00:00.000Z')
    let me = await c.me()
    assert.equal(me.cycle, 'yearly')
    assert.equal(me.canceledAt, null)
    assert.equal(iso(me.currentPeriodEnd), '2026-11-08T15:00:00.000Z')

    await c.goTo(38, 1)
    await mpCharges(yearly)
    me = await c.me()
    assert.equal(iso(me.currentPeriodEnd), '2027-11-08T15:00:00.000Z')
    assert.equal(mp.charges(monthly.id).length, 1)
    assert.equal(mp.charges(yearly.id).length, 1)
    assert.throws(() => mp.bill(monthly.id)) // el mensual ya no cobra
  })
})
