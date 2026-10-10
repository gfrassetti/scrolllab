import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

/**
 * Packs de LAB: varias instancias bajo un solo `<script data-pack>`. El pack
 * no guarda props ni suma cupo; el endpoint público devuelve, en orden, las
 * keys que hoy se sirven (mismas reglas que el config de cada una).
 */
describe('LAB packs (file store)', () => {
  let app
  let config
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
    process.env.HOSTED_FREE_QUOTA = '50'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-packs-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')

    const { loadConfig } = await import('../config.js')
    config = loadConfig()
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

  async function loginAgent(email) {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').send({ email, name: 'Packer' })
    return agent
  }

  async function widget(agent, sectionId, { publish = true } = {}) {
    const created = await agent.post('/api/hosted').send({ sectionId })
    assert.equal(created.status, 201)
    const inst = created.body.instance
    if (publish) {
      const pub = await agent.put(`/api/hosted/${inst.id}`).send({ publish: true })
      assert.equal(pub.status, 200)
    }
    return inst
  }

  const servedKeys = async (packKey, origin) => {
    const req = request(app).get(`/api/embed/pack/${packKey}`)
    if (origin) req.set('Origin', origin)
    return req
  }

  it('sirve en orden solo las publicadas; reordenar cambia la página', async () => {
    const agent = await loginAgent('packer@test.com')
    const a = await widget(agent, 'chapters/FooterCTA')
    const b = await widget(agent, 'chapters/BigNumbers')
    const draft = await widget(agent, 'atelier/KeyFacts', { publish: false })

    const created = await agent
      .post('/api/hosted-packs')
      .send({ name: '  Home   page ', items: [b.id, draft.id, a.id, b.id] })
    assert.equal(created.status, 201)
    const pack = created.body.pack
    assert.match(pack.key, /^pk_[a-f0-9]{24}$/)
    assert.equal(pack.name, 'Home page')
    assert.deepEqual(pack.items, [b.id, draft.id, a.id], 'sin repetidos, en el orden pedido')

    const served = await servedKeys(pack.key)
    assert.equal(served.status, 200)
    assert.equal(served.headers['access-control-allow-origin'], '*')
    assert.deepEqual(served.body.keys, [b.key, a.key], 'el borrador no deja hueco')

    const reordered = await agent.put(`/api/hosted-packs/${pack.id}`).send({ items: [a.id, b.id] })
    assert.equal(reordered.status, 200)
    assert.deepEqual((await servedKeys(pack.key)).body.keys, [a.key, b.key])

    // Publicar el borrador lo suma solo (el pack referencia, no copia).
    await agent.put(`/api/hosted-packs/${pack.id}`).send({ items: [a.id, draft.id, b.id] })
    await agent.put(`/api/hosted/${draft.id}`).send({ publish: true })
    assert.deepEqual((await servedKeys(pack.key)).body.keys, [a.key, draft.key, b.key])

    const list = await agent.get('/api/hosted-packs')
    assert.equal(list.status, 200)
    assert.equal(list.body.packs.length, 1)
    assert.equal(list.body.maxItems, 30)
  })

  it('una congelada por el plan no se sirve dentro del pack', async () => {
    const agent = await loginAgent('frozen-pack@test.com')
    const older = await widget(agent, 'chapters/FooterCTA')
    const newer = await widget(agent, 'chapters/BigNumbers')
    const pack = (await agent.post('/api/hosted-packs').send({ items: [newer.id, older.id] })).body.pack

    const before = config.hostedFreeQuota
    config.hostedFreeQuota = 1 // el plan cubre solo la más vieja
    try {
      assert.deepEqual((await servedKeys(pack.key)).body.keys, [older.key])
    } finally {
      config.hostedFreeQuota = before
    }
    assert.deepEqual((await servedKeys(pack.key)).body.keys, [newer.key, older.key])
  })

  it('dominios: el pack y cada sección respetan su allowlist', async () => {
    const agent = await loginAgent('domains-pack@test.com')
    const a = await widget(agent, 'chapters/FooterCTA')
    const b = await widget(agent, 'chapters/BigNumbers')
    const pack = (await agent.post('/api/hosted-packs').send({ items: [a.id, b.id] })).body.pack

    const locked = await agent
      .put(`/api/hosted-packs/${pack.id}`)
      .send({ domains: ['https://www.cliente.com/landing', 'nope nope'] })
    assert.deepEqual(locked.body.pack.domains, ['cliente.com'])

    assert.equal((await servedKeys(pack.key, 'https://otro.com')).status, 403)
    assert.equal((await servedKeys(pack.key)).status, 403, 'sin Origin no pasa un pack con lock')
    const ok = await servedKeys(pack.key, 'https://www.cliente.com')
    assert.equal(ok.status, 200)
    assert.deepEqual(ok.body.keys, [a.key, b.key])

    // Una sección con su propio lock a otro dominio queda afuera del pack.
    await agent.put(`/api/hosted/${b.id}`).send({ domains: ['otro.com'] })
    assert.deepEqual((await servedKeys(pack.key, 'https://cliente.com')).body.keys, [a.key])
  })

  it('solo secciones propias; borrar una la saca del pack; borrar el pack mata la key', async () => {
    const owner = await loginAgent('owner-pack@test.com')
    const intruder = await loginAgent('intruder-pack@test.com')
    const mine = await widget(owner, 'chapters/FooterCTA')
    const theirs = await widget(intruder, 'chapters/BigNumbers')

    const bad = await owner.post('/api/hosted-packs').send({ items: [mine.id, theirs.id] })
    assert.equal(bad.status, 400)
    assert.match(bad.body.error, /no es tuyo/)
    assert.equal((await owner.post('/api/hosted-packs').send({ items: 'x' })).status, 400)

    const pack = (await owner.post('/api/hosted-packs').send({ items: [mine.id] })).body.pack

    // Otra cuenta no lo ve ni lo toca.
    assert.equal((await intruder.get(`/api/hosted-packs/${pack.id}`)).status, 404)
    assert.equal((await intruder.put(`/api/hosted-packs/${pack.id}`).send({ name: 'x' })).status, 404)
    assert.equal((await intruder.delete(`/api/hosted-packs/${pack.id}`)).status, 404)
    assert.equal((await request(app).get('/api/hosted-packs')).status, 401)

    await owner.delete(`/api/hosted/${mine.id}`)
    const after = await owner.get(`/api/hosted-packs/${pack.id}`)
    assert.deepEqual(after.body.pack.items, [])
    assert.deepEqual((await servedKeys(pack.key)).body.keys, [])

    assert.equal((await owner.delete(`/api/hosted-packs/${pack.id}`)).status, 200)
    assert.equal((await servedKeys(pack.key)).status, 404)
    assert.equal((await servedKeys('pk_nope')).status, 404)
  })
})
