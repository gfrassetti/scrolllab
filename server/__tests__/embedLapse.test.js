import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

// Garantía de negocio: sin suscripción paga, el embed NO se ve.
// Con HOSTED_FREE_QUOTA=0 (no hay tier gratis publicable), cancelar +
// vencer el período tiene que dejar 402 a TODAS las instancias del dueño,
// no solo a las que exceden un tope. Re-suscribirse las revive.
describe('Embed: se apaga cuando cae la suscripción (HOSTED_FREE_QUOTA=0)', () => {
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
    process.env.HOSTED_FREE_QUOTA = '0'
    process.env.RATE_LIMIT_DISABLED = 'true'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-lapse-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')

    const { loadConfig } = await import('../config.js')
    const config = loadConfig()
    config.storageDir = storageDir
    config.store = 'file'
    config.authDev = true
    config.mpMock = true
    assert.equal(config.hostedFreeQuota, 0)

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
    const res = await agent
      .put(`/api/hosted/${body.instance.id}`)
      .send({ draftProps: { ctaWord: 'X' }, publish: true })
    assert.equal(res.status, 200, `publish falló: ${JSON.stringify(res.body)}`)
    return res.body.instance.key
  }

  const configStatus = (key) =>
    request(app)
      .get(`/api/embed/${key}/config`)
      .then((r) => r.status)

  it('cancelar + vencer el período apaga TODAS las instancias; re-suscribir las revive', async () => {
    const agent = await loginAs('lapse@test.com')

    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    const keyA = await publish(agent)
    const keyB = await publish(agent)

    // Con plan activo, las dos sirven.
    assert.equal(await configStatus(keyA), 200)
    assert.equal(await configStatus(keyB), 200)

    // Cancela: MP no renueva, pero pagó el período → sigue viéndose.
    const cancel = await agent.post('/api/subscriptions/cancel')
    assert.equal(cancel.status, 200)
    assert.equal(await configStatus(keyA), 200)
    assert.equal(await configStatus(keyB), 200)

    // Pasa el fin de período.
    const { fileDb } = await import('../fileStore.js')
    const s = await fileDb.findSubscriptionById(sub.body.subscriptionId)
    s.currentPeriodEnd = new Date(Date.now() - 1000).toISOString()
    await s.save()

    // Sin tier gratis: NINGUNA instancia se sirve. El embed desaparece.
    assert.equal(await configStatus(keyA), 402)
    assert.equal(await configStatus(keyB), 402)

    // Re-suscribirse las revive sin tocar su status.
    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(again.body.activateUrl)

    assert.equal(await configStatus(keyA), 200)
    assert.equal(await configStatus(keyB), 200)
  })

  it('período vencido sin cancelar (impago) también apaga todo', async () => {
    const agent = await loginAs('unpaid@test.com')

    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    const key = await publish(agent)
    assert.equal(await configStatus(key), 200)

    // La renovación no llegó: el período quedó en el pasado, sin canceledAt.
    const { fileDb } = await import('../fileStore.js')
    const s = await fileDb.findSubscriptionById(sub.body.subscriptionId)
    s.currentPeriodEnd = new Date(Date.now() - 1000).toISOString()
    await s.save()

    assert.equal(await configStatus(key), 402)
  })
})
