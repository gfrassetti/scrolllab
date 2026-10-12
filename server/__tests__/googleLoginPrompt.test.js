import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

/**
 * El selector de cuentas de Google (server/http/routes/auth.js). Cerrar sesión
 * en SCROLLLAB no cierra la de Google, así que sin `prompt=select_account` Google
 * devolvía la misma cuenta en silencio y no se podía cambiar. Solo se pide
 * después de un logout o cuando el link lo pide: el login de siempre es de un
 * clic.
 */
describe('login con Google: selector de cuentas', () => {
  const ORIGIN = 'http://localhost:5173'
  let app
  let storageDir

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.AUTH_DEV_ENABLED = 'true'
    process.env.MP_MOCK_ENABLED = 'true'
    process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
    process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
    process.env.CLIENT_URL = ORIGIN
    process.env.API_PUBLIC_URL = 'http://localhost:8787'
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:8787/api/auth/google/callback'
    process.env.FX_OFFLINE = 'true'
    process.env.RATE_LIMIT_DISABLED = 'true'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-google-prompt-'))
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

  const startLogin = (agent, query = '') => agent.get(`/api/auth/google${query}`)
  const promptOf = (res) => new URL(res.headers.location).searchParams.get('prompt')

  it('el login normal va derecho a Google, sin selector (un clic)', async () => {
    const res = await startLogin(request.agent(app))
    assert.equal(res.status, 302)
    assert.match(res.headers.location, /^https:\/\/accounts\.google\.com\//)
    assert.equal(promptOf(res), null)
  })

  it('con ?prompt=select_account (link «Usar otra cuenta») pide el selector', async () => {
    const res = await startLogin(request.agent(app), '?prompt=select_account')
    assert.equal(res.status, 302)
    assert.equal(promptOf(res), 'select_account')
  })

  it('otro valor de prompt no se reenvía a Google', async () => {
    const res = await startLogin(request.agent(app), '?prompt=consent')
    assert.equal(promptOf(res), null)
  })

  it('después de cerrar sesión, el próximo login muestra el selector', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').set('Origin', ORIGIN).send({ email: 'sale@test.com' })
    assert.ok((await agent.get('/api/auth/me')).body.user)

    const out = await agent.post('/api/auth/logout').set('Origin', ORIGIN)
    assert.equal(out.status, 200)
    const cookies = out.headers['set-cookie'] || []
    assert.ok(
      cookies.some((c) => c.startsWith('scrolllab_pick_account=1')),
      `cookie de «elegí cuenta»: ${cookies.join(' | ')}`,
    )
    assert.ok(cookies.some((c) => /HttpOnly/i.test(c) && c.startsWith('scrolllab_pick_account')))

    // El mismo navegador (el agente guarda la cookie) vuelve a entrar.
    const res = await startLogin(agent)
    assert.equal(res.status, 302)
    assert.equal(promptOf(res), 'select_account')
  })

  it('un navegador que nunca cerró sesión no recibe la marca', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').set('Origin', ORIGIN).send({ email: 'sigue@test.com' })
    const res = await startLogin(agent)
    assert.equal(promptOf(res), null)
  })
})
