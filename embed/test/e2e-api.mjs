/**
 * API para el test e2e del embed (Playwright). Levanta la app real en :8787
 * con store de archivo, login dev y MP mockeado, sobre un STORAGE_DIR temporal
 * que se descarta al terminar. No lee `.env` del proyecto.
 *
 *   node embed/test/e2e-api.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-embed-e2e-'))

Object.assign(process.env, {
  NODE_ENV: 'development',
  STORE: 'file',
  AUTH_DEV_ENABLED: 'true',
  MP_MOCK_ENABLED: 'true',
  SESSION_SECRET: 'e2e-session-secret-min-24-characters',
  DOWNLOAD_SECRET: 'e2e-download-secret-min-24-characters',
  CLIENT_URL: 'http://localhost:4178',
  API_PUBLIC_URL: 'http://localhost:8787',
  PORT: '8787',
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
const server = app.listen(8787, () => {
  console.log('e2e API → http://localhost:8787 (store=file, mpMock)')
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
