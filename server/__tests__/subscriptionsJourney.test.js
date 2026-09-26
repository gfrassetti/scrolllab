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

  before(async () => {
    mock.timers.enable({ apis: ['Date'], now: T0 })
    ;({ app, loginAs, webhook, cleanup } = await startAppAgainstFakeMp(mp))
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

  it('renovación rechazada de un cliente que ya pagaba: 10 días de gracia; si MP no cobra y da de baja, queda free', async () => {
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
    assert.equal(iso(me.graceEndsAt), '2026-11-18T15:00:00.000Z')

    await c.goTo(45)
    assert.equal((await c.me()).plan, 'hosted_pro') // en gracia, su sitio sigue andando
    assert.equal(await embedStatus(key), 200)

    await c.goTo(48, 1)
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

  it('sube de Starter a Pro a mitad de mes: la cuota nueva rige ya y MP cobra el precio nuevo desde el próximo ciclo', async () => {
    const c = await customer('journey-upgrade@test.com')
    const { pre } = await subscribe(c, 'hosted_starter')
    await c.goTo(7, 1)
    await mpCharges(pre)

    for (let i = 0; i < 5; i++) assert.equal((await publish(c)).status, 200)
    assert.equal((await publish(c)).status, 402)

    await c.goTo(20)
    const change = await c.agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
    assert.equal(change.status, 200)
    assert.equal((await c.me()).quota, 15)
    assert.equal((await publish(c)).status, 200)
    assert.equal(mp.preapprovals.get(pre.id).auto_recurring.transaction_amount, 99900)

    await c.goTo(38, 1)
    await mpCharges(pre)
    assert.deepEqual(
      mp.charges(pre.id).map((a) => a.transaction_amount),
      [24900, 99900],
    )
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
