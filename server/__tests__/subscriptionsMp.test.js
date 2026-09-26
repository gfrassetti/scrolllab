import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import {
  createFakeMercadoPago,
  startAppAgainstFakeMp,
  waitFor,
} from './helpers/fakeMercadoPago.js'

/**
 * Rutas de suscripción con MercadoPago "real" (mock apagado). MP es un doble
 * en memoria detrás del `fetch` global (`helpers/fakeMercadoPago.js`), así
 * corren los caminos que el modo mock no toca: `start_date` en el alta, fallas
 * de MP al dar de alta o de baja, altas abandonadas, webhooks firmados y mails.
 */
describe('Suscripciones contra MP (doble en memoria)', () => {
  const DAY = 86_400_000
  const iso = (d) => new Date(d).toISOString()
  const mp = createFakeMercadoPago()
  let app
  let fileDb
  let loginAs
  let webhook
  let cleanup

  before(async () => {
    ;({ app, fileDb, loginAs, webhook, cleanup } = await startAppAgainstFakeMp(mp))
  })

  after(() => cleanup())

  const lastPreapproval = () => mp.lastPreapproval()
  const lastCall = (method, resource) => mp.lastCall(method, resource)

  /** Alta completa: POST → el usuario autoriza en MP → vuelve y sincroniza. */
  async function subscribeAndAuthorize(agent, plan = 'hosted_pro', cycle = 'monthly') {
    const res = await agent.post('/api/subscriptions').send({ plan, cycle })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const pre = lastPreapproval()
    pre.status = 'authorized'
    const synced = await agent.post('/api/subscriptions/sync')
    assert.equal(synced.body.status, 'authorized')
    return { res, pre }
  }

  it('alta con prueba: el primer cobro va como start_date a 7 días, sin free_trial', async () => {
    const agent = await loginAs('mp-trial@test.com')
    const res = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(res.status, 200)
    assert.match(res.body.init_point, /^https:\/\/mp\.test\/checkout\//)

    const call = lastCall('POST', 'preapproval')
    const ar = call.body.auto_recurring
    assert.equal('free_trial' in ar, false)
    const days = (new Date(ar.start_date) - Date.now()) / DAY
    assert.ok(days > 6.9 && days < 7.1, `start_date a ${days} días`)
    assert.equal(ar.transaction_amount, 99900)
    assert.equal(ar.frequency_type, 'months')
    assert.equal(call.body.status, 'pending')
    assert.match(call.body.back_url, /\/lab\?suscripcion=volver$/)

    // Vuelve del checkout con MP ya autorizado → sync → período = fin de prueba.
    lastPreapproval().status = 'authorized'
    await agent.post('/api/subscriptions/sync')
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.trialing, true)
    assert.equal(iso(me.body.currentPeriodEnd), iso(ar.start_date))
  })

  it('alta anual: le llega a MP como 12 meses (MP rechaza "years") y se puede contratar', async () => {
    const agent = await loginAs('mp-yearly@test.com')
    const res = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_studio', cycle: 'yearly' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.ok(res.body.init_point)
    const ar = lastCall('POST', 'preapproval').body.auto_recurring
    assert.equal(ar.frequency, 12)
    assert.equal(ar.frequency_type, 'months')
    assert.equal(ar.transaction_amount, 2999000)
    const days = (new Date(ar.start_date) - Date.now()) / DAY
    assert.ok(days > 6.9 && days < 7.1, 'también arranca con la prueba gratis')
  })

  it('MP rechaza el alta → 502 claro, y el reintento no queda bloqueado', async () => {
    const agent = await loginAs('mp-createfail@test.com')
    mp.failNext['POST /preapproval'] = 400
    const first = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(first.status, 502)
    assert.match(first.body.error, /Mercado Pago/)

    const second = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(second.status, 200)
    assert.ok(second.body.init_point)
    assert.ok(second.body.trialEndsAt, 'el intento fallido no consume la prueba')
  })

  it('checkout abandonado (p. ej. tarjeta rechazada): el reintento cancela el pendiente en MP y abre otro', async () => {
    const agent = await loginAs('mp-abandon@test.com')
    await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly' })
    const old = lastPreapproval()

    const retry = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(retry.status, 200)
    assert.equal(mp.preapprovals.get(old.id).status, 'cancelled')
    assert.notEqual(lastPreapproval().id, old.id)
    assert.ok(retry.body.trialEndsAt)

    // El webhook de esa baja no convierte el alta vieja en "suscripción real".
    assert.equal((await webhook('subscription_preapproval', old.id)).status, 200)
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.trialAvailable, true)
  })

  it('si el checkout "abandonado" en realidad se completó, no abre otro: 409 y queda activa', async () => {
    const agent = await loginAs('mp-completed@test.com')
    await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly' })
    lastPreapproval().status = 'authorized'
    const count = mp.preapprovals.size

    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(again.status, 409)
    assert.equal(mp.preapprovals.size, count)
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
  })

  it('cancelar: si MP no da de baja → 502 y NO queda cancelada; al reintentar, sí', async () => {
    const agent = await loginAs('mp-cancelfail@test.com')
    const { pre } = await subscribeAndAuthorize(agent)

    mp.failNext['PUT /preapproval'] = 400
    const failed = await agent.post('/api/subscriptions/cancel')
    assert.equal(failed.status, 502)
    let me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.canceledAt, null)
    assert.equal(mp.preapprovals.get(pre.id).status, 'authorized')

    const ok = await agent.post('/api/subscriptions/cancel')
    assert.equal(ok.status, 200)
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
    me = await agent.get('/api/subscriptions/me')
    assert.ok(me.body.canceledAt)
  })

  it('baja + webhook firmado de MP ("cancelled") → sigue con acceso hasta el fin de lo pagado', async () => {
    const agent = await loginAs('mp-cancelwebhook@test.com')
    const { pre } = await subscribeAndAuthorize(agent)
    const before = (await agent.get('/api/subscriptions/me')).body

    await agent.post('/api/subscriptions/cancel')
    const hook = await webhook('subscription_preapproval', pre.id)
    assert.equal(hook.status, 200)

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.ok(me.body.canceledAt)
    assert.equal(iso(me.body.currentPeriodEnd), iso(before.currentPeriodEnd))
  })

  it('baja desde la app de MP (sin pasar por nosotros) → webhook marca la baja y respeta lo pagado', async () => {
    const agent = await loginAs('mp-cancelfrommp@test.com')
    const { pre } = await subscribeAndAuthorize(agent)
    pre.status = 'cancelled'
    await webhook('subscription_preapproval', pre.id)

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.ok(me.body.canceledAt)
  })

  it('re-suscribirse tras cancelar (p. ej. pasar a anual): el primer cobro es cuando termina lo pagado', async () => {
    const agent = await loginAs('mp-resub@test.com')
    await subscribeAndAuthorize(agent)
    const paidUntil = (await agent.get('/api/subscriptions/me')).body.currentPeriodEnd
    await agent.post('/api/subscriptions/cancel')

    const res = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'yearly' })
    assert.equal(res.status, 200)
    const ar = lastCall('POST', 'preapproval').body.auto_recurring
    assert.equal(ar.frequency, 12)
    assert.equal(ar.frequency_type, 'months')
    assert.equal(ar.transaction_amount, 999000)
    assert.equal(iso(ar.start_date), iso(paidUntil))
    assert.equal(res.body.trialEndsAt, null)

    lastPreapproval().status = 'authorized'
    await agent.post('/api/subscriptions/sync')
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.cycle, 'yearly')
    assert.equal(me.body.canceledAt, null)
    assert.equal(iso(me.body.currentPeriodEnd), iso(paidUntil))
  })

  it('renovación caída: re-suscribirse da de baja la vieja en MP ANTES de abrir otra', async () => {
    const agent = await loginAs('mp-lapsed@test.com')
    const { res, pre } = await subscribeAndAuthorize(agent)
    const row = await fileDb.findSubscriptionById(res.body.subscriptionId)
    row.lastPaidAt = iso(Date.now() - 60 * DAY)
    row.currentPeriodEnd = iso(Date.now() - 30 * DAY)
    await row.save()
    assert.equal((await agent.get('/api/subscriptions/me')).body.lapsedPlan, 'hosted_pro')

    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    assert.equal(again.status, 200)
    assert.equal(mp.preapprovals.get(pre.id).status, 'cancelled')
    const putIdx = mp.calls.findLastIndex((c) => c.method === 'PUT' && c.id === pre.id)
    const postIdx = mp.calls.findLastIndex((c) => c.method === 'POST')
    assert.ok(putIdx < postIdx, 'la baja de la vieja va antes del alta nueva')
  })

  it('renovación caída y MP no deja dar de baja la vieja → 502 sin abrir otra (no hay doble cobro)', async () => {
    const agent = await loginAs('mp-lapsedfail@test.com')
    const { res } = await subscribeAndAuthorize(agent)
    const row = await fileDb.findSubscriptionById(res.body.subscriptionId)
    row.lastPaidAt = iso(Date.now() - 60 * DAY)
    row.currentPeriodEnd = iso(Date.now() - 30 * DAY)
    await row.save()

    const count = mp.preapprovals.size
    mp.failNext['PUT /preapproval'] = 400
    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    assert.equal(again.status, 502)
    assert.equal(mp.preapprovals.size, count)
  })

  it('webhook de cobro aprobado entregado dos veces → un solo período', async () => {
    const agent = await loginAs('mp-dup@test.com')
    const { pre } = await subscribeAndAuthorize(agent)
    const debit = '2026-10-02T15:00:00.000Z'
    mp.authorizedPayments.set('ap900', {
      id: 'ap900',
      preapproval_id: pre.id,
      status: 'processed',
      debit_date: debit,
      payment: { id: 1, status: 'approved', transaction_amount: 99900 },
    })

    assert.equal((await webhook('subscription_authorized_payment', 'ap900')).status, 200)
    assert.equal((await webhook('subscription_authorized_payment', 'ap900')).status, 200)
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(iso(me.body.currentPeriodEnd), '2026-11-02T15:00:00.000Z')
  })

  it('webhook de cuota rechazada: no extiende y la UI ve el pago fallido', async () => {
    const agent = await loginAs('mp-rejected@test.com')
    const { res, pre } = await subscribeAndAuthorize(agent)
    const row = await fileDb.findSubscriptionById(res.body.subscriptionId)
    row.lastPaidAt = iso(Date.now() - 31 * DAY)
    row.currentPeriodEnd = iso(Date.now() - DAY)
    row.trialEndsAt = undefined
    await row.save()
    mp.authorizedPayments.set('ap901', {
      id: 'ap901',
      preapproval_id: pre.id,
      status: 'recycling',
      payment: { id: 2, status: 'rejected' },
    })

    await webhook('subscription_authorized_payment', 'ap901')
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro') // en gracia
    assert.equal(me.body.pastDue, true)
    assert.equal(me.body.paymentFailed, true)
  })

  // ——— Mails (Resend interceptado) ———

  const mailsTo = (email) => mp.mailsTo(email)
  // Los mails salen fire-and-forget: margen para que uno de más se note.
  const settle = () => new Promise((r) => setTimeout(r, 250))

  it('mail al suscribirse y mail al cancelar: le llegan al usuario, una sola vez cada uno', async () => {
    const email = 'mp-mails@test.com'
    const agent = await loginAs(email)
    const { pre } = await subscribeAndAuthorize(agent)

    await waitFor(() => mailsTo(email).length >= 1, 'el mail de bienvenida')
    const [welcome] = mailsTo(email)
    assert.equal(welcome.path, '/emails')
    assert.deepEqual(welcome.body.to, [email])
    assert.match(welcome.body.subject, /prueba gratis de ScrollLab LAB/)
    assert.match(welcome.body.text, /no se te cobra nada hasta ese día/)
    assert.ok(welcome.idempotencyKey?.startsWith('scrolllab-sub-welcome-'))

    // Eventos repetidos (otro sync, el webhook de MP) no lo reenvían.
    await agent.post('/api/subscriptions/sync')
    await webhook('subscription_preapproval', pre.id)
    await settle()
    assert.equal(mailsTo(email).length, 1)

    assert.equal((await agent.post('/api/subscriptions/cancel')).status, 200)
    await waitFor(() => mailsTo(email).length >= 2, 'el mail de baja')
    const canceled = mailsTo(email)[1]
    assert.match(canceled.body.subject, /Cancelaste tu suscripción/)
    assert.match(canceled.body.text, /no se te cobra nada/)
    assert.ok(canceled.idempotencyKey?.startsWith('scrolllab-sub-canceled-'))

    // El webhook "cancelled" que MP manda después tampoco lo duplica.
    await webhook('subscription_preapproval', pre.id)
    await settle()
    assert.equal(mailsTo(email).length, 2)
  })

  it('baja desde la app de MP: también le llega el mail de baja', async () => {
    const email = 'mp-mails-mpcancel@test.com'
    const agent = await loginAs(email)
    const { pre } = await subscribeAndAuthorize(agent)
    await waitFor(() => mailsTo(email).length >= 1, 'el mail de bienvenida')

    pre.status = 'cancelled'
    await webhook('subscription_preapproval', pre.id)
    await waitFor(() => mailsTo(email).length >= 2, 'el mail de baja')
    assert.match(mailsTo(email)[1].body.subject, /Cancelaste tu suscripción/)
  })

  it('si MP no confirma la baja, no sale el mail de baja (no se promete algo que no pasó)', async () => {
    const email = 'mp-mails-cancelfail@test.com'
    const agent = await loginAs(email)
    await subscribeAndAuthorize(agent)
    await waitFor(() => mailsTo(email).length >= 1, 'el mail de bienvenida')

    mp.failNext['PUT /preapproval'] = 400
    assert.equal((await agent.post('/api/subscriptions/cancel')).status, 502)
    await settle()
    assert.equal(mailsTo(email).length, 1)
  })

  it('webhook con firma inválida → 401 y no toca nada', async () => {
    const res = await request(app)
      .post('/api/webhooks/mercadopago?type=subscription_preapproval&data.id=pre1')
      .set({ 'x-signature': 'ts=1,v1=deadbeef', 'x-request-id': 'x' })
      .send({})
    assert.equal(res.status, 401)
  })
})
