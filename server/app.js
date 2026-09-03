import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { sanitizeAuthReturn } from './authReturn.js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { connectDb, db, storeMode } from './db.js'
import { assertWritableDir, authDiagnostics } from './config.js'
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
import { isHostableSectionId, HOSTABLE_SECTIONS } from './sections.js'
import { sanitizeSectionProps } from './sectionFields.js'
import {
  newHostedKey,
  isHostedKey,
  requestHost,
  cleanDomains,
  domainAllowed,
} from './hostedKey.js'
import { pendingExpiresAt, visibleOrders } from './orderRetention.js'
import {
  createCheckoutPreference,
  verifyMpWebhookSignature,
  fetchPayment,
  createPreapproval,
  cancelPreapproval,
} from './services/mercadoPago.js'
import {
  resolveEntitlement,
  assertCanPublish,
  changeSubscriptionPlan,
  handlePreapprovalEvent,
  handleAuthorizedPaymentEvent,
  syncSubscriptionForUser,
} from './services/subscriptions.js'
import {
  ensureOrderZip,
  markOrderPaid,
  consumeDownload,
  assertPathInsideStorage,
  fulfillApprovedPayment,
} from './services/orders.js'
import {
  sendOrderReceiptOnce,
  sendOrderAdminNotifyOnce,
  sendSubscriptionWelcomeOnce,
  sendSubscriptionCanceledOnce,
} from './services/email.js'
import {
  signDownloadToken,
  verifyDownloadToken,
  storageRoot,
} from './packaging.js'
import {
  catalogWithArs,
  arsFromUsd,
  COMMERCE_PACK_SURCHARGE_USD,
  HOSTED_PLANS,
  isHostedPlanId,
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
  // Railway / Vercel proxy: trust X-Forwarded-* so secure session cookies stick.
  app.set('trust proxy', config.isProd ? true : 1)
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
        auth: authDiagnostics(config),
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
    res.set('Cache-Control', 'no-store')
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
    // `logIn` regenera la sesión (anti session fixation) y se llevaría
    // `authNext`: sin keepSessionInfo el comprador siempre cae en /account.
    passport.authenticate('google', {
      failureRedirect: `${config.clientUrl}/login?error=google_failed`,
      keepSessionInfo: true,
    }),
    (req, res, next) => {
      const nextPath = sanitizeAuthReturn(req.session.authNext) || '/account'
      delete req.session.authNext
      req.session.save((err) => {
        if (err) return next(err)
        res.redirect(`${config.clientUrl}${nextPath}`)
      })
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
            console.error('MP subs webhook skipped', err.message, { id: dataId })
            return res.sendStatus(200)
          }
          throw err
        }
        return res.sendStatus(200)
      }

      // ——— Pago único (Checkout Pro) ———
      if (config.mpMock || !config.mpAccessToken) {
        return res.sendStatus(200)
      }
      if (type !== 'payment') {
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

      await consumeDownload(data.orderId, config.maxDownloads, { ip: req.ip })
      res.download(safePath, `scrolllab-${data.orderId}.zip`)
    }),
  )

  // ——————————————————————————————————————————————————————————————
  // Hosted Component (docs/hosted-component-plan.md, Fase 3)
  // ——————————————————————————————————————————————————————————————

  function publicHosted(inst) {
    return {
      id: db.uid(inst) || inst.id,
      key: inst.key,
      sectionId: inst.sectionId,
      status: inst.status,
      domains: inst.domains || [],
      draftProps: inst.draftProps || {},
      publishedProps: inst.publishedProps || null,
      publishedAt: inst.publishedAt || null,
      views: inst.views || 0,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
    }
  }

  function safeEqual(a, b) {
    const ba = Buffer.from(String(a))
    const bb = Buffer.from(String(b))
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
  }

  function requireAdmin(req) {
    const token = req.get('x-admin-token') || ''
    if (!config.adminToken || !safeEqual(token, config.adminToken)) {
      throw new HttpError(403, 'Forbidden')
    }
  }

  // Info del loader para armar el snippet con SRI. El hash lo escribe
  // embed/build-loader.mjs en embed-dist/v1/manifest.json.
  let loaderInfoCache = null
  function loaderInfo() {
    if (loaderInfoCache) return loaderInfoCache
    let integrity = null
    let version = 'v1'
    try {
      const raw = fs.readFileSync(
        path.join(process.cwd(), 'embed-dist', 'v1', 'manifest.json'),
        'utf8',
      )
      const m = JSON.parse(raw)
      integrity = m.integrity || null
      version = m.version || version
    } catch {
      /* build todavía no corrió */
    }
    loaderInfoCache = {
      version,
      url: `${config.embedCdnUrl}/${version}/loader.js`,
      // El frame (estático) no sabe dónde está la API — se la pasamos en el
      // snippet como `data-api`.
      api: config.apiPublicUrl || '',
      // Solo mandamos el hash si SRI está habilitado (el host tiene CORS).
      integrity: config.embedSri ? integrity : null,
    }
    return loaderInfoCache
  }

  async function loadOwnedHosted(req) {
    assertObjectIdLike(req.params.id)
    const inst = await db.findHostedInstanceById(req.params.id)
    if (!inst || String(inst.userId) !== String(db.uid(req.user))) {
      throw new HttpError(404, 'Instancia no encontrada')
    }
    return inst
  }

  // Público: lo consume el `<script>` del embed desde sitios de terceros.
  app.get(
    '/api/embed/:key/config',
    limits.embedConfig,
    asyncHandler(async (req, res) => {
      // Endpoint público: cualquier origen, sin credenciales (el embed usa
      // credentials:'omit'). ACAO:* con ACAC:true es combo inválido → se saca.
      res.set('Access-Control-Allow-Origin', '*')
      res.removeHeader('Access-Control-Allow-Credentials')
      res.set('Vary', 'Origin')

      const key = String(req.params.key || '')
      if (!isHostedKey(key)) throw new HttpError(404, 'No encontrado')

      const inst = await db.findHostedInstanceByKey(key)
      if (!inst) throw new HttpError(404, 'No encontrado')
      if (inst.status === 'suspended') {
        throw new HttpError(402, 'Instancia suspendida')
      }
      if (inst.status !== 'published') {
        throw new HttpError(409, 'La instancia todavía no se publicó')
      }
      if (!domainAllowed(inst.domains, requestHost(req))) {
        throw new HttpError(403, 'Dominio no autorizado')
      }

      // Suscripción caída o bajada de plan: las publicadas por encima del tope
      // dejan de servir. Chequeo perezoso, sin tocar `inst.status` — si el
      // dueño vuelve a suscribirse, reviven solas. Orden estable por
      // `createdAt`: quedan cubiertas las más viejas. `persist:false` para NO
      // escribir la fila de suscripción desde este path anónimo/caliente — el
      // barrido de vencimiento lo hace `/api/subscriptions/me` o el publish.
      const ent = await resolveEntitlement(inst.userId, config, {
        persist: false,
      })
      if (Number.isFinite(ent.quota)) {
        const olderPublished = await db.countPublishedHostedCreatedBefore(
          inst.userId,
          inst.createdAt,
          db.uid(inst) || inst.id,
        )
        if (olderPublished >= ent.quota) {
          throw new HttpError(402, 'Sección por encima del límite del plan')
        }
      }

      // Señal de uso, best-effort: no bloquea la respuesta.
      db.incHostedViews(key).catch(() => {})

      // max-age=0 + must-revalidate: al republicar, el cambio se ve en la
      // próxima carga (el ETag débil de Express hace que lo igual devuelva 304
      // barato). `s-maxage` deja un margen para un cache compartido/CDN futuro.
      res.set('Cache-Control', 'public, max-age=0, s-maxage=5, must-revalidate')
      res.json({ sectionId: inst.sectionId, props: inst.publishedProps || {} })
    }),
  )

  // Snippet + hash SRI para la página LAB.
  app.get('/api/embed/loader', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300')
    res.json(loaderInfo())
  })

  app.get(
    '/api/hosted/sections',
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json({ sections: HOSTABLE_SECTIONS })
    }),
  )

  app.get(
    '/api/hosted',
    requireAuth,
    asyncHandler(async (req, res) => {
      const rows = await db.findHostedInstancesByUser(db.uid(req.user))
      res.json({ instances: rows.map(publicHosted) })
    }),
  )

  app.post(
    '/api/hosted',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const sectionId = String(req.body?.sectionId || '')
      if (!isHostableSectionId(sectionId)) {
        throw new HttpError(400, 'Sección no hosteable')
      }
      const draftProps =
        sanitizeSectionProps(sectionId, req.body?.draftProps) || {}
      const inst = await db.createHostedInstance({
        userId: db.uid(req.user),
        key: newHostedKey(),
        sectionId,
        status: 'draft',
        domains: [],
        draftProps,
      })
      res.status(201).json({ instance: publicHosted(inst) })
    }),
  )

  app.get(
    '/api/hosted/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const inst = await loadOwnedHosted(req)
      res.json({ instance: publicHosted(inst) })
    }),
  )

  app.put(
    '/api/hosted/:id',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const inst = await loadOwnedHosted(req)
      // `draftProps` / `publishedProps` son Mixed en Mongo: reasignarlos no
      // siempre queda marcado como modificado y `save()` no los persiste.
      const touch = (p) => {
        if (typeof inst.markModified === 'function') inst.markModified(p)
      }

      if (req.body?.draftProps !== undefined) {
        inst.draftProps =
          sanitizeSectionProps(inst.sectionId, req.body.draftProps) || {}
        touch('draftProps')
      }
      if (req.body?.domains !== undefined) {
        inst.domains = cleanDomains(req.body.domains)
      }
      if (req.body?.publish === true) {
        // Una sección puede haber salido de HOSTABLE_SECTIONS después de crearse
        // la instancia (ej: scrolljack que rompe en el embed). No re-publicar.
        if (!isHostableSectionId(inst.sectionId)) {
          throw new HttpError(
            409,
            'Esta sección ya no se puede hostear. Borrá la instancia.',
            { expose: true },
          )
        }
        // Cuota: publicar de nuevo una ya publicada no cuenta (se excluye).
        if (inst.status !== 'published') {
          await assertCanPublish({
            userId: db.uid(req.user),
            instanceId: db.uid(inst) || inst.id,
            config,
          })
        }
        inst.publishedProps = inst.draftProps || {}
        touch('publishedProps')
        inst.status = 'published'
        inst.publishedAt = new Date()
      } else if (req.body?.unpublish === true && inst.status === 'published') {
        inst.status = 'draft'
      }

      await inst.save()
      res.json({ instance: publicHosted(inst) })
    }),
  )

  app.delete(
    '/api/hosted/:id',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const inst = await loadOwnedHosted(req)
      await db.deleteHostedInstance(db.uid(inst) || inst.id)
      res.json({ ok: true })
    }),
  )

  // ——————————————————————————————————————————————————————————————
  // Suscripciones (LAB, Fase 4) — MercadoPago PreApproval
  // ——————————————————————————————————————————————————————————————

  const subsMock = () => config.mpMock || !config.mpSubs.accessToken

  // `instanceQuota` puede ser `Infinity` (plan sin tope) — JSON no tiene forma
  // de representar eso, y `JSON.stringify` lo pisa por `null` en silencio.
  // Lo hacemos explícito acá: el cliente lee `null`/no-finito como "ilimitado".
  const quotaForWire = (n) => (Number.isFinite(n) ? n : null)

  function publicPlans() {
    return Object.values(HOSTED_PLANS).map((p) => ({
      id: p.id,
      tier: p.tier,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      instanceQuota: quotaForWire(p.instanceQuota),
      currency_id: p.currency_id,
    }))
  }

  app.get('/api/subscriptions/plans', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300')
    res.json({ plans: publicPlans(), mock: subsMock() })
  })

  app.get(
    '/api/subscriptions/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = db.uid(req.user)
      const ent = await resolveEntitlement(userId, config)
      const used = await db.countPublishedHosted(userId, null)
      res.json({
        ...ent,
        quota: quotaForWire(ent.quota),
        used,
        canPublish: used < ent.quota,
      })
    }),
  )

  app.post(
    '/api/subscriptions',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      const plan = String(req.body?.plan || '')
      const cycle = req.body?.cycle === 'yearly' ? 'yearly' : 'monthly'
      if (!isHostedPlanId(plan)) throw new HttpError(400, 'Plan inválido')

      const userId = db.uid(req.user)

      // Dedup: una sola suscripción activa, y no acumular altas a medio hacer.
      // Si ya la canceló (sigue con acceso hasta fin de período) o si el período
      // ya venció (el barrido perezoso todavía no la marcó), sí puede volver a
      // suscribirse — la nueva reemplaza.
      const current = await db.findActiveSubscriptionByUser(userId)
      const currentExpired =
        current?.currentPeriodEnd &&
        new Date(current.currentPeriodEnd).getTime() <= Date.now()
      if (current && !current.canceledAt && !currentExpired) {
        throw new HttpError(409, 'Ya tenés una suscripción activa', {
          expose: true,
        })
      }
      if (current && (current.canceledAt || currentExpired)) {
        current.status = 'cancelled'
        await current.save()
      }
      const STALE_MS = 30 * 60 * 1000
      const now = Date.now()
      for (const s of await db.findSubscriptionsByUser(userId)) {
        if (s.status !== 'pending') continue
        if (now - new Date(s.createdAt).getTime() > STALE_MS) {
          await db.deleteSubscription(db.uid(s) || s.id)
        } else {
          throw new HttpError(
            409,
            'Tenés un alta en curso. Completala o esperá unos minutos.',
            { expose: true },
          )
        }
      }

      const sub = await db.createSubscription({
        userId,
        plan,
        cycle,
        status: 'pending',
      })
      const subId = db.uid(sub) || sub.id

      if (subsMock()) {
        return res.json({
          mock: true,
          subscriptionId: subId,
          activateUrl: `/api/subscriptions/${subId}/mock-activate`,
        })
      }

      const plof = HOSTED_PLANS[plan]
      const pre = await createPreapproval({
        accessToken: config.mpSubs.accessToken,
        reason: `ScrollLab LAB — ${plof.tier} (${cycle === 'yearly' ? 'anual' : 'mensual'})`,
        amount: cycle === 'yearly' ? plof.priceYearly : plof.priceMonthly,
        currencyId: plof.currency_id,
        frequency: 1,
        frequencyType: cycle === 'yearly' ? 'years' : 'months',
        payerEmail: req.user.email,
        externalReference: subId,
        backUrl: `${config.clientUrl}/lab`,
      })
      sub.mpPreapprovalId = String(pre.id)
      await sub.save()
      res.json({ init_point: pre.init_point, subscriptionId: subId })
    }),
  )

  app.post(
    '/api/subscriptions/:id/mock-activate',
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!subsMock()) throw new HttpError(403, 'Mock deshabilitado')
      assertObjectIdLike(req.params.id)
      const sub = await db.findSubscriptionById(req.params.id)
      if (!sub || String(sub.userId) !== String(db.uid(req.user))) {
        throw new HttpError(404, 'Suscripción no encontrada')
      }
      sub.status = 'authorized'
      const end = new Date()
      end.setDate(end.getDate() + (sub.cycle === 'yearly' ? 365 : 31))
      sub.currentPeriodEnd = end
      await sub.save()
      sendSubscriptionWelcomeOnce({ subscription: sub, config }).catch((err) =>
        console.error('subs welcome email', err?.message),
      )
      res.json({ ok: true, status: sub.status })
    }),
  )

  // Sync manual con MercadoPago: el usuario vuelve del checkout y pide bajar el
  // estado real de su preapproval sin esperar al webhook. Hace exactamente lo
  // mismo que el webhook `subscription_preapproval`, pero disparado a mano —
  // así se puede probar el flujo real de MP en local sin túnel.
  app.post(
    '/api/subscriptions/sync',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      if (subsMock()) throw new HttpError(403, 'Mock activo: usá activar directo')
      const out = await syncSubscriptionForUser({
        userId: db.uid(req.user),
        config,
      })
      res.json({ ok: true, ...out })
    }),
  )

  app.post(
    '/api/subscriptions/cancel',
    requireAuth,
    asyncHandler(async (req, res) => {
      const sub = await db.findActiveSubscriptionByUser(db.uid(req.user))
      if (!sub || sub.canceledAt) {
        throw new HttpError(404, 'No tenés una suscripción activa')
      }
      if (!subsMock() && sub.mpPreapprovalId) {
        try {
          await cancelPreapproval(config.mpSubs.accessToken, sub.mpPreapprovalId)
        } catch (err) {
          console.error('cancelPreapproval falló', err?.message)
        }
      }
      // No la matamos ya: sigue con acceso hasta `currentPeriodEnd`. MP no
      // renueva. Si no hay fecha (edge), la cerramos en el acto.
      sub.canceledAt = new Date()
      if (!sub.currentPeriodEnd) sub.status = 'cancelled'
      await sub.save()
      sendSubscriptionCanceledOnce({ subscription: sub, config }).catch((err) =>
        console.error('subs canceled email', err?.message),
      )
      res.json({
        ok: true,
        endsAt: sub.currentPeriodEnd || null,
        status: sub.status,
      })
    }),
  )

  // Cambio de plan sin dar de baja (mismo ciclo). Distinto ciclo (mensual↔
  // anual) no se puede sobre un preapproval de MP → la UI manda por cancelar.
  app.post(
    '/api/subscriptions/change',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      const out = await changeSubscriptionPlan({
        userId: db.uid(req.user),
        plan: String(req.body?.plan || ''),
        config,
      })
      res.json({ ok: true, ...out })
    }),
  )

  // Revocación de key: solo con ADMIN_TOKEN (header x-admin-token). Sin UI.
  // Suspender → el config público responde 402 y el embed deja de renderizar.
  app.post(
    '/api/hosted/:id/suspend',
    asyncHandler(async (req, res) => {
      requireAdmin(req)
      assertObjectIdLike(req.params.id)
      const inst = await db.findHostedInstanceById(req.params.id)
      if (!inst) throw new HttpError(404, 'Instancia no encontrada')
      inst.status = 'suspended'
      await inst.save()
      res.json({ instance: publicHosted(inst) })
    }),
  )

  app.post(
    '/api/hosted/:id/unsuspend',
    asyncHandler(async (req, res) => {
      requireAdmin(req)
      assertObjectIdLike(req.params.id)
      const inst = await db.findHostedInstanceById(req.params.id)
      if (!inst) throw new HttpError(404, 'Instancia no encontrada')
      inst.status = inst.publishedProps ? 'published' : 'draft'
      await inst.save()
      res.json({ instance: publicHosted(inst) })
    }),
  )

  app.use(notFound)
  app.use(errorHandler(config))

  return app
}
