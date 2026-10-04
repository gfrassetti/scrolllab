import express from 'express'
import { db } from '../../db.js'
import { requireAuth, asyncHandler, HttpError } from '../../middleware.js'
import { assertObjectIdLike } from '../../validation.js'
import {
  fetchPayment,
  createPreapproval,
  billingFrequency,
} from '../../services/mercadoPago.js'
import {
  resolveEntitlement,
  changeSubscriptionPlan,
  previewPlanChange,
  applyUpgradePayment,
  applyMockUpgrade,
  isHigherPlan,
  syncSubscriptionForUser,
  trialEligible,
  retirePendingSubscription,
  closeLapsedSubscription,
  cancelPreapprovalConfirmed,
  activateMockSubscription,
} from '../../services/subscriptions.js'
import { sendSubscriptionCanceledOnce } from '../../services/email.js'
import { HOSTED_PLANS, isHostedPlanId } from '../../catalog.js'

/**
 * Suscripciones de LAB (Fase 4) — Mercado Pago PreApproval: planes, mi
 * suscripción, alta (con prueba gratis), sincronizar, cancelar, cambio de plan
 * (cotización + upgrade con pago de la diferencia) y los atajos mock de dev.
 */
export function createSubscriptionsRouter({ config, limits }) {
  const router = express.Router()

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

  router.get('/api/subscriptions/plans', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300')
    res.json({
      plans: publicPlans(),
      mock: subsMock(),
      freeQuota: config.hostedFreeQuota,
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
        current?.canceledAt && currentEnd != null && currentEnd > now
          ? new Date(currentEnd)
          : null
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

  router.post(
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
  router.post(
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

  router.post(
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
