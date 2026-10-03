import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import passport from 'passport'
import { configurePassport } from './auth/passport.js'
import { createHealthRouter } from './http/routes/health.js'
import { createAuthRouter } from './http/routes/auth.js'
import { createOrdersRouter } from './http/routes/orders.js'
import { createCouponsRouter } from './http/routes/coupons.js'
import { createHostedRouter } from './http/routes/hosted.js'
import { createSubscriptionsRouter } from './http/routes/subscriptions.js'
import { createCheckoutRouter } from './http/routes/checkout.js'
import { createWebhooksRouter } from './http/routes/webhooks.js'
import fs from 'node:fs'
import path from 'node:path'
import { connectDb, storeMode } from './db.js'
import { assertWritableDir } from './config.js'
import {
  createCors,
  createHelmet,
  createLogger,
  requestId,
  requireSameOrigin,
  rateLimits,
  notFound,
  errorHandler,
} from './middleware.js'
import { storageRoot } from './packaging.js'

/**
 * Construye la app Express (sin listen) para poder testearla.
 */
export async function createApp(config) {
  await connectDb(config)
  storageRoot(config.storageDir)
  assertWritableDir(config.storageDir)

  const app = express()
  // Railway / Vercel proxy: 1 hop. NO `true` (confía en cualquier proxy → un
  // X-Forwarded-For spoofeado evade rate limits y ensucia la IP de los logs).
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(requestId)
  app.use(createHelmet())
  app.use(createCors(config))
  app.use(createLogger(config))
  app.use(cookieParser())
  app.use(express.json({ limit: '64kb' }))
  app.use(requireSameOrigin(config))

  // Servir el embed (loader + frame) desde la propia API, si `embed-dist/` está
  // presente en el deploy. Es la opción sin infra: `EMBED_CDN_URL` apunta a la
  // API (sin sufijo) y el snippet queda `${API}/v1/loader.js`. Si el embed vive
  // en un CDN aparte, esta carpeta no existe acá y el mount es un no-op.
  // `embed-dist/` solo tiene `/v1/*` (+ `_headers`), no choca con `/api/*`.
  const embedDir = path.join(process.cwd(), 'embed-dist')
  if (fs.existsSync(embedDir)) {
    app.use(
      express.static(embedDir, {
        immutable: true,
        maxAge: '365d',
        setHeaders(res) {
          res.set('Access-Control-Allow-Origin', '*')
          res.set('Cross-Origin-Resource-Policy', 'cross-origin')
          // El frame se carga como <iframe> desde sitios de terceros: helmet
          // pone X-Frame-Options: SAMEORIGIN globalmente y eso lo bloquearía.
          res.removeHeader('X-Frame-Options')
        },
      }),
    )
    console.log('embed self-host: sirviendo embed-dist/ (/v1/loader.js, /v1/frame/…)')
  }

  let sessionStore
  if (storeMode() === 'mongo') {
    const MongoStore = (await import('connect-mongo')).default
    sessionStore = MongoStore.create({
      mongoUrl: config.mongoUri,
      ttl: 14 * 24 * 60 * 60,
    })
  } else {
    // Dev: sin Mongo, express-session usaría MemoryStore y nodemon te
    // desloguearía en cada reinicio. Persistimos a un JSON en storage/.
    const { DevFileSessionStore } = await import('./devSessionStore.js')
    sessionStore = new DevFileSessionStore({
      file: path.resolve(config.storageDir, '..', 'dev-sessions.json'),
      ttlMs: config.cookie.maxAge,
    })
  }

  app.use(
    session({
      name: config.cookie.name,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        httpOnly: config.cookie.httpOnly,
        sameSite: config.cookie.sameSite,
        secure: config.cookie.secure,
        maxAge: config.cookie.maxAge,
      },
    }),
  )

  app.use(passport.initialize())
  app.use(passport.session())

  configurePassport(config)

  const limits = rateLimits()

  app.use(createHealthRouter({ config }))

  app.use(createAuthRouter({ config, limits }))

  app.use(createOrdersRouter({ config, limits }))

  app.use(createCheckoutRouter({ config, limits }))

  app.use(createWebhooksRouter({ config, limits }))

  app.use(createHostedRouter({ config, limits }))

  app.use(createSubscriptionsRouter({ config, limits }))

  app.use(createCouponsRouter({ config, limits }))

  app.use(notFound)
  app.use(errorHandler(config))

  return app
}
