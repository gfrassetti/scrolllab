import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

/**
 * Vuelta de Google (server/auth/passport.js): qué cuenta corresponde a un
 * perfil. La regla que importa es anti-takeover: solo se vincula por email una
 * cuenta que todavía no tiene Google.
 */
describe('resolveGoogleUser', () => {
  let dir
  let db
  let resolveGoogleUser

  const profile = (id, email, extra = {}) => ({
    id,
    emails: email ? [{ value: email }] : [],
    displayName: extra.name,
    photos: extra.photo ? [{ value: extra.photo }] : [],
  })

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-google-'))
    process.env.STORAGE_DIR = dir
    process.env.FILE_DB_DIR = path.join(dir, 'db')
    db = (await import('../db.js')).db
    ;({ resolveGoogleUser } = await import('../auth/passport.js'))
  })

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('crea la cuenta si no hay ni googleId ni email', async () => {
    const user = await resolveGoogleUser(profile('g-new', 'nueva@x.com', { name: 'Nueva', photo: 'https://a/p.png' }))
    assert.equal(user.googleId, 'g-new')
    assert.equal(user.email, 'nueva@x.com')
    assert.equal(user.name, 'Nueva')
    assert.equal(user.avatar, 'https://a/p.png')
    assert.ok(db.uid(user))
  })

  it('encuentra por googleId y actualiza nombre y foto', async () => {
    const before = await db.findUser({ googleId: 'g-new' })
    const user = await resolveGoogleUser(profile('g-new', 'otro-mail@x.com', { name: 'Renombrada', photo: 'https://a/q.png' }))
    assert.equal(db.uid(user), db.uid(before))
    assert.equal(user.name, 'Renombrada')
    assert.equal(user.avatar, 'https://a/q.png')
    // El email de la cuenta no cambia aunque Google mande otro.
    assert.equal(user.email, 'nueva@x.com')
    const stored = await db.findUser({ googleId: 'g-new' })
    assert.equal(stored.name, 'Renombrada')
  })

  it('sin nombre ni foto en el perfil conserva los de la cuenta', async () => {
    const user = await resolveGoogleUser(profile('g-new', 'nueva@x.com'))
    assert.equal(user.name, 'Renombrada')
    assert.equal(user.avatar, 'https://a/q.png')
  })

  it('vincula por email una cuenta que todavía no tiene Google', async () => {
    const dev = await db.createUser({ email: 'dev@x.com', name: 'Dev' })
    const user = await resolveGoogleUser(profile('g-dev', 'dev@x.com', { photo: 'https://a/d.png' }))
    assert.equal(db.uid(user), db.uid(dev))
    assert.equal(user.googleId, 'g-dev')
    assert.equal(user.name, 'Dev')
    assert.equal(user.avatar, 'https://a/d.png')
    assert.equal((await db.findUser({ email: 'dev@x.com' })).googleId, 'g-dev')
  })

  it('no toma una cuenta cuyo email ya es de otro Google', async () => {
    await assert.rejects(
      resolveGoogleUser(profile('g-intruso', 'dev@x.com', { name: 'Intruso' })),
      /Email ya asociado a otra cuenta/,
    )
    const owner = await db.findUser({ email: 'dev@x.com' })
    assert.equal(owner.googleId, 'g-dev')
    assert.equal(owner.name, 'Dev')
    assert.equal(await db.findUser({ googleId: 'g-intruso' }), null)
  })

  it('rechaza un perfil sin email', async () => {
    await assert.rejects(resolveGoogleUser(profile('g-sin-mail', null)), /Google profile without email/)
    assert.equal(await db.findUser({ googleId: 'g-sin-mail' }), null)
  })
})

describe('rutas de login con Google', () => {
  let dir
  let config
  let createApp
  let request

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
    process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
    process.env.FX_OFFLINE = 'true'
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-google-app-'))
    process.env.STORAGE_DIR = dir
    process.env.FILE_DB_DIR = path.join(dir, 'db')
    const { loadConfig } = await import('../config.js')
    config = loadConfig()
    config.storageDir = dir
    config.store = 'file'
    ;({ createApp } = await import('../app.js'))
    request = (await import('supertest')).default
  })

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('sin credenciales manda al login con el aviso', async () => {
    const app = await createApp({ ...config, google: { ...config.google, clientId: '', clientSecret: '' } })
    const res = await request(app).get('/api/auth/google?next=/account')
    assert.equal(res.status, 302)
    const url = new URL(res.headers.location)
    assert.equal(url.pathname, '/login')
    assert.equal(url.searchParams.get('error'), 'google_not_configured')
    assert.equal(url.searchParams.get('next'), '/account')
  })

  it('con credenciales registra la estrategia y redirige a Google', async () => {
    const app = await createApp({
      ...config,
      google: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackUrl: 'http://localhost:8787/api/auth/google/callback',
      },
    })
    const res = await request(app).get('/api/auth/google')
    assert.equal(res.status, 302)
    const url = new URL(res.headers.location)
    assert.equal(url.hostname, 'accounts.google.com')
    assert.equal(url.searchParams.get('client_id'), 'test-client-id')
    assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:8787/api/auth/google/callback')
    assert.match(url.searchParams.get('scope'), /profile/)
    assert.match(url.searchParams.get('scope'), /email/)
  })
})

/**
 * Vuelta de Google: el `state` de OAuth ata el callback a la sesión que
 * empezó el login (anti login-CSRF). Sin él, un atacante podía mandar a
 * alguien a /callback con un `code` propio y dejarlo logueado en la cuenta
 * del atacante. Las dos llamadas de red a Google (token y perfil) se stubean.
 */
describe('callback de Google y state anti-CSRF', () => {
  let dir
  let app
  let request
  let passport

  const CLIENT = 'http://localhost:5173'

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
    process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
    process.env.FX_OFFLINE = 'true'
    process.env.CLIENT_URL = CLIENT
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-google-cb-'))
    process.env.STORAGE_DIR = dir
    process.env.FILE_DB_DIR = path.join(dir, 'db')
    const { loadConfig } = await import('../config.js')
    const config = loadConfig()
    config.storageDir = dir
    config.store = 'file'
    config.clientUrl = CLIENT
    config.google = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      callbackUrl: 'http://localhost:8787/api/auth/google/callback',
    }
    const { createApp } = await import('../app.js')
    app = await createApp(config)
    request = (await import('supertest')).default
    passport = (await import('passport')).default

    const strategy = passport._strategy('google')
    strategy._oauth2.getOAuthAccessToken = (_code, _params, cb) =>
      cb(null, 'access-token', 'refresh-token', {})
    strategy.userProfile = (_token, done) =>
      done(null, {
        id: 'g-cb-user',
        emails: [{ value: 'cb@x.com' }],
        displayName: 'Callback User',
        photos: [],
      })
  })

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  async function startLogin(agent, next) {
    const res = await agent.get(`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ''}`)
    assert.equal(res.status, 302)
    return new URL(res.headers.location).searchParams.get('state')
  }

  it('el redirect a Google lleva un state', async () => {
    const state = await startLogin(request.agent(app))
    assert.ok(state && state.length >= 16, `state: ${state}`)
  })

  it('rechaza un callback con state falso', async () => {
    const agent = request.agent(app)
    await startLogin(agent)
    const res = await agent.get('/api/auth/google/callback?code=attacker-code&state=forjado')
    assert.equal(res.status, 302)
    assert.equal(res.headers.location, `${CLIENT}/login?error=google_failed`)
    const me = await agent.get('/api/auth/me')
    assert.equal(me.body.user, null)
  })

  it('rechaza un callback sin state (el link armado por un atacante)', async () => {
    const victim = request.agent(app)
    const res = await victim.get('/api/auth/google/callback?code=attacker-code')
    assert.equal(res.status, 302)
    assert.equal(res.headers.location, `${CLIENT}/login?error=google_failed`)
    const me = await victim.get('/api/auth/me')
    assert.equal(me.body.user, null)
  })

  it('con el state correcto loguea y vuelve a `next`', async () => {
    const agent = request.agent(app)
    const state = await startLogin(agent, '/builder')
    const res = await agent.get(`/api/auth/google/callback?code=good-code&state=${encodeURIComponent(state)}`)
    assert.equal(res.status, 302)
    assert.equal(res.headers.location, `${CLIENT}/builder`)
    const me = await agent.get('/api/auth/me')
    assert.equal(me.body.user?.email, 'cb@x.com')
  })

  it('un state ya usado no sirve dos veces', async () => {
    const agent = request.agent(app)
    const state = await startLogin(agent)
    await agent.get(`/api/auth/google/callback?code=good-code&state=${encodeURIComponent(state)}`)
    const replay = await request.agent(app).get(`/api/auth/google/callback?code=good-code&state=${encodeURIComponent(state)}`)
    assert.equal(replay.headers.location, `${CLIENT}/login?error=google_failed`)
  })
})
