import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

/**
 * Proyectos del builder: composiciones guardadas en la cuenta. La receta pasa
 * por la misma validación que el checkout; un proyecto puede estar vacío.
 */
describe('Proyectos del builder (file store)', () => {
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
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-projects-'))
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

  async function login(email) {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').set('Origin', config.clientUrl).send({ email, name: 'Maker' })
    const send = (method, url, body) => agent[method](url).set('Origin', config.clientUrl).send(body)
    return { agent, send }
  }

  it('crear (vacío o con receta), guardar cambios, listar y borrar', async () => {
    const { send } = await login('maker@test.com')

    const empty = await send('post', '/api/builder-projects', { name: '  Landing   verano ' })
    assert.equal(empty.status, 201)
    assert.equal(empty.body.project.name, 'Landing verano')
    assert.deepEqual(empty.body.project.recipe, [])

    const full = await send('post', '/api/builder-projects', {
      name: 'Home',
      recipe: [{ id: 'chapters/HeroKinetic', props: { lineOne: 'Hola', onClick: 'alert(1)' } }, { id: 'chapters/FooterCTA' }],
    })
    assert.equal(full.status, 201)
    // Misma limpieza que el checkout: la prop que la sección no declara no se guarda.
    assert.deepEqual(full.body.project.recipe, [
      { id: 'chapters/HeroKinetic', props: { lineOne: 'Hola' } },
      { id: 'chapters/FooterCTA' },
    ])

    const id = full.body.project.id
    const saved = await send('put', `/api/builder-projects/${id}`, { recipe: [{ id: 'nocturne/SplitReveals' }] })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.project.sections, 1)
    const renamed = await send('put', `/api/builder-projects/${id}`, { name: 'Home v2' })
    assert.equal(renamed.body.project.name, 'Home v2')
    assert.equal(renamed.body.project.sections, 1, 'renombrar no toca la receta')

    const list = await send('get', '/api/builder-projects')
    assert.equal(list.status, 200)
    assert.equal(list.body.projects.length, 2)
    assert.equal(list.body.projects[0].id, id, 'el último guardado, primero')
    assert.equal(list.body.projects[0].recipe, undefined, 'la lista no trae recetas')

    const one = await send('get', `/api/builder-projects/${id}`)
    assert.deepEqual(one.body.project.recipe, [{ id: 'nocturne/SplitReveals' }])

    assert.equal((await send('delete', `/api/builder-projects/${id}`)).status, 200)
    assert.equal((await send('get', `/api/builder-projects/${id}`)).status, 404)
  })

  it('la receta se valida como en el checkout', async () => {
    const { send } = await login('valid@test.com')
    const bad = await send('post', '/api/builder-projects', { recipe: [{ id: 'nope/Nada' }] })
    assert.equal(bad.status, 400)
    const hidden = await send('post', '/api/builder-projects', { recipe: [{ id: 'ratio/HeroTools' }] })
    assert.equal(hidden.status, 400, 'una sección fuera del builder no se guarda')
    const notList = await send('post', '/api/builder-projects', { recipe: 'x' })
    assert.equal(notList.status, 400)
    const tooBig = await send('post', '/api/builder-projects', {
      recipe: Array.from({ length: 31 }, () => ({ id: 'chapters/HeroKinetic' })),
    })
    assert.equal(tooBig.status, 400)
  })

  it('solo el dueño; sin sesión, nada; tope por cuenta', async () => {
    const owner = await login('owner-proj@test.com')
    const other = await login('other-proj@test.com')
    const { body } = await owner.send('post', '/api/builder-projects', { name: 'Mío' })
    const id = body.project.id
    assert.equal((await other.send('get', `/api/builder-projects/${id}`)).status, 404)
    assert.equal((await other.send('put', `/api/builder-projects/${id}`, { name: 'x' })).status, 404)
    assert.equal((await other.send('delete', `/api/builder-projects/${id}`)).status, 404)
    assert.equal((await request(app).get('/api/builder-projects')).status, 401)

    const { MAX_BUILDER_PROJECTS } = await import('../services/builderProjects.js')
    for (let i = 1; i < MAX_BUILDER_PROJECTS; i++) {
      const r = await owner.send('post', '/api/builder-projects', { name: `P${i}` })
      assert.equal(r.status, 201)
    }
    const over = await owner.send('post', '/api/builder-projects', { name: 'Uno más' })
    assert.equal(over.status, 400)
    assert.match(over.body.error, /hasta 30 proyectos/)
  })
})
