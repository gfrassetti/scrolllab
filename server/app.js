import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { sanitizeAuthReturn } from './authReturn.js'
import fs from 'node:fs'
import { connectDb, db, storeMode } from './db.js'
import { assertWritableDir } from './config.js'
import {
  createCors,
  createHelmet,
  createLogger,
  requestId,
  requireAuth,
  requireSameOrigin,
  rateLimits,
  notFound,
  errorHandler,
  asyncHandler,
  HttpError,
} from './middleware.js'
import { validateCheckoutItems, assertObjectIdLike } from './validation.js'
import { pendingExpiresAt, visibleOrders } from './orderRetention.js'
import {
  createCheckoutPreference,
  verifyMpWebhookSignature,
  fetchPayment,
} from './services/mercadoPago.js'
import {
  ensureOrderZip,
  markOrderPaid,
  consumeDownload,
  assertPathInsideStorage,
  fulfillApprovedPayment,
} from './services/orders.js'
import { sendOrderReceiptOnce } from './services/email.js'
import {
  signDownloadToken,
  verifyDownloadToken,
  storageRoot,
} from './packaging.js'
import {
  catalogWithArs,
  arsFromUsd,
  COMMERCE_PACK_SURCHARGE_USD,
} from './catalog.js'
import { getUsdArsRate } from './fx.js'

function publicUser(user) {
  if (!user) return null
  return {
    id: db.uid(user),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  }
}

/**
 * Construye la app Express (sin listen) para poder testearla.
 */
export async function createApp(config) {
  await connectDb(config)
  storageRoot(config.storageDir)
  assertWritableDir(config.storageDir)

  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(requestId)
  app.use(createHelmet())
  app.use(createCors(config))
  app.use(createLogger(config))
  app.use(cookieParser())
  app.use(express.json({ limit: '64kb' }))
  app.use(requireSameOrigin(config))

  let sessionStore
  if (storeMode() === 'mongo') {
    const MongoStore = (await import('connect-mongo')).default
    sessionStore = MongoStore.create({
      mongoUrl: config.mongoUri,
      ttl: 14 * 24 * 60 * 60,
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

  passport.serializeUser((user, done) => done(null, db.uid(user)))
  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await db.findUserById(id))
    } catch (err) {
      done(err)
    }
  })

  if (config.google.clientId && config.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value
            if (!email) return done(new Error('Google profile without email'))
            let user = await db.findUser({ googleId: profile.id })
            if (!user) {
              const byEmail = await db.findUser({ email })
              // Solo linkear por email si aún no tiene googleId (evitar takeover)
              if (byEmail && !byEmail.googleId) {
                byEmail.googleId = profile.id
                byEmail.name = profile.displayName || byEmail.name
                byEmail.avatar = profile.photos?.[0]?.value || byEmail.avatar
                user = await db.updateUser(byEmail)
              } else if (!byEmail) {
                user = await db.createUser({
                  googleId: profile.id,
                  email,
                  name: profile.displayName,
                  avatar: profile.photos?.[0]?.value,
                })
              } else {
                return done(new Error('Email ya asociado a otra cuenta'))
              }
            } else {
              user.name = profile.displayName || user.name
              user.avatar = profile.photos?.[0]?.value || user.avatar
              await db.updateUser(user)
            }
            done(null, user)
          } catch (err) {
            done(err)
          }
        },
      ),
    )
  }

  const limits = rateLimits()

  async function sendReceiptSafely(order, user) {
    try {
      const result = await sendOrderReceiptOnce({ order, user, config })
      if (result.sent) {
        console.log(`Order receipt sent order=${db.uid(order) || order.id}`)
      }
    } catch (emailErr) {
      // El correo es secundario: nunca debe revertir un pago ni bloquear descarga.
      console.error('Order receipt email failed', emailErr)
    }
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      brand: 'SCROLLLAB',
      uptime: process.uptime(),
    })
  })

  app.get(
    '/api/ready',
    asyncHandler(async (_req, res) => {
      const mongoOk = await db.isReady()
      let storageOk = false
      try {
        assertWritableDir(config.storageDir)
        storageOk = true
      } catch {
        storageOk = false
      }
      if (!mongoOk || !storageOk) {
        return res.status(503).json({
          ok: false,
          store: storeMode(),
          mongo: mongoOk,
          storage: storageOk,
        })
      }
      res.json({
        ok: true,
        store: storeMode(),
        mongo: mongoOk,
        storage: storageOk,
        mpMock: config.mpMock,
      })
    }),
  )

  app.get(
    '/api/catalog',
    asyncHandler(async (_req, res) => {
      const fx = await getUsdArsRate()
      res.json({
        products: catalogWithArs(fx.rate),
        commercePackSurchargeUsd: COMMERCE_PACK_SURCHARGE_USD,
        commercePackSurcharge: arsFromUsd(COMMERCE_PACK_SURCHARGE_USD, fx.rate),
        fx: {
          rate: fx.rate,
          spreadPct: fx.spreadPct,
          updatedAt: fx.updatedAt,
          stale: fx.stale,
        },
      })
    }),
  )

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: publicUser(req.user) })
  })

  app.get('/api/auth/google', limits.auth, (req, res, next) => {
    if (!config.google.clientId) {
      const nextQ = sanitizeAuthReturn(req.query.next)
      const q = new URLSearchParams({ error: 'google_not_configured' })
      if (nextQ) q.set('next', nextQ)
      return res.redirect(`${config.clientUrl}/login?${q}`)
    }
    const nextPath = sanitizeAuthReturn(req.query.next)
    if (nextPath) req.session.authNext = nextPath
    else delete req.session.authNext

    req.session.save((err) => {
      if (err) return next(err)
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: true,
      })(req, res, next)
    })
  })

  app.get(
    '/api/auth/google/callback',
    limits.auth,
    passport.authenticate('google', {
      failureRedirect: `${config.clientUrl}/login?error=google_failed`,
    }),
    (req, res) => {
      const nextPath = sanitizeAuthReturn(req.session.authNext) || '/account'
      delete req.session.authNext
      res.redirect(`${config.clientUrl}${nextPath}`)
    },
  )

  app.post(
    '/api/auth/dev-login',
    limits.auth,
    asyncHandler(async (req, res) => {
      if (!config.authDev) {
        throw new HttpError(403, 'Dev login deshabilitado')
      }
      const email = String(req.body?.email || 'dev@scrolllab.com').slice(0, 120)
      let user = await db.findUser({ email })
      if (!user) {
        user = await db.createUser({
          email,
          name: String(req.body?.name || 'Dev Buyer').slice(0, 80),
          googleId: `dev-${email}`,
        })
      }
      await new Promise((resolve, reject) => {
        req.login(user, (err) => (err ? reject(err) : resolve()))
      })
      res.json({ user: publicUser(user) })
    }),
  )

  app.post('/api/auth/logout', (req, res, next) => {
    req.logout((logoutErr) => {
      if (logoutErr) return next(logoutErr)
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr)
        res.clearCookie(config.cookie.name, {
          path: '/',
          sameSite: config.cookie.sameSite,
          secure: config.cookie.secure,
          httpOnly: config.cookie.httpOnly,
        })
        res.json({ ok: true })
      })
    })
  })

  app.get(
    '/api/orders',
    requireAuth,
    asyncHandler(async (req, res) => {
      const all = await db.findOrdersByUser(db.uid(req.user))
      res.json({
        orders: visibleOrders(all).map((o) => ({
          id: db.uid(o) || o.id,
          status: o.status,
          items: o.items,
          total: o.total,
          totalUsd: o.totalUsd,
          fxRate: o.fxRate,
          currency_id: o.currency_id,
          createdAt: o.createdAt,
          downloadCount: o.downloadCount || 0,
        })),
      })
    }),
  )

  /**
   * Confirma un pago al volver de Checkout Pro. Obligatorio en test:
   * MP no envía webhooks con credenciales de prueba.
   */
  app.post(
    '/api/checkout/confirm',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      if (config.mpMock || !config.mpAccessToken) {
        throw new HttpError(400, 'Confirmación MP no disponible en modo mock')
      }

      const paymentId = String(
        req.body?.paymentId || req.body?.collection_id || '',
      ).trim()
      if (!paymentId || paymentId === 'null') {
        throw new HttpError(400, 'paymentId requerido')
      }

      const payment = await fetchPayment(config.mpAccessToken, paymentId)
      const { order, orderId, alreadyFulfilled } = await fulfillApprovedPayment({
        payment,
        config,
        expectedUserId: db.uid(req.user),
      })

      res.json({
        ok: true,
        orderId,
        alreadyFulfilled,
        status: order?.status || 'paid',
        order: order
          ? {
              id: orderId,
              status: order.status,
              items: order.items,
              total: order.total,
              currency_id: order.currency_id,
            }
          : null,
      })
    }),
  )

  app.post(
    '/api/checkout',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      const fx = await getUsdArsRate()
      const resolved = validateCheckoutItems(req.body?.items, {
        maxCartItems: config.maxCartItems,
        maxRecipeSections: config.maxRecipeSections,
        rate: fx.rate,
      })

      const total = resolved.reduce((sum, i) => sum + i.unit_price, 0)
      const order = await db.createOrder({
        userId: db.uid(req.user),
        status: 'pending',
        items: resolved.map((i) => ({
          sku: i.sku,
          title: i.title,
          unit_price: i.unit_price,
          unit_price_usd: i.unit_price_usd,
          currency_id: i.currency_id,
          recipe: i.recipe || undefined,
        })),
        total,
        totalUsd: resolved.reduce((sum, i) => sum + i.unit_price_usd, 0),
        fxRate: fx.rate,
        currency_id: 'ARS',
        expiresAt: pendingExpiresAt(),
      })

      const orderId = db.uid(order) || order.id

      if (config.mpMock) {
        return res.json({
          init_point: `${config.clientUrl}/checkout/mock?orderId=${orderId}`,
          orderId,
          mock: true,
        })
      }

      const result = await createCheckoutPreference({
        accessToken: config.mpAccessToken,
        items: resolved,
        orderId,
        userId: db.uid(req.user),
        clientUrl: config.clientUrl,
        apiPublicUrl: config.apiPublicUrl,
      })

      order.mpPreferenceId = result.id
      await order.save()

      // sandbox_init_point está deprecado por MP: con credenciales de Prueba,
      // init_point ya abre el entorno de test.
      res.json({
        init_point: result.init_point,
        orderId,
      })
    }),
  )

  app.post(
    '/api/checkout/mock-pay',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      if (!config.mpMock && !config.authDev) {
        throw new HttpError(403, 'Mock pay deshabilitado')
      }
      const orderId = String(req.body?.orderId || '')
      assertObjectIdLike(orderId)
      const order = await db.findOrderById(orderId)
      if (!order || String(order.userId) !== String(db.uid(req.user))) {
        throw new HttpError(404, 'Orden no encontrada')
      }
      const { order: paid } = await markOrderPaid({
        orderId,
        mpPaymentId: `mock-${Date.now()}`,
      })
      const paidOrder = paid || order
      await ensureOrderZip(paidOrder, req.user, config)
      await sendReceiptSafely(paidOrder, req.user)
      res.json({ ok: true, orderId })
    }),
  )

  app.post(
    '/api/webhooks/mercadopago',
    limits.webhook,
    asyncHandler(async (req, res) => {
      if (config.mpMock || !config.mpAccessToken) {
        return res.sendStatus(200)
      }

      const type = req.query.type || req.body?.type
      const dataId = req.query['data.id'] || req.body?.data?.id
      if (type !== 'payment' || !dataId) {
        return res.sendStatus(200)
      }

      verifyMpWebhookSignature({
        secret: config.mpWebhookSecret,
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        dataId,
      })

      // Un 4xx no se arregla reintentando: cortamos con 200 para que MP no
      // repita el evento. Los 5xx (MP caído, Mongo) sí tienen que reintentarse.
      try {
        const payment = await fetchPayment(config.mpAccessToken, dataId)
        await fulfillApprovedPayment({ payment, config })
      } catch (err) {
        if (err instanceof HttpError && err.status < 500) {
          console.error('MP webhook fulfill skipped', err.message, {
            paymentId: dataId,
          })
          return res.sendStatus(200)
        }
        throw err
      }

      res.sendStatus(200)
    }),
  )

  app.get(
    '/api/orders/:id/download',
    requireAuth,
    limits.downloadToken,
    asyncHandler(async (req, res) => {
      assertObjectIdLike(req.params.id)
      const order = await db.findOrderById(req.params.id)
      if (!order || String(order.userId) !== String(db.uid(req.user))) {
        throw new HttpError(404, 'Orden no encontrada')
      }
      if (order.status !== 'paid') {
        throw new HttpError(403, 'La orden todavía no está paga')
      }
      if (
        config.maxDownloads > 0 &&
        (order.downloadCount || 0) >= config.maxDownloads
      ) {
        throw new HttpError(429, 'Límite de descargas alcanzado')
      }

      await ensureOrderZip(order, req.user, config)
      const orderId = db.uid(order) || order.id
      const token = signDownloadToken({
        orderId,
        userId: String(db.uid(req.user)),
        secret: config.downloadSecret,
        ttlSeconds: config.downloadTtl,
      })

      res.json({ url: `/api/download/${token}`, expiresIn: config.downloadTtl })
    }),
  )

  app.get(
    '/api/download/:token',
    limits.download,
    asyncHandler(async (req, res) => {
      let data
      try {
        data = verifyDownloadToken(req.params.token, config.downloadSecret)
      } catch {
        throw new HttpError(400, 'Token inválido')
      }
      if (!data) {
        // El link vencido llega por navegación del browser: un JSON crudo no le
        // dice nada al comprador, así que lo devolvemos a Mis compras avisado.
        if (String(req.headers.accept || '').includes('text/html')) {
          const base = config.clientUrl.replace(/\/$/, '')
          return res.redirect(302, `${base}/account?download=expired`)
        }
        throw new HttpError(
          410,
          'El link de descarga venció. Entrá a Mis compras y tocá Descargar de nuevo.',
        )
      }

      const existing = await db.findOrderById(data.orderId)
      if (!existing || existing.status !== 'paid') {
        throw new HttpError(404, 'Orden no disponible')
      }
      if (String(existing.userId) !== String(data.userId)) {
        throw new HttpError(403, 'Forbidden')
      }
      if (!existing.zipPath) {
        throw new HttpError(404, 'ZIP no encontrado')
      }
      const safePath = assertPathInsideStorage(existing.zipPath, config.storageDir)
      if (!fs.existsSync(safePath)) {
        throw new HttpError(404, 'ZIP no encontrado')
      }

      await consumeDownload(data.orderId, config.maxDownloads)
      res.download(safePath, `scrolllab-${data.orderId}.zip`)
    }),
  )

  app.use(notFound)
  app.use(errorHandler(config))

  return app
}
