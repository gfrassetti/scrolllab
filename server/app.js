import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import passport from 'passport'
import { configurePassport } from './auth/passport.js'
import { createHealthRouter } from './http/routes/health.js'
import { createAuthRouter } from './http/routes/auth.js'
import { createOrdersRouter } from './http/routes/orders.js'
import { createCouponsRouter } from './http/routes/coupons.js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
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
import { isHostableSectionId, HOSTABLE_SECTIONS } from './sections.js'
import { sanitizeHostedProps } from './sectionFields.js'
import {
  newHostedKey,
  isHostedKey,
  requestHost,
  cleanDomains,
  domainAllowed,
} from './hostedKey.js'
import { pendingExpiresAt } from './orderRetention.js'
import {
  createCheckoutPreference,
  verifyMpWebhookSignature,
  fetchPayment,
  createPreapproval,
  billingFrequency,
} from './services/mercadoPago.js'
import {
  resolveEntitlement,
  assertCanPublish,
  changeSubscriptionPlan,
  previewPlanChange,
  applyUpgradePayment,
  applyMockUpgrade,
  isUpgradeReference,
  isHigherPlan,
  handlePreapprovalEvent,
  handleAuthorizedPaymentEvent,
  syncSubscriptionForUser,
  trialEligible,
  retirePendingSubscription,
  closeLapsedSubscription,
  cancelPreapprovalConfirmed,
  activateMockSubscription,
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
  sendSubscriptionCanceledOnce,
} from './services/email.js'
import { storageRoot } from './packaging.js'
import {
  HOSTED_PLANS,
  isHostedPlanId,
  discountedArsFromUsd,
} from './catalog.js'
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
      res.json({
        sectionId: inst.sectionId,
        // Otra pasada al servir: instancias publicadas antes de que LAB exigiera
        // URL completa en las imágenes (una /ruta ahí sale rota).
        props: sanitizeHostedProps(inst.sectionId, inst.publishedProps) || {},
      })
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
      const userId = db.uid(req.user)
      const rows = await db.findHostedInstancesByUser(userId)
      // Flags derivados, NO se persisten — mismas reglas de orden por
      // `createdAt` que `/api/embed/:key/config`:
      //  - `frozen`: el plan YA no la cubre → hoy responde 402. LAB muestra
      //    "Congelada" en vez de "Publicada".
      //  - `stopsOnPlanEnd`: hoy se sirve, pero caería fuera de la cuota
      //    free → si la suscripción no se reactiva, se apaga al fin de
      //    período. LAB avisa "se apaga el <fecha>".
      // Al re-suscribirse ambos se apagan solos (no hubo cambio de estado).
      const ent = await resolveEntitlement(userId, config, { persist: false })
      const freeQuota = config.hostedFreeQuota
      const instances = await Promise.all(
        rows.map(async (r) => {
          let frozen = false
          let stopsOnPlanEnd = false
          if (r.status === 'published') {
            const older = await db.countPublishedHostedCreatedBefore(
              userId,
              r.createdAt,
              db.uid(r) || r.id,
            )
            frozen = Number.isFinite(ent.quota) && older >= ent.quota
            stopsOnPlanEnd = !frozen && older >= freeQuota
          }
          return { ...publicHosted(r), frozen, stopsOnPlanEnd }
        }),
      )
      res.json({ instances })
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
      // LAB es de pago: un usuario free solo puede tener hasta
      // `hostedFreeQuota` instancias (0 = ninguna). Con plan/prueba activa
      // el tope lo pone `assertCanPublish` al publicar, no acá.
      const userId = db.uid(req.user)
      const ent = await resolveEntitlement(userId, config, { persist: false })
      if (ent.plan === 'free') {
        const mine = await db.findHostedInstancesByUser(userId)
        if (mine.length >= config.hostedFreeQuota) {
          throw new HttpError(
            402,
            config.hostedFreeQuota > 0
              ? 'Llegaste al límite gratis. Suscribite o empezá tu prueba para crear más.'
              : 'Suscribite o empezá tu prueba gratis para crear secciones en LAB.',
            { expose: true },
          )
        }
      }
      const draftProps =
        sanitizeHostedProps(sectionId, req.body?.draftProps) || {}
      const inst = await db.createHostedInstance({
        userId,
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
          sanitizeHostedProps(inst.sectionId, req.body.draftProps) || {}
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
    res.json({
      plans: publicPlans(),
      mock: subsMock(),
      freeQuota: config.hostedFreeQuota,
    })
  })

  app.get(
    '/api/subscriptions/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = db.uid(req.user)
      const ent = await resolveEntitlement(userId, config)
      const used = await db.countPublishedHosted(userId, null)
      // Prueba disponible = plan free y nunca tuvo una suscripción activa.
      let trialAvailable = false
      if (ent.plan === 'free' && config.hostedTrialDays > 0) {
        trialAvailable = trialEligible(await db.findSubscriptionsByUser(userId))
      }
      res.json({
        ...ent,
        quota: quotaForWire(ent.quota),
        used,
        canPublish: used < ent.quota,
        trialDays: config.hostedTrialDays,
        trialAvailable,
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
      const now = Date.now()

      // Una sola suscripción vigente. Si ya la canceló (le quedan días pagos)
      // o la renovación se cayó, puede abrir otra: la nueva reemplaza.
      const current = await db.findActiveSubscriptionByUser(userId)
      const currentEnd = current?.currentPeriodEnd
        ? new Date(current.currentPeriodEnd).getTime()
        : null
      const currentLapsed = currentEnd != null && currentEnd <= now
      if (current && !current.canceledAt && !currentLapsed) {
        throw new HttpError(409, 'Ya tenés una suscripción activa', {
          expose: true,
        })
      }
      // Re-suscripción con días pagos: el primer cobro de la nueva es cuando
      // terminan, y lo pagado viaja a la nueva (con eso se cotiza una subida
      // antes de ese cobro). Un plan MÁS CARO no puede arrancar sobre días
      // pagados con uno más barato: sería la cuota nueva sin pagar la
      // diferencia. Para subir ya: reactivar y cambiar de plan.
      const carryOver =
        current?.canceledAt && currentEnd > now ? new Date(currentEnd) : null
      const carriedPaidPlan = carryOver
        ? current.paidPlan || (current.lastPaidAt ? current.plan : null)
        : null
      if (carriedPaidPlan && isHigherPlan(plan, carriedPaidPlan)) {
        throw new HttpError(
          409,
          'Tu plan actual está pago hasta el fin del período. Para subir ya, reactivalo y cambiá de plan: pagás solo la diferencia por los días que quedan.',
          { expose: true },
        )
      }

      // Altas a medio hacer: se dan de baja en MP antes de abrir otra (un
      // checkout viejo abierto no puede terminar en un segundo cobro). Si una
      // se había completado sin que nos enteráramos, se activa y listo.
      const priorSubs = await db.findSubscriptionsByUser(userId)
      for (const s of priorSubs) {
        if (s.status !== 'pending' || s.abandonedAt) continue
        if ((await retirePendingSubscription(s, config)) === 'activated') {
          throw new HttpError(409, 'Ya tenés una suscripción activa', {
            expose: true,
          })
        }
      }
      if (current && !current.canceledAt && currentLapsed) {
        await closeLapsedSubscription(current, config)
      }

      // Prueba gratis solo si nunca tuvo una suscripción activa (cancelar y
      // volver NO la reabre). Los días ya pagados de una suscripción cancelada
      // se respetan: el primer cobro de la nueva es cuando termina la vieja.
      const trialDays = trialEligible(priorSubs) ? config.hostedTrialDays : 0
      const trialEndsAt =
        trialDays > 0 ? new Date(now + trialDays * 24 * 60 * 60 * 1000) : null
      const firstChargeAt = trialEndsAt || carryOver

      const sub = await db.createSubscription({
        userId,
        plan,
        cycle,
        status: 'pending',
        ...(trialEndsAt ? { trialEndsAt } : {}),
        ...(firstChargeAt ? { firstChargeAt } : {}),
        ...(carriedPaidPlan
          ? {
              paidPlan: carriedPaidPlan,
              paidCycle: current.paidCycle || current.cycle,
            }
          : {}),
      })
      const subId = db.uid(sub) || sub.id
      const out = {
        subscriptionId: subId,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        firstChargeAt: firstChargeAt ? firstChargeAt.toISOString() : null,
      }

      if (subsMock()) {
        return res.json({
          ...out,
          mock: true,
          activateUrl: `/api/subscriptions/${subId}/mock-activate`,
        })
      }

      const plof = HOSTED_PLANS[plan]
      let pre
      try {
        pre = await createPreapproval({
          accessToken: config.mpSubs.accessToken,
          reason: `ScrollLab LAB — ${plof.tier} (${cycle === 'yearly' ? 'anual' : 'mensual'})`,
          amount: cycle === 'yearly' ? plof.priceYearly : plof.priceMonthly,
          currencyId: plof.currency_id,
          ...billingFrequency(cycle),
          payerEmail: req.user.email,
          externalReference: subId,
          // `?suscripcion=volver`: la UI sincroniza sola al volver de MP.
          backUrl: `${config.clientUrl}/lab?suscripcion=volver`,
          startDate: firstChargeAt,
        })
      } catch (err) {
        // Sin preapproval en MP no hay nada que completar: la fila no puede
        // bloquear el próximo intento.
        await db.deleteSubscription(subId)
        console.error(
          `subs alta FALLÓ en MP user=${userId}`,
          err?.message || JSON.stringify(err)?.slice(0, 300),
        )
        throw new HttpError(
          502,
          'No pudimos iniciar la suscripción en Mercado Pago. Probá de nuevo en unos minutos.',
          { expose: true },
        )
      }
      sub.mpPreapprovalId = String(pre.id)
      await sub.save()
      res.json({ ...out, init_point: pre.init_point })
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
      // Igual que en MP: un alta reemplazada quedó cancelada y ya no se completa.
      if (sub.abandonedAt || sub.status === 'cancelled') {
        throw new HttpError(409, 'Esa alta ya no está vigente', { expose: true })
      }
      await activateMockSubscription(sub, config)
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
      // Si MP no confirma la baja, 502 y no se marca nada: una baja local que
      // MP no hizo seguiría cobrando.
      if (!subsMock() && sub.mpPreapprovalId) {
        await cancelPreapprovalConfirmed(sub, config)
      }
      // No la matamos ya: sigue con acceso hasta `currentPeriodEnd`. MP no
      // renueva. Sin días pagos por delante (sin fecha, o renovación que no se
      // cobró) se cierra en el acto.
      sub.canceledAt = new Date()
      const end = sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).getTime()
        : null
      if (end == null || end <= Date.now()) sub.status = 'cancelled'
      await sub.save()
      sendSubscriptionCanceledOnce({ subscription: sub, config }).catch((err) =>
        console.error('subs canceled email', err?.message),
      )
      res.json({
        ok: true,
        endsAt: sub.status === 'cancelled' ? null : sub.currentPeriodEnd,
        status: sub.status,
      })
    }),
  )

  // Cambio de plan sin dar de baja (mismo ciclo). Distinto ciclo (mensual↔
  // anual) no se puede sobre un preapproval de MP → la UI manda por cancelar.
  // Subir con días pagos devuelve `requiresPayment` + checkout de la diferencia.
  app.get(
    '/api/subscriptions/change/quote',
    requireAuth,
    asyncHandler(async (req, res) => {
      const out = await previewPlanChange({
        userId: db.uid(req.user),
        plan: String(req.query?.plan || ''),
      })
      res.set('Cache-Control', 'no-store')
      res.json({ ok: true, ...out })
    }),
  )

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

  // Vuelta del checkout de la diferencia (`/lab?upgrade=volver&payment_id=…`):
  // aplica el plan sin esperar al webhook (en test MP no lo manda).
  app.post(
    '/api/subscriptions/upgrade/confirm',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      if (subsMock()) {
        throw new HttpError(400, 'Confirmación MP no disponible en modo mock')
      }
      const paymentId = String(
        req.body?.paymentId || req.body?.collection_id || '',
      ).trim()
      if (!paymentId || paymentId === 'null') {
        throw new HttpError(400, 'paymentId requerido')
      }
      const payment = await fetchPayment(config.mpSubs.accessToken, paymentId)
      const out = await applyUpgradePayment({
        payment,
        config,
        expectedUserId: db.uid(req.user),
      })
      res.json({ ok: true, ...out })
    }),
  )

  app.post(
    '/api/subscriptions/upgrade/mock-pay',
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!subsMock()) throw new HttpError(403, 'Mock deshabilitado')
      const out = await applyMockUpgrade({ userId: db.uid(req.user), config })
      res.json({ ok: true, ...out })
    }),
  )

  app.use(createCouponsRouter({ config, limits }))

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
