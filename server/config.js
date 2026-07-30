import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const isProd = process.env.NODE_ENV === 'production'
const WEAK_SECRETS = new Set([
  'dev-secret',
  'download-secret',
  'change-me-in-production-scrolllab',
  'change-me-in-production-scrolllab-min24',
  'change-me-download-secret',
  'change-me-download-secret-min24chars',
  'dev-scrollypages-session',
  'dev-download-secret',
])

function bool(name, fallback = false) {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return raw === 'true' || raw === '1'
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

function assertStrongSecret(name, value) {
  if (!value || value.length < 24 || WEAK_SECRETS.has(value)) {
    throw new Error(`${name} debe ser un secreto fuerte (mín. 24 chars, no default)`)
  }
}

/**
 * Parseo y validación central de env.
 * En producción falla el boot si faltan secretos, Mongo o flags inseguros.
 */
export function loadConfig() {
  const storeExplicit = process.env.STORE
  let store = storeExplicit === 'file' ? 'file' : 'mongo'
  if (isProd && store === 'file') {
    throw new Error('STORE=file no está permitido en producción')
  }
  if (isProd && !storeExplicit) store = 'mongo'

  const authDev = bool('AUTH_DEV_ENABLED', !isProd)
  const mpAccessToken = process.env.MP_ACCESS_TOKEN || ''
  let mpMock = bool('MP_MOCK_ENABLED', !mpAccessToken)

  if (isProd) {
    if (authDev) throw new Error('AUTH_DEV_ENABLED no puede estar activo en producción')
    if (mpMock || bool('MP_MOCK_ENABLED', false)) {
      throw new Error('MP_MOCK_ENABLED no puede estar activo en producción')
    }
    mpMock = false
    requireEnv('MONGODB_URI')
    requireEnv('MP_ACCESS_TOKEN')
    requireEnv('MP_WEBHOOK_SECRET')
    requireEnv('GOOGLE_CLIENT_ID')
    requireEnv('GOOGLE_CLIENT_SECRET')
    requireEnv('GOOGLE_CALLBACK_URL')
    requireEnv('CLIENT_URL')
    requireEnv('API_PUBLIC_URL')
    requireEnv('STORAGE_DIR')
    assertStrongSecret('SESSION_SECRET', process.env.SESSION_SECRET)
    assertStrongSecret('DOWNLOAD_SECRET', process.env.DOWNLOAD_SECRET)

    const clientUrl = process.env.CLIENT_URL
    const apiUrl = process.env.API_PUBLIC_URL
    const googleCallback = process.env.GOOGLE_CALLBACK_URL
    if (!clientUrl.startsWith('https://') || !apiUrl.startsWith('https://')) {
      throw new Error('CLIENT_URL y API_PUBLIC_URL deben ser HTTPS en producción')
    }
    if (!googleCallback.startsWith('https://')) {
      throw new Error('GOOGLE_CALLBACK_URL debe ser HTTPS en producción')
    }
    const expectedCallback = `${apiUrl.replace(/\/$/, '')}/api/auth/google/callback`
    if (googleCallback.replace(/\/$/, '') !== expectedCallback) {
      throw new Error(
        `GOOGLE_CALLBACK_URL debe ser exactamente ${expectedCallback}`,
      )
    }
  }

  const sessionSecret =
    process.env.SESSION_SECRET || (isProd ? null : 'dev-secret-local-only')
  const downloadSecret =
    process.env.DOWNLOAD_SECRET || (isProd ? null : 'download-secret-local-only')

  if (!sessionSecret || !downloadSecret) {
    throw new Error('SESSION_SECRET y DOWNLOAD_SECRET son obligatorios')
  }

  const sameSite = process.env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax')
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('COOKIE_SAME_SITE inválido (lax|strict|none)')
  }

  const downloadTtlDefault = isProd ? 900 : 86400
  const emailEnabled = bool('EMAIL_ENABLED', Boolean(process.env.RESEND_API_KEY))
  if (emailEnabled) {
    requireEnv('RESEND_API_KEY')
    requireEnv('EMAIL_FROM')
  }

  return {
    isProd,
    port: Number(process.env.PORT || 8787),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    apiPublicUrl:
      process.env.API_PUBLIC_URL ||
      `http://localhost:${Number(process.env.PORT || 8787)}`,
    sessionSecret,
    downloadSecret,
    downloadTtl: Number(process.env.DOWNLOAD_TTL_SECONDS || downloadTtlDefault),
    maxDownloads: Number(process.env.MAX_DOWNLOADS || 10),
    storageDir: path.resolve(
      process.env.STORAGE_DIR || path.join(ROOT, 'storage', 'orders'),
    ),
    store,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scrolllab',
    authDev: isProd ? false : authDev,
    mpMock: isProd ? false : mpMock,
    mpAccessToken,
    mpWebhookSecret: process.env.MP_WEBHOOK_SECRET || '',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        `http://localhost:${Number(process.env.PORT || 8787)}/api/auth/google/callback`,
    },
    email: {
      enabled: emailEnabled,
      apiKey: process.env.RESEND_API_KEY || '',
      from:
        process.env.EMAIL_FROM ||
        'SCROLLLAB <onboarding@resend.dev>',
      replyTo: process.env.EMAIL_REPLY_TO || '',
      logoUrl: process.env.EMAIL_LOGO_URL || '',
    },
    cookie: {
      name: 'sp.sid',
      httpOnly: true,
      sameSite,
      secure: isProd || sameSite === 'none',
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
    maxCartItems: 5,
    maxRecipeSections: 30,
  }
}

export function assertWritableDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  const probe = path.join(dir, `.write-probe-${process.pid}`)
  fs.writeFileSync(probe, 'ok')
  fs.unlinkSync(probe)
}
