import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

import { routeInventory, shadowedRoutes } from './helpers/routes.js'

/**
 * Red del split de server/app.js en routers por dominio: la API pública
 * (método + path) no cambia, y ninguna ruta queda tapada por otra con
 * parámetro registrada antes. Una ruta nueva se suma acá a propósito.
 */
const EXPECTED = [
  'DELETE /api/hosted/:id',
  'GET /api/auth/google',
  'GET /api/auth/google/callback',
  'GET /api/auth/me',
  'GET /api/catalog',
  'GET /api/download/:token',
  'GET /api/embed/:key/config',
  'GET /api/embed/loader',
  'GET /api/health',
  'GET /api/hosted',
  'GET /api/hosted/:id',
  'GET /api/hosted/sections',
  'GET /api/orders',
  'GET /api/orders/:id/download',
  'GET /api/ready',
  'GET /api/subscriptions/change/quote',
  'GET /api/subscriptions/me',
  'GET /api/subscriptions/plans',
  'POST /api/auth/dev-login',
  'POST /api/auth/logout',
  'POST /api/checkout',
  'POST /api/checkout/confirm',
  'POST /api/checkout/mock-pay',
  'POST /api/coupons/check',
  'POST /api/coupons/welcome',
  'POST /api/hosted',
  'POST /api/hosted/:id/suspend',
  'POST /api/hosted/:id/unsuspend',
  'POST /api/subscriptions',
  'POST /api/subscriptions/:id/mock-activate',
  'POST /api/subscriptions/cancel',
  'POST /api/subscriptions/change',
  'POST /api/subscriptions/sync',
  'POST /api/subscriptions/upgrade/confirm',
  'POST /api/subscriptions/upgrade/mock-pay',
  'POST /api/webhooks/mercadopago',
  'PUT /api/hosted/:id',
]

describe('inventario de rutas de la API', () => {
  let app
  let storageDir

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
    process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
    process.env.FX_OFFLINE = 'true'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-routes-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')

    const { loadConfig } = await import('../config.js')
    const config = loadConfig()
    config.storageDir = storageDir
    config.store = 'file'

    const { createApp } = await import('../app.js')
    app = await createApp(config)
  })

  after(() => {
    fs.rmSync(storageDir, { recursive: true, force: true })
  })

  it('expone exactamente las rutas esperadas', () => {
    assert.deepEqual(routeInventory(app), EXPECTED)
  })

  it('ninguna ruta estática queda tapada por una con parámetro', () => {
    assert.deepEqual(shadowedRoutes(app), [])
  })
})
