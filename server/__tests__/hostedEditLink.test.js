import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

/**
 * Link de edición: el cliente del dueño edita un widget sin cuenta. Lo que
 * importa acá es el borde: qué puede y qué no puede hacer quien tiene el link.
 */
describe('LAB — link de edición del cliente', () => {
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
    process.env.HOSTED_FREE_QUOTA = '50'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-editlink-'))
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

  async function login(email) {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').send({ email, name: 'Dueño' })
    return agent
  }

  async function widget(agent, { publish = false } = {}) {
    const created = await agent.post('/api/hosted').send({ sectionId: 'chapters/FooterCTA' })
    assert.equal(created.status, 201)
    const id = created.body.instance.id
    const put = await agent
      .put(`/api/hosted/${id}`)
      .send({ draftProps: { ctaWord: 'DUEÑO' }, domains: ['cliente.com'], ...(publish ? { publish: true } : {}) })
    assert.equal(put.status, 200)
    return { id, key: created.body.instance.key }
  }

  async function link(agent, id) {
    const r = await agent.post(`/api/hosted/${id}/edit-link`)
    assert.equal(r.status, 201)
    assert.match(r.body.token, /^ed_[a-f0-9]{48}$/)
    return r.body.token
  }

  it('el dueño crea el link: el token viaja una vez y la instancia solo dice que hay link', async () => {
    const owner = await login('dueno1@test.com')
    const { id } = await widget(owner)
    const r = await owner.post(`/api/hosted/${id}/edit-link`)
    assert.equal(r.status, 201)
    assert.equal(r.body.instance.hasEditLink, true)
    assert.equal(JSON.stringify(r.body).includes('editTokenHash'), false)

    const again = await owner.get(`/api/hosted/${id}`)
    assert.equal(again.body.instance.hasEditLink, true)
    assert.equal(JSON.stringify(again.body).includes(r.body.token), false)
    assert.equal(JSON.stringify(again.body).includes('editTokenHash'), false)
  })

  it('en la base queda el hash, no el token', async () => {
    const owner = await login('dueno2@test.com')
    const { id } = await widget(owner)
    const token = await link(owner, id)
    const raw = fs.readFileSync(path.join(storageDir, 'db', 'hosted.json'), 'utf8')
    assert.equal(raw.includes(token), false)
    assert.match(raw, /"editTokenHash": ?"[a-f0-9]{64}"/)
  })

  it('con el link se lee el borrador y la sección, y nada de la cuenta ni de los dominios', async () => {
    const owner = await login('dueno3@test.com')
    const { id, key } = await widget(owner)
    const token = await link(owner, id)
    const r = await request(app).get(`/api/hosted-edit/${token}`)
    assert.equal(r.status, 200)
    assert.equal(r.headers['cache-control'], 'no-store')
    assert.equal(r.body.instance.sectionId, 'chapters/FooterCTA')
    assert.equal(r.body.instance.draftProps.ctaWord, 'DUEÑO')
    const text = JSON.stringify(r.body)
    for (const leak of ['domains', 'cliente.com', 'userId', 'dueno3@test.com', key, 'editTokenHash']) {
      assert.equal(text.includes(leak), false, `no debe filtrar ${leak}`)
    }
  })

  it('con el link se guarda el borrador, con los mismos filtros que el dueño', async () => {
    const owner = await login('dueno4@test.com')
    const { id } = await widget(owner)
    const token = await link(owner, id)
    const r = await request(app)
      .put(`/api/hosted-edit/${token}`)
      .send({
        draftProps: { ctaWord: 'CLIENTE', bg: 'red; background:url(//evil.test)', evil: 'x' },
      })
    assert.equal(r.status, 200)
    assert.equal(r.body.instance.draftProps.ctaWord, 'CLIENTE')
    assert.equal(r.body.instance.draftProps.bg, undefined)
    assert.equal(r.body.instance.draftProps.evil, undefined)
    const mine = await owner.get(`/api/hosted/${id}`)
    assert.equal(mine.body.instance.draftProps.ctaWord, 'CLIENTE')
  })

  it('con el link NO se tocan dominios, estado ni nada fuera del contenido', async () => {
    const owner = await login('dueno5@test.com')
    const { id } = await widget(owner, { publish: true })
    const token = await link(owner, id)
    const r = await request(app)
      .put(`/api/hosted-edit/${token}`)
      .send({ draftProps: { ctaWord: 'X' }, domains: ['otro.com'], unpublish: true, status: 'draft', userId: 'z' })
    assert.equal(r.status, 200)
    const mine = await owner.get(`/api/hosted/${id}`)
    assert.deepEqual(mine.body.instance.domains, ['cliente.com'])
    assert.equal(mine.body.instance.status, 'published')
  })

  it('republicar solo si el dueño ya lo publicó; si no, 409 y el borrador igual queda', async () => {
    const owner = await login('dueno6@test.com')
    const draft = await widget(owner)
    const t1 = await link(owner, draft.id)
    const no = await request(app).put(`/api/hosted-edit/${t1}`).send({ draftProps: { ctaWord: 'BORRADOR' }, publish: true })
    assert.equal(no.status, 409)
    assert.equal((await owner.get(`/api/hosted/${draft.id}`)).body.instance.status, 'draft')

    const live = await widget(owner, { publish: true })
    const t2 = await link(owner, live.id)
    const yes = await request(app).put(`/api/hosted-edit/${t2}`).send({ draftProps: { ctaWord: 'NUEVO' }, publish: true })
    assert.equal(yes.status, 200)
    const cfg = await request(app).get(`/api/embed/${live.key}/config`).set('Origin', 'https://cliente.com')
    assert.equal(cfg.status, 200)
    assert.equal(cfg.body.props.ctaWord, 'NUEVO')
  })

  it('un token mal formado o inexistente es 404, igual para los dos', async () => {
    for (const t of ['x', 'ed_' + 'a'.repeat(48), 'ed_' + 'g'.repeat(48), '../hosted', 'pub_' + 'a'.repeat(24)]) {
      const g = await request(app).get(`/api/hosted-edit/${encodeURIComponent(t)}`)
      const p = await request(app).put(`/api/hosted-edit/${encodeURIComponent(t)}`).send({ draftProps: {} })
      assert.equal(g.status, 404, t)
      assert.equal(p.status, 404, t)
    }
  })

  it('quitar el link lo corta; generar otro invalida el anterior', async () => {
    const owner = await login('dueno7@test.com')
    const { id } = await widget(owner)
    const first = await link(owner, id)
    assert.equal((await request(app).get(`/api/hosted-edit/${first}`)).status, 200)

    const second = await link(owner, id)
    assert.notEqual(first, second)
    assert.equal((await request(app).get(`/api/hosted-edit/${first}`)).status, 404)
    assert.equal((await request(app).get(`/api/hosted-edit/${second}`)).status, 200)

    const del = await owner.delete(`/api/hosted/${id}/edit-link`)
    assert.equal(del.status, 200)
    assert.equal(del.body.instance.hasEditLink, false)
    assert.equal((await request(app).get(`/api/hosted-edit/${second}`)).status, 404)
  })

  it('borrar el widget corta el link', async () => {
    const owner = await login('dueno8@test.com')
    const { id } = await widget(owner)
    const token = await link(owner, id)
    await owner.delete(`/api/hosted/${id}`)
    assert.equal((await request(app).get(`/api/hosted-edit/${token}`)).status, 404)
  })

  it('solo el dueño crea o quita el link; sin sesión, 401; de otro, 404', async () => {
    const owner = await login('dueno9@test.com')
    const { id } = await widget(owner)
    const stranger = await login('intruso@test.com')
    assert.equal((await request(app).post(`/api/hosted/${id}/edit-link`)).status, 401)
    assert.equal((await stranger.post(`/api/hosted/${id}/edit-link`)).status, 404)
    assert.equal((await stranger.delete(`/api/hosted/${id}/edit-link`)).status, 404)
    // y el link de un widget no abre el de otro
    const { id: other } = await widget(owner)
    const tok = await link(owner, id)
    const r = await request(app).get(`/api/hosted-edit/${tok}`)
    assert.equal(r.status, 200)
    assert.notEqual(other, id)
  })

  it('un widget suspendido no se edita con el link', async () => {
    const owner = await login('dueno10@test.com')
    const { id } = await widget(owner, { publish: true })
    const token = await link(owner, id)
    const s = await request(app).post(`/api/hosted/${id}/suspend`).set('x-admin-token', 'test-admin-tok')
    assert.equal(s.status, 200)
    assert.equal((await request(app).get(`/api/hosted-edit/${token}`)).status, 403)
    assert.equal((await request(app).put(`/api/hosted-edit/${token}`).send({ draftProps: {} })).status, 403)
  })
})
