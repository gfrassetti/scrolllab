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
import fs from 'node:fs'
import path from 'node:path'
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
import { pendingExpiresAt } from './orderRetention.js'
import {
  createCheckoutPreference,
  verifyMpWebhookSignature,
  fetchPayment,
} from './services/mercadoPago.js'
import {
  applyUpgradePayment,
  isUpgradeReference,
  handlePreapprovalEvent,
  handleAuthorizedPaymentEvent,
} from './services/subscriptions.js'
import {
  ensureOrderZip,
  markOrderPaid,
  fulfillApprovedPayment,
  reverseOrderPayment,
  REVERSED_PAYMENT_STATUSES,
} from './services/orders.js'
import {
  sendOrderReceiptOnce,
  sendOrderAdminNotifyOnce,
} from './services/email.js'
import { storageRoot } from './packaging.js'
import { discountedArsFromUsd } from './catalog.js'
import { getUsdArsRate } from './fx.js'
import { resolveCouponForCheckout } from './services/coupons.js'

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

  async function sendReceiptSafely(order, user) {
    try {
      const result = await sendOrderReceiptOnce({ order, user, config })
      if (result.sent) {
        console.log(`Order receipt sent order=${db.uid(order) || order.id}`)
      }
    } catch (emailErr) {
      console.error('Order receipt email failed', emailErr)
    }
    try {
      const result = await sendOrderAdminNotifyOnce({ order, user, config })
      if (result.sent) {
        console.log(`Order admin notify sent order=${db.uid(order) || order.id}`)
      }
    } catch (emailErr) {
      console.error('Order admin notify failed', emailErr)
    }
  }

  app.use(createHealthRouter({ config }))

  app.use(createAuthRouter({ config, limits }))

  app.use(createOrdersRouter({ config, limits }))

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

      // Cupón de bienvenida: el cliente manda solo el código; el descuento lo
      // calcula el servidor sobre el precio de lista, nunca sale de un monto suyo.
      const coupon = req.body?.couponCode
        ? await resolveCouponForCheckout({
            code: req.body.couponCode,
            userId: db.uid(req.user),
            userEmail: req.user.email,
          })
        : null
      const lines = coupon
        ? resolved.map((i) => ({
            ...i,
            unit_price: discountedArsFromUsd(i.unit_price_usd, fx.rate, coupon.percent),
          }))
        : resolved

      const total = lines.reduce((sum, i) => sum + i.unit_price, 0)
      const order = await db.createOrder({
        userId: db.uid(req.user),
        status: 'pending',
        items: lines.map((i) => ({
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
        couponCode: coupon?.code,
        discountPct: coupon?.percent,
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
        items: lines,
        orderId,
        userId: db.uid(req.user),
        clientUrl: config.clientUrl,
        apiPublicUrl: config.apiPublicUrl,
        payer: { email: req.user.email, name: req.user.name },
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
      const type = req.query.type || req.body?.type
      const dataId = req.query['data.id'] || req.body?.data?.id
      if (!dataId) return res.sendStatus(200)

      // ——— Suscripciones (LAB) — misma URL, otro `type` ———
      if (
        type === 'subscription_preapproval' ||
        type === 'subscription_authorized_payment'
      ) {
        if (!config.mpSubs.accessToken) return res.sendStatus(200)
        verifyMpWebhookSignature({
          secret: config.mpSubs.webhookSecret,
          xSignature: req.headers['x-signature'],
          xRequestId: req.headers['x-request-id'],
          dataId,
        })
        try {
          if (type === 'subscription_preapproval') {
            await handlePreapprovalEvent({ preapprovalId: dataId, config })
          } else {
            // authorized_payment: se cobró una cuota. Extiende el período —
            // sin esto la renovación no lo mueve y el usuario cae a free
            // aunque le sigan cobrando.
            await handleAuthorizedPaymentEvent(
              { authorizedPaymentId: dataId, config },
            )
          }
        } catch (err) {
          if (err instanceof HttpError && err.status < 500) {
            console.error(`MP subs webhook skipped id=${dataId}: ${err.message}`)
            return res.sendStatus(200)
          }
          throw err
        }
        return res.sendStatus(200)
      }

      // ——— Pago único (Checkout Pro) ———
      // Compras del market, y la diferencia al subir de plan en LAB: esa
      // preference la arma la app de suscripciones y notifica con
      // `?source=lab` (su secreto y su token, por si son otra app de MP).
      const lab = req.query.source === 'lab'
      const payToken = lab ? config.mpSubs.accessToken : config.mpAccessToken
      if (config.mpMock || !payToken) {
        return res.sendStatus(200)
      }
      if (type !== 'payment') {
        return res.sendStatus(200)
      }

      verifyMpWebhookSignature({
        secret: lab ? config.mpSubs.webhookSecret : config.mpWebhookSecret,
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        dataId,
      })

      // Un 4xx no se arregla reintentando: cortamos con 200 para que MP no
      // repita el evento. Los 5xx (MP caído, Mongo) sí tienen que reintentarse.
      try {
        const payment = await fetchPayment(payToken, dataId)
        if (isUpgradeReference(payment.external_reference)) {
          await applyUpgradePayment({ payment, config })
        } else if (REVERSED_PAYMENT_STATUSES.has(payment.status)) {
          await reverseOrderPayment({ payment, config })
        } else {
          await fulfillApprovedPayment({ payment, config })
        }
      } catch (err) {
        if (err instanceof HttpError && err.status < 500) {
          console.error(`MP webhook skipped payment=${dataId}: ${err.message}`)
          return res.sendStatus(200)
        }
        throw err
      }

      res.sendStatus(200)
    }),
  )

  app.use(createHostedRouter({ config, limits }))

  app.use(createSubscriptionsRouter({ config, limits }))

  app.use(createCouponsRouter({ config, limits }))

  app.use(notFound)
  app.use(errorHandler(config))

  return app
}
