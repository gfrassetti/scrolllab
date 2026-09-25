import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import crypto from 'node:crypto'
import request from 'supertest'

/**
 * Rutas de suscripción con MercadoPago "real" (mock apagado). MP es un doble
 * en memoria detrás del `fetch` global — lo usan el SDK y
 * `fetchAuthorizedPayment` —, así corren los caminos que el modo mock no
 * toca: `start_date` en el alta, fallas de MP al dar de alta o de baja, altas
 * abandonadas y webhooks firmados.
 */
describe('Suscripciones contra MP (doble en memoria)', () => {
  let app
  let storageDir
  let fileDb
  const SECRET = 'whsec_subs_test_secret_value'
  const DAY = 86_400_000
  const iso = (d) => new Date(d).toISOString()
  const realFetch = globalThis.fetch

  const mp = {
    preapprovals: new Map(),
    authorizedPayments: new Map(),
    calls: [],
    failNext: {},
    seq: 0,
  }

  const json = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  async function fakeMp(url, init = {}) {
    const u = new URL(String(url))
    if (u.hostname !== 'api.mercadopago.com') return realFetch(url, init)
    const method = String(init.method || 'GET').toUpperCase()
    const body = init.body ? JSON.parse(init.body) : null
    const [resource, id] = u.pathname.split('/').filter(Boolean)
    const route = `${method} /${resource}`
    mp.calls.push({ method, resource, id, body })

    const fail = mp.failNext[route]
    if (fail) {
      delete mp.failNext[route]
      return json(fail, { message: 'fake MP error', status: fail })
    }
    if (resource === 'preapproval' && method === 'POST') {
      const pre = {
        id: `pre${++mp.seq}`,
        status: body.status || 'pending',
        init_point: `https://mp.test/checkout/pre${mp.seq}`,
        external_reference: body.external_reference,
        auto_recurring: body.auto_recurring,
        next_payment_date: body.auto_recurring?.start_date || new Date().toISOString(),
      }
      mp.preapprovals.set(pre.id, pre)
      return json(201, pre)
    }
    if (resource === 'preapproval' && id) {
      const pre = mp.preapprovals.get(id)
      if (!pre) return json(404, { message: 'not found', status: 404 })
      if (method === 'PUT') Object.assign(pre, body)
      return json(200, pre)
    }
    if (resource === 'authorized_payments' && id) {
      const ap = mp.authorizedPayments.get(id)
      return ap ? json(200, ap) : json(404, { message: 'not found', status: 404 })
    }
    return json(404, { message: `ruta desconocida ${route}`, status: 404 })
  }

  before(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'development',
      STORE: 'file',
      AUTH_DEV_ENABLED: 'true',
      MP_MOCK_ENABLED: 'false',
      MP_ACCESS_TOKEN: 'TEST-fake-access-token',
      MP_WEBHOOK_SECRET: SECRET,
      SESSION_SECRET: 'test-session-secret-min-24-chars',
      DOWNLOAD_SECRET: 'test-download-secret-min-24-chars',
      CLIENT_URL: 'http://localhost:5173',
      API_PUBLIC_URL: 'http://localhost:8787',
      FX_OFFLINE: 'true',
      FX_FALLBACK_RATE: '1560',
      HOSTED_FREE_QUOTA: '1',
      RATE_LIMIT_DISABLED: 'true',
    })
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-subs-mp-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')

    const { loadConfig } = await import('../config.js')
    const config = loadConfig()
    config.storageDir = storageDir
    config.store = 'file'
    config.authDev = true
    config.mpMock = false

    const { createApp } = await import('../app.js')
    app = await createApp(config)
    ;({ fileDb } = await import('../fileStore.js'))
    globalThis.fetch = fakeMp
  })

  after(() => {
    globalThis.fetch = realFetch
    try {
      fs.rmSync(storageDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  async function loginAs(email) {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').send({ email })
    return agent
  }

  const lastPreapproval = () => [...mp.preapprovals.values()].at(-1)
  const lastCall = (method, resource) =>
    mp.calls.findLast((c) => c.method === method && c.resource === resource)

  function signed(dataId) {
    const ts = String(Date.now())
    const requestId = crypto.randomUUID()
    const v1 = crypto
      .createHmac('sha256', SECRET)
      .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
      .digest('hex')
    return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId }
  }

  const webhook = (type, dataId) =>
    request(app)
      .post(`/api/webhooks/mercadopago?type=${type}&data.id=${dataId}`)
      .set(signed(dataId))
      .send({ type, data: { id: dataId } })

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
    assert.equal(ar.frequency_type, 'years')
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

  it('webhook con firma inválida → 401 y no toca nada', async () => {
    const res = await request(app)
      .post('/api/webhooks/mercadopago?type=subscription_preapproval&data.id=pre1')
      .set({ 'x-signature': 'ts=1,v1=deadbeef', 'x-request-id': 'x' })
      .send({})
    assert.equal(res.status, 401)
  })
})
