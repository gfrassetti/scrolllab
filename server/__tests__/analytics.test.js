import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

// fileStore lee FILE_DB_DIR al cargarse: fijarlo antes de importar nada que
// toque la base (si no, esta suite escribiría en storage/db).
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-analytics-'))
process.env.NODE_ENV = 'development'
process.env.STORE = 'file'
process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
process.env.CLIENT_URL = 'http://localhost:5173'
process.env.API_PUBLIC_URL = 'http://localhost:8787'
process.env.FX_OFFLINE = 'true'
process.env.FX_FALLBACK_RATE = '1560'
process.env.RATE_LIMIT_DISABLED = 'true'
process.env.STORAGE_DIR = dir
process.env.FILE_DB_DIR = path.join(dir, 'db')

const { buildDashboard, sanitizeEvents } = await import('../services/analytics.js')

const NOW = new Date('2026-10-06T12:00:00Z')
const VID = 'a1b2c3d4-e5f6-7890'

describe('sanitizeEvents', () => {
  it('deja pasar un clic bien formado', () => {
    const [e] = sanitizeEvents(
      {
        vid: VID,
        events: [{ type: 'click', path: '/templates/fizz?x=1#y', sku: 'Fizz', label: '  Ver   demo  ', tag: 'A', href: '/templates/fizz?q=1' }],
      },
      NOW,
    )
    assert.deepEqual(e, {
      vid: VID,
      type: 'click',
      path: '/templates/fizz',
      sku: 'fizz',
      label: 'Ver demo',
      tag: 'a',
      href: '/templates/fizz',
      createdAt: NOW.toISOString(),
    })
  })

  it('una vista no guarda label ni href', () => {
    const [e] = sanitizeEvents({ vid: VID, events: [{ type: 'view', path: '/', label: 'x', href: '/y' }] }, NOW)
    assert.equal(e.label, '')
    assert.equal(e.href, '')
  })

  it('descarta lo inválido: sin visitante, tipo raro, path que no empieza con /', () => {
    assert.deepEqual(sanitizeEvents({ vid: 'x', events: [{ type: 'click', path: '/' }] }), [])
    assert.deepEqual(sanitizeEvents({ vid: VID, events: [{ type: 'hack', path: '/' }] }), [])
    assert.deepEqual(sanitizeEvents({ vid: VID, events: [{ type: 'click', path: 'https://evil.com' }] }), [])
    assert.deepEqual(sanitizeEvents({ vid: VID, events: [null, 'x', 5] }), [])
    assert.deepEqual(sanitizeEvents(null), [])
  })

  it('un sku con caracteres raros se descarta, no se guarda', () => {
    const [e] = sanitizeEvents({ vid: VID, events: [{ type: 'view', path: '/', sku: '<script>' }] }, NOW)
    assert.equal(e.sku, '')
  })

  it('acota el lote y el largo de los textos', () => {
    const many = Array.from({ length: 80 }, () => ({ type: 'click', path: '/', label: 'a'.repeat(500) }))
    const out = sanitizeEvents({ vid: VID, events: many }, NOW)
    assert.equal(out.length, 25)
    assert.equal(out[0].label.length, 80)
  })
})

describe('buildDashboard', () => {
  const ev = (type, sku, vid, label, createdAt = '2026-10-05T10:00:00Z') => ({ type, sku, vid, label, createdAt, href: '' })
  const events = [
    ev('view', 'fizz', 'v1'),
    ev('click', 'fizz', 'v1', 'Ver demo'),
    ev('click', 'fizz', 'v2', 'Ver demo'),
    ev('click', 'fizz', 'v2', 'Comprar'),
    ev('click', 'atrium', 'v3', 'Ver demo'),
    ev('click', '', 'v3', 'Menú'),
    ev('click', 'fizz', 'v9', 'Ver demo', '2026-07-01T10:00:00Z'), // fuera de la ventana
  ]
  const users = [
    { email: 'a@x.com', name: 'Ana', createdAt: '2026-10-05T00:00:00Z' },
    { email: 'b@x.com', name: 'Beto', createdAt: '2026-09-20T00:00:00Z' },
    { email: 'c@x.com', name: 'Cora', createdAt: '2026-05-01T00:00:00Z' },
  ]
  const orders = [
    { status: 'paid', total: 100, currency_id: 'ARS', items: [{ sku: 'fizz' }], createdAt: '2026-10-05T00:00:00Z' },
    { status: 'pending', total: 50, currency_id: 'ARS', items: [{ sku: 'fizz' }], createdAt: '2026-10-04T00:00:00Z' },
  ]
  const d = buildDashboard({ events, users, orders, leads: [], days: 30, now: NOW })

  it('cuenta clics, vistas y visitantes solo dentro de la ventana', () => {
    assert.deepEqual(d.totals, { clicks: 5, views: 1, visitors: 3 })
  })

  it('agrupa por template, ordenado por clics, con los botones más tocados', () => {
    assert.equal(d.byTemplate[0].sku, 'fizz')
    assert.equal(d.byTemplate[0].clicks, 3)
    assert.equal(d.byTemplate[0].views, 1)
    assert.equal(d.byTemplate[0].visitors, 2)
    assert.deepEqual(d.byTemplate[0].topLabels[0], { key: 'Ver demo', count: 2 })
    assert.ok(d.byTemplate.some((r) => r.sku === '(sitio)' && r.clicks === 1))
  })

  it('cuenta las compras pagadas por template (no las pendientes)', () => {
    assert.equal(d.byTemplate.find((r) => r.sku === 'fizz').paid, 1)
  })

  it('arma la serie diaria completa, también con días en cero', () => {
    assert.equal(d.byDay.length, 30)
    assert.equal(d.byDay.at(-1).day, '2026-10-06')
    assert.equal(d.byDay.find((r) => r.day === '2026-10-05').clicks, 5)
    assert.equal(d.byDay.find((r) => r.day === '2026-10-01').clicks, 0)
  })

  it('usuarios: total, últimos 7 y 30 días, y los más recientes primero', () => {
    assert.equal(d.users.total, 3)
    assert.equal(d.users.last7, 1)
    assert.equal(d.users.last30, 2)
    assert.equal(d.users.recent[0].email, 'a@x.com')
  })

  it('órdenes: total, pagadas, pendientes y facturación por moneda', () => {
    assert.equal(d.orders.total, 2)
    assert.equal(d.orders.paid, 1)
    assert.equal(d.orders.pending, 1)
    assert.deepEqual(d.orders.revenue, [{ currency: 'ARS', total: 100 }])
  })

  it('sin datos no explota', () => {
    const empty = buildDashboard({ now: NOW })
    assert.equal(empty.totals.clicks, 0)
    assert.equal(empty.byTemplate.length, 0)
    assert.equal(empty.users.total, 0)
  })
})

describe('HTTP: /api/track y el panel local', () => {
  const ORIGIN = 'http://localhost:5173'
  let app
  before(async () => {
    const { loadConfig } = await import('../config.js')
    const config = loadConfig()
    const { connectDb } = await import('../db.js')
    await connectDb(config)
    const { createApp } = await import('../app.js')
    app = await createApp(config)
  })

  it('POST /api/track guarda los eventos válidos y responde 204 aunque haya basura', async () => {
    const ok = await request(app)
      .post('/api/track')
      .set('Origin', ORIGIN)
      .send({ vid: VID, events: [{ type: 'click', path: '/', sku: 'fizz', label: 'Ver demo', tag: 'a' }, { type: 'nope' }] })
    assert.equal(ok.status, 204)
    const junk = await request(app).post('/api/track').set('Origin', ORIGIN).send({ events: 'x' })
    assert.equal(junk.status, 204)
  })

  it('el panel muestra lo guardado, desde localhost', async () => {
    const res = await request(app).get('/api/admin/analytics').set('Host', 'localhost:8787')
    assert.equal(res.status, 200)
    assert.equal(res.body.totals.clicks, 1)
    assert.equal(res.body.byTemplate[0].sku, 'fizz')
    assert.equal(res.headers['cache-control'], 'no-store')
  })

  it('con otro Host (DNS rebinding / dominio público) el panel no existe', async () => {
    const res = await request(app).get('/api/admin/analytics').set('Host', 'scrolllab.com.ar')
    assert.equal(res.status, 404)
  })

  it('en producción el panel no existe, ni desde localhost ni con Host local', async () => {
    const { localOnly } = await import('../http/routes/analytics.js')
    const run = (config, remoteAddress, hostname) => {
      let status = 'next'
      const res = { status: (s) => ({ json: () => { status = s } }) }
      localOnly(config)({ socket: { remoteAddress }, hostname }, res, () => {})
      return status
    }
    assert.equal(run({ isProd: true }, '127.0.0.1', 'localhost'), 404)
    assert.equal(run({ isProd: false }, '203.0.113.9', 'localhost'), 404)
    assert.equal(run({ isProd: false }, '127.0.0.1', 'scrolllab.com.ar'), 404)
    assert.equal(run({ isProd: false }, '::1', 'localhost'), 'next')
  })
})
