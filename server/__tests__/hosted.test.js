import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

describe('Hosted Component API (file store)', () => {
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
    process.env.FX_SPREAD_PCT = '0'
    process.env.ADMIN_TOKEN = 'test-admin-tok'
    process.env.HOSTED_FREE_QUOTA = '50' // la cuota se prueba en subscriptions.test.js
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-hosted-'))
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

  async function loginAgent() {
    const agent = request.agent(app)
    await agent
      .post('/api/auth/dev-login')
      .send({ email: 'hoster@test.com', name: 'Hoster' })
    return agent
  }

  it('crear → editar → publicar → servir config pública', async () => {
    const agent = await loginAgent()

    const created = await agent
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })
    assert.equal(created.status, 201)
    const inst = created.body.instance
    assert.match(inst.key, /^pub_[a-f0-9]{24}$/)
    assert.equal(inst.status, 'draft')
    assert.equal(inst.sectionId, 'chapters/FooterCTA')

    // antes de publicar, el config público no existe
    const early = await request(app).get(`/api/embed/${inst.key}/config`)
    assert.equal(early.status, 409)

    const edited = await agent
      .put(`/api/hosted/${inst.id}`)
      .send({
        draftProps: { ctaWord: 'HABLEMOS', email: 'hola@demo.com', legal: 'x' },
        publish: true,
      })
    assert.equal(edited.status, 200)
    assert.equal(edited.body.instance.status, 'published')

    // config pública, sin auth, con CORS abierto
    const pub = await request(app).get(`/api/embed/${inst.key}/config`)
    assert.equal(pub.status, 200)
    assert.equal(pub.headers['access-control-allow-origin'], '*')
    assert.equal(pub.body.sectionId, 'chapters/FooterCTA')
    assert.equal(pub.body.props.ctaWord, 'HABLEMOS')
    assert.equal(pub.body.props.email, 'hola@demo.com')
  })

  it('rechaza secciones no hosteables', async () => {
    const agent = await loginAgent()
    const res = await agent
      .post('/api/hosted')
      .send({ sectionId: 'nocturne/HeroCinematic' })
    assert.equal(res.status, 400)
  })

  it('domain-lock: 403 fuera del allowlist, 200 dentro', async () => {
    const agent = await loginAgent()
    const { body } = await agent
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })
    const { id, key } = body.instance

    await agent.put(`/api/hosted/${id}`).send({
      draftProps: { ctaWord: 'HI' },
      domains: ['cliente.com'],
      publish: true,
    })

    const blocked = await request(app)
      .get(`/api/embed/${key}/config`)
      .set('Origin', 'https://otro-sitio.com')
    assert.equal(blocked.status, 403)

    const ok = await request(app)
      .get(`/api/embed/${key}/config`)
      .set('Origin', 'https://www.cliente.com')
    assert.equal(ok.status, 200)
  })

  it('no se puede tocar la instancia de otro usuario', async () => {
    const a = await loginAgent()
    const { body } = await a
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })

    const b = request.agent(app)
    await b
      .post('/api/auth/dev-login')
      .send({ email: 'intruso@test.com', name: 'Intruso' })
    const res = await b.get(`/api/hosted/${body.instance.id}`)
    assert.equal(res.status, 404)
  })

  it('cuenta vistas al servir el config', async () => {
    const agent = await loginAgent()
    const { body } = await agent
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })
    const { id, key } = body.instance
    await agent
      .put(`/api/hosted/${id}`)
      .send({ draftProps: { ctaWord: 'X' }, publish: true })

    await request(app).get(`/api/embed/${key}/config`)
    await request(app).get(`/api/embed/${key}/config`)

    const got = await agent.get(`/api/hosted/${id}`)
    assert.equal(got.body.instance.views, 2)
  })

  it('admin suspende y reactiva con x-admin-token', async () => {
    const agent = await loginAgent()
    const { body } = await agent
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })
    const { id, key } = body.instance
    await agent
      .put(`/api/hosted/${id}`)
      .send({ draftProps: { ctaWord: 'X' }, publish: true })

    // sin token → 403
    const noTok = await request(app).post(`/api/hosted/${id}/suspend`)
    assert.equal(noTok.status, 403)

    const sus = await request(app)
      .post(`/api/hosted/${id}/suspend`)
      .set('x-admin-token', 'test-admin-tok')
    assert.equal(sus.status, 200)
    assert.equal(sus.body.instance.status, 'suspended')

    const cfg = await request(app).get(`/api/embed/${key}/config`)
    assert.equal(cfg.status, 402)

    const un = await request(app)
      .post(`/api/hosted/${id}/unsuspend`)
      .set('x-admin-token', 'test-admin-tok')
    assert.equal(un.body.instance.status, 'published')
  })

  it('GET /api/embed/loader devuelve version y url', async () => {
    const res = await request(app).get('/api/embed/loader')
    assert.equal(res.status, 200)
    assert.equal(res.body.version, 'v1')
    assert.match(res.body.url, /\/embed\/v1\/loader\.js$/)
  })

  it('listar y borrar', async () => {
    const agent = await loginAgent()
    const { body } = await agent
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })
    const id = body.instance.id

    const list = await agent.get('/api/hosted')
    assert.equal(list.status, 200)
    assert.ok(list.body.instances.some((i) => i.id === id))

    const del = await agent.delete(`/api/hosted/${id}`)
    assert.equal(del.status, 200)

    const gone = await agent.get(`/api/hosted/${id}`)
    assert.equal(gone.status, 404)
  })
})
