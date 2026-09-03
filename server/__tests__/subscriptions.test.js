import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

describe('Subscriptions + cuota (file store, mock MP)', () => {
  let app
  let storageDir

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.AUTH_DEV_ENABLED = 'true'
    process.env.MP_MOCK_ENABLED = 'true'
    process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
    process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
    process.env.CLIENT_URL = 'http://localhost:5173'
    process.env.API_PUBLIC_URL = 'http://localhost:8787'
    process.env.FX_OFFLINE = 'true'
    process.env.FX_FALLBACK_RATE = '1560'
    process.env.HOSTED_FREE_QUOTA = '1'
    process.env.RATE_LIMIT_DISABLED = 'true'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-subs-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')

    const { loadConfig } = await import('../config.js')
    const config = loadConfig()
    config.storageDir = storageDir
    config.store = 'file'
    config.authDev = true
    config.mpMock = true

    const { createApp } = await import('../app.js')
    app = await createApp(config)
  })

  after(() => {
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

  async function publish(agent, sectionId = 'chapters/FooterCTA') {
    const { body } = await agent.post('/api/hosted').send({ sectionId })
    return agent
      .put(`/api/hosted/${body.instance.id}`)
      .send({ draftProps: { ctaWord: 'X' }, publish: true })
  }

  it('plans es público y trae los 3 tiers', async () => {
    const res = await request(app).get('/api/subscriptions/plans')
    assert.equal(res.status, 200)
    assert.equal(res.body.plans.length, 3)
    assert.equal(res.body.mock, true)
    assert.ok(res.body.plans.every((p) => p.priceYearly < p.priceMonthly * 12))
  })

  it('sin suscripción: tier free con cuota = HOSTED_FREE_QUOTA', async () => {
    const agent = await loginAs('free@test.com')
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
    assert.equal(me.body.quota, 1)
  })

  it('la cuota frena el 2do publish y la suscripción lo destraba', async () => {
    const agent = await loginAs('quota@test.com')

    const first = await publish(agent)
    assert.equal(first.status, 200)

    const second = await publish(agent)
    assert.equal(second.status, 402)

    // suscribir (mock) + activar
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(sub.body.mock, true)
    const act = await agent.post(sub.body.activateUrl)
    assert.equal(act.body.status, 'authorized')

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.quota, 15)

    const third = await publish(agent)
    assert.equal(third.status, 200)
  })

  it('studio es ilimitado: quota llega null y nunca frena el publish', async () => {
    const agent = await loginAs('studio@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_studio', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_studio')
    // Infinity no es JSON válido — el borde HTTP lo manda como null, nunca
    // como el número silenciosamente distinto que produce JSON.stringify.
    assert.equal(me.body.quota, null)
    assert.equal(me.body.canPublish, true)

    const first = await publish(agent, 'chapters/FooterCTA')
    assert.equal(first.status, 200)
    const second = await publish(agent, 'chapters/FooterCTA')
    assert.equal(second.status, 200)
  })

  it('cancelar mantiene el plan hasta fin de período', async () => {
    const agent = await loginAs('cancel@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'yearly' })
    await agent.post(sub.body.activateUrl)

    let me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_starter')

    const cancel = await agent.post('/api/subscriptions/cancel')
    assert.equal(cancel.status, 200)
    assert.ok(cancel.body.endsAt)

    // sigue con acceso — canceló pero pagó el período
    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_starter')
    assert.ok(me.body.canceledAt)

    // y puede volver a suscribirse (la nueva reemplaza)
    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(again.status, 200)
  })

  it('cambiar de plan en el acto: sube la cuota, misma suscripción, sin dar de baja', async () => {
    const agent = await loginAs('change@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    const change = await agent
      .post('/api/subscriptions/change')
      .send({ plan: 'hosted_pro' })
    assert.equal(change.status, 200)
    assert.equal(change.body.plan, 'hosted_pro')
    assert.equal(change.body.previousPlan, 'hosted_starter')
    assert.equal(change.body.quota, 15)

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.quota, 15)
    assert.equal(me.body.subscriptionId, sub.body.subscriptionId) // no se dio de baja
    assert.equal(me.body.canceledAt, null)
  })

  it('bajar de plan se bloquea si ya publicaste más de lo que el nuevo permite', async () => {
    // Studio (sin tope) → publicamos 6 → intentar bajar a Starter (tope 5) → 402.
    const agent = await loginAs('downgrade@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_studio', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    for (let i = 0; i < 6; i++) {
      const p = await publish(agent)
      assert.equal(p.status, 200)
    }

    const bad = await agent
      .post('/api/subscriptions/change')
      .send({ plan: 'hosted_starter' })
    assert.equal(bad.status, 402)
    assert.match(bad.body.error, /[Dd]espublic/)

    // Sigue en Studio, intacto.
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_studio')
  })

  it('change: rechaza mismo plan, plan inválido y sin suscripción', async () => {
    const noSub = await loginAs('nosub-change@test.com')
    assert.equal(
      (await noSub.post('/api/subscriptions/change').send({ plan: 'hosted_pro' }))
        .status,
      404,
    )

    const agent = await loginAs('samep@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    assert.equal(
      (await agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' }))
        .status,
      409,
    )
    assert.equal(
      (await agent.post('/api/subscriptions/change').send({ plan: 'nope' }))
        .status,
      400,
    )
  })

  it('período vencido → vuelve a free (barrido perezoso)', async () => {
    const agent = await loginAs('expired@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    const { subscriptionId } = sub.body
    await agent.post(sub.body.activateUrl)

    // forzar vencimiento vía el store de archivo
    const { fileDb } = await import('../fileStore.js')
    const s = await fileDb.findSubscriptionById(subscriptionId)
    s.currentPeriodEnd = new Date(Date.now() - 1000).toISOString()
    await s.save()

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
  })

  it('rechaza un plan inválido', async () => {
    const agent = await loginAs('bad@test.com')
    const res = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_ultra', cycle: 'monthly' })
    assert.equal(res.status, 400)
  })

  it('no deja acumular altas: 2do POST sin activar → 409', async () => {
    const agent = await loginAs('dedup@test.com')
    const a = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(a.status, 200)
    const b = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(b.status, 409)
  })

  it('con suscripción activa, otro POST → 409', async () => {
    const agent = await loginAs('active409@test.com')
    const a = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(a.body.activateUrl)
    const b = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(b.status, 409)
  })

  it('sync está deshabilitado en modo mock → 403', async () => {
    const agent = await loginAs('syncmock@test.com')
    const res = await agent.post('/api/subscriptions/sync')
    assert.equal(res.status, 403)
  })

  // Webhook: la URL es la misma que Checkout Pro, ramifica por `type`. Acá el
  // token de subs no está seteado → la rama de subs corta en 200 antes de la
  // firma. Lo que se verifica es el ROUTING: un topic de subs no cae en la
  // rama de `payment` ni tira 500.
  it('webhook: topic de suscripción no cae en la rama de pago (200)', async () => {
    for (const type of [
      'subscription_preapproval',
      'subscription_authorized_payment',
    ]) {
      const res = await request(app)
        .post(`/api/webhooks/mercadopago?type=${type}&data.id=abc123`)
        .send({})
      assert.equal(res.status, 200, type)
    }
  })

  it('webhook: sin data.id → 200 sin procesar', async () => {
    const res = await request(app)
      .post('/api/webhooks/mercadopago?type=subscription_preapproval')
      .send({})
    assert.equal(res.status, 200)
  })

  it('webhook: type=payment sigue respondiendo 200 (mock)', async () => {
    const res = await request(app)
      .post('/api/webhooks/mercadopago?type=payment&data.id=1')
      .send({})
    assert.equal(res.status, 200)
  })

  it('cuando cae el plan, las publicadas sobre el tope free dejan de servir', async () => {
    const agent = await loginAs('freeze@test.com')

    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    const a = await publish(agent)
    const b = await publish(agent)
    assert.equal(a.status, 200)
    assert.equal(b.status, 200)
    const keyA = a.body.instance.key
    const keyB = b.body.instance.key

    // con plan activo, las dos sirven
    assert.equal((await request(app).get(`/api/embed/${keyA}/config`)).status, 200)
    assert.equal((await request(app).get(`/api/embed/${keyB}/config`)).status, 200)

    // vence el período → vuelve a free (quota = 1)
    const { fileDb } = await import('../fileStore.js')
    const s = await fileDb.findSubscriptionById(sub.body.subscriptionId)
    s.currentPeriodEnd = new Date(Date.now() - 1000).toISOString()
    await s.save()

    // la más vieja queda cubierta, la nueva se congela (402, como suspendida)
    assert.equal((await request(app).get(`/api/embed/${keyA}/config`)).status, 200)
    assert.equal((await request(app).get(`/api/embed/${keyB}/config`)).status, 402)

    // re-suscribirse las revive sin tocar nada más
    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(again.body.activateUrl)
    assert.equal((await request(app).get(`/api/embed/${keyB}/config`)).status, 200)
  })
})
