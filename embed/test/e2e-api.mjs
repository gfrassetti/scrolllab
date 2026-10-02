/**
 * API para el test e2e del embed (Playwright). Levanta la app real en :8787
 * con store de archivo, login dev y MP mockeado, sobre un STORAGE_DIR temporal
 * que se descarta al terminar. No lee `.env` del proyecto.
 *
 *   node embed/test/e2e-api.mjs
 *
 * `npm run check:lab` la reusa en otro puerto y con el sitio en otro origen:
 * E2E_API_PORT, E2E_CLIENT_URL y E2E_EMBED_CDN_URL pisan los defaults.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-embed-e2e-'))
const PORT = Number(process.env.E2E_API_PORT) || 8787

Object.assign(process.env, {
  NODE_ENV: 'development',
  STORE: 'file',
  AUTH_DEV_ENABLED: 'true',
  MP_MOCK_ENABLED: 'true',
  // El e2e crea/publica/borra decenas de instancias en ráfaga (una por sección
  // hosteable × 3 viewports). Sin esto el limiter de `/api/hosted` tira 429.
  RATE_LIMIT_DISABLED: 'true',
  SESSION_SECRET: 'e2e-session-secret-min-24-characters',
  DOWNLOAD_SECRET: 'e2e-download-secret-min-24-characters',
  CLIENT_URL: process.env.E2E_CLIENT_URL || 'http://localhost:4178',
  API_PUBLIC_URL: `http://localhost:${PORT}`,
  ...(process.env.E2E_EMBED_CDN_URL ? { EMBED_CDN_URL: process.env.E2E_EMBED_CDN_URL } : {}),
  PORT: String(PORT),
  FX_OFFLINE: 'true',
  FX_FALLBACK_RATE: '1560',
  HOSTED_FREE_QUOTA: '50',
  STORAGE_DIR: dir,
  FILE_DB_DIR: path.join(dir, 'db'),
})

const { loadConfig } = await import('../../server/config.js')
const { createApp } = await import('../../server/app.js')

const config = loadConfig()
config.store = 'file'
config.authDev = true
config.mpMock = true

const app = await createApp(config)
const server = app.listen(PORT, () => {
  console.log(`e2e API → http://localhost:${PORT} (store=file, mpMock)`)
})
server.on('error', (err) => {
  console.error(`e2e API no pudo escuchar: ${err.code || err.message}`)
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
  process.exit(1)
})

function bye() {
  server.close(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on('SIGTERM', bye)
process.on('SIGINT', bye)
