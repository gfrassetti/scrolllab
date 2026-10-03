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
