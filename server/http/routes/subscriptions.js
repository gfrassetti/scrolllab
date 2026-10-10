import express from 'express'
import { isQaBuyer } from '../../qa.js'
import { QA_LAB_PRICES_ARS } from '../../../src/domain/qa.js'
import { db } from '../../db.js'
import { requireAuth, asyncHandler, HttpError } from '../../middleware.js'
import { assertObjectIdLike } from '../../validation.js'
import { fetchPayment } from '../../services/mercadoPago.js'
import {
  resolveEntitlement,
  changeSubscriptionPlan,
  previewPlanChange,
  applyUpgradePayment,
  applyMockUpgrade,
  syncSubscriptionForUser,
  trialEligible,
  activateMockSubscription,
  startSubscription,
} from '../../services/subscriptions.js'
import { cancelAtPeriodEnd } from '../../services/subscriptions/cancel.js'
import { HOSTED_PLANS } from '../../catalog.js'
import { isPaddleSub, syncPaddleForUser } from '../../services/subscriptions/paddleSync.js'
import { getSubscription } from '../../services/paddle.js'

/**
 * Suscripciones de LAB (Fase 4) — Mercado Pago PreApproval: planes, mi
 * suscripción, alta (con prueba gratis), sincronizar, cancelar, cambio de plan
 * (cotización + upgrade con pago de la diferencia) y los atajos mock de dev.
 */
export function createSubscriptionsRouter({ config, limits }) {
  const router = express.Router()

  const subsMock = () => !config.isProd && (config.mpMock || !config.mpSubs.accessToken)
  const paddleOn = () => Boolean(config.paddle?.enabled)
  const paddleMock = () => Boolean(config.paddle?.mock)
  /** ¿Esta fila se maneja sin pasarela real (mock de MP o de Paddle)? */
  const rowMock = (sub) => (isPaddleSub(sub) ? paddleMock() : subsMock())

  // `instanceQuota` puede ser `Infinity` (plan sin tope) — JSON no tiene forma
  // de representar eso, y `JSON.stringify` lo pisa por `null` en silencio.
  // Lo hacemos explícito acá: el cliente lee `null`/no-finito como "ilimitado".
  const quotaForWire = (n) => (Number.isFinite(n) ? n : null)

  /** `qa`: los planes de prueba (QA_LAB_PRICES_ARS, src/domain/qa.js). */
  function publicPlans({ qa = false } = {}) {
    return Object.values(HOSTED_PLANS).map((p) => ({
      id: p.id,
      tier: p.tier,
      priceMonthly: qa ? QA_LAB_PRICES_ARS[p.id] : p.priceMonthly,
      priceYearly: qa ? QA_LAB_PRICES_ARS[p.id] : p.priceYearly,
      // Cobro internacional (Paddle).
      priceMonthlyUsd: p.priceMonthlyUsd,
      priceYearlyUsd: p.priceYearlyUsd,
      instanceQuota: quotaForWire(p.instanceQuota),
      currency_id: p.currency_id,
    }))
  }

  router.get('/api/subscriptions/plans', (req, res) => {
    // `?qa=1` solo cambia algo para una cuenta de QA_BUYER_EMAILS; esa respuesta
    // es personal y no se cachea.
    const qa = req.query.qa === '1' && isQaBuyer(req.user, config)
    res.set('Cache-Control', qa ? 'private, no-store' : 'public, max-age=300')
    res.json({
      plans: publicPlans({ qa }),
      ...(qa ? { qa: true, trialDays: 0 } : {}),
      mock: subsMock(),
      freeQuota: config.hostedFreeQuota,
      providers: {
        mercadopago: { enabled: true, mock: subsMock(), currency: 'ARS' },
        paddle: { enabled: paddleOn(), mock: paddleMock(), currency: 'USD' },
      },
    })
  })

  router.get(
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

  router.post(
    '/api/subscriptions',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      const out = await startSubscription({
        user: req.user,
        plan: String(req.body?.plan || ''),
        cycle: req.body?.cycle === 'yearly' ? 'yearly' : 'monthly',
        provider: req.body?.provider === 'paddle' ? 'paddle' : 'mercadopago',
        locale: req.body?.locale === 'en' ? 'en' : 'es',
        qa: req.body?.qa === true,
        config,
      })
      // El atajo de dev lo activa un endpoint de este router: el servicio no
      // conoce rutas HTTP.
      res.json(
        out.mock
          ? { ...out, activateUrl: `/api/subscriptions/${out.subscriptionId}/mock-activate` }
          : out,
      )
    }),
  )

  router.post(
    '/api/subscriptions/:id/mock-activate',
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!subsMock() && !paddleMock()) throw new HttpError(403, 'Mock deshabilitado')
      assertObjectIdLike(req.params.id)
      const sub = await db.findSubscriptionById(req.params.id)
      if (!sub || String(sub.userId) !== String(db.uid(req.user))) {
        throw new HttpError(404, 'Suscripción no encontrada')
      }
      if (!rowMock(sub)) throw new HttpError(403, 'Mock deshabilitado')
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
  router.post(
    '/api/subscriptions/sync',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      // La fila más nueva con pasarela decide a quién se le pregunta.
      const userId = db.uid(req.user)
      const rows = await db.findSubscriptionsByUser(userId)
      const latest = rows.find(
        (s) =>
          (s.mpPreapprovalId || s.paddleTransactionId || s.paddleSubscriptionId) &&
          s.status !== 'cancelled' &&
          !s.abandonedAt,
      )
      if (latest && isPaddleSub(latest)) {
        if (paddleMock()) throw new HttpError(403, 'Mock activo: usá activar directo')
        const out = await syncPaddleForUser({ userId, config })
        return res.json({ ok: true, ...out })
      }
      if (subsMock()) throw new HttpError(403, 'Mock activo: usá activar directo')
      const out = await syncSubscriptionForUser({ userId, config })
      res.json({ ok: true, ...out })
    }),
  )

  router.post(
    '/api/subscriptions/cancel',
    requireAuth,
    asyncHandler(async (req, res) => {
      const sub = await db.findActiveSubscriptionByUser(db.uid(req.user))
      if (!sub || sub.canceledAt) {
        throw new HttpError(404, 'No tenés una suscripción activa')
      }
      // Sigue con acceso hasta `currentPeriodEnd`; la pasarela deja de cobrar.
      const out = await cancelAtPeriodEnd(sub, config)
      res.json({ ok: true, ...out })
    }),
  )

  // Cambio de plan sin dar de baja (mismo ciclo). Distinto ciclo (mensual↔
  // anual) no se puede sobre un preapproval de MP → la UI manda por cancelar.
  // Subir con días pagos devuelve `requiresPayment` + checkout de la diferencia.
  router.get(
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

  router.post(
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
  router.post(
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

  // Link de Paddle para cambiar la tarjeta (cobro rechazado o tarjeta
  // vencida). Se pide en el momento: Paddle lo firma y vence.
  router.get(
    '/api/subscriptions/payment-method',
    requireAuth,
    asyncHandler(async (req, res) => {
      const sub = await db.findActiveSubscriptionByUser(db.uid(req.user))
      if (!sub || !isPaddleSub(sub) || !sub.paddleSubscriptionId || paddleMock()) {
        throw new HttpError(404, 'No hay un medio de pago para actualizar', { expose: true })
      }
      const ps = await getSubscription(config, sub.paddleSubscriptionId)
      const url = ps?.management_urls?.update_payment_method
      if (!url) {
        throw new HttpError(404, 'No hay un medio de pago para actualizar', { expose: true })
      }
      res.set('Cache-Control', 'no-store')
      res.json({ ok: true, url })
    }),
  )

  router.post(
    '/api/subscriptions/upgrade/mock-pay',
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!subsMock()) throw new HttpError(403, 'Mock deshabilitado')
      const out = await applyMockUpgrade({ userId: db.uid(req.user), config })
      res.json({ ok: true, ...out })
    }),
  )

  return router
}
