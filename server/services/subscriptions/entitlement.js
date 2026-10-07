import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { HOSTED_PLANS, hostedPlanQuota } from '../../catalog.js'
import {
  DAY_MS,
  FIRST_CHARGE_GRACE_DAYS,
  toMs,
  subId,
  FREE,
  paidWindow,
} from './billing.js'

/**
 * Qué puede usar hoy un usuario de LAB (plan, cuota de instancias, gracia
 * después del vencimiento) y el control antes de publicar una instancia.
 */

/**
 * Gracia tras `currentPeriodEnd` sin cobro confirmado. Solo para una
 * suscripción viva (ni cancelada ni en pausa: esas no se cobran solas).
 */
function graceMs(sub, config) {
  if (sub.status !== 'authorized' || sub.canceledAt) return 0
  const days = Math.max(0, Number(config.hostedGraceDays) || 0)
  return (
    (sub.lastPaidAt ? days : Math.min(days, FIRST_CHARGE_GRACE_DAYS)) * DAY_MS
  )
}

/**
 * Qué puede hacer un usuario hoy: su plan efectivo y su cuota de instancias
 * publicadas. Sin suscripción vigente → tier "free" con `config.hostedFreeQuota`.
 *
 * - Cancelada o en pausa: sigue con acceso hasta `currentPeriodEnd` (ya pagó
 *   el período). Al vencer una cancelada la cerramos acá (barrido perezoso).
 * - Viva y vencida sin cobro confirmado (webhook demorado o MP reintentando):
 *   sigue con acceso durante la gracia (`pastDue`). Pasada la gracia → free
 *   con `lapsedPlan`; la suscripción sigue abierta en MP y si un reintento
 *   cobra, vuelve sola.
 */
export async function resolveEntitlement(userId, config, { persist = true } = {}) {
  const sub = await db.findActiveSubscriptionByUser(userId)
  if (!sub || !HOSTED_PLANS[sub.plan]) return FREE(config)

  const now = Date.now()
  const end = toMs(sub.currentPeriodEnd)
  const paymentFailed = !!sub.paymentFailedAt
  let graceEndsAt = null

  if (end != null && end <= now) {
    const grace = graceMs(sub, config)
    if (now >= end + grace) {
      if (sub.canceledAt) {
        // `persist:false` desde el path público del embed: no escribimos la
        // fila en cada request anónima (el cierre lo hace el próximo
        // /api/subscriptions/me o assertCanPublish del dueño).
        if (persist && sub.status !== 'cancelled') {
          sub.status = 'cancelled'
          await sub.save()
        }
        return FREE(config)
      }
      return FREE(config, {
        subscriptionStatus: sub.status,
        subscriptionId: subId(sub),
        paymentFailed,
        lapsedPlan: sub.plan,
      })
    }
    graceEndsAt = new Date(end + grace)
  }

  const trialing =
    !!sub.trialEndsAt &&
    /** @type {number} */ (toMs(sub.trialEndsAt)) > now &&
    !sub.canceledAt

  return {
    plan: sub.plan,
    cycle: sub.cycle,
    quota: hostedPlanQuota(sub.plan),
    subscriptionStatus: sub.status,
    subscriptionId: subId(sub),
    currentPeriodEnd: sub.currentPeriodEnd || null,
    canceledAt: sub.canceledAt || null,
    createdAt: sub.createdAt || null,
    trialEndsAt: sub.trialEndsAt || null,
    trialing,
    pastDue: graceEndsAt != null,
    graceEndsAt,
    paymentFailed,
    lapsedPlan: null,
    // Con qué plan está pago el período en curso (null en la prueba). La UI no
    // ofrece re-suscribirse más arriba sobre días pagos con uno más barato.
    paidPlan: paidWindow(sub, now)?.plan || null,
    // Pasarela y moneda: la UI cotiza y cambia de plan en la misma.
    provider: sub.provider || 'mercadopago',
    currency_id: sub.currency_id || 'ARS',
  }
}

/**
 * Bloquea publicar si el usuario ya llegó a su cuota. `instanceId` se excluye
 * del conteo (re-publicar una que ya estaba publicada no suma).
 */
export async function assertCanPublish({ userId, instanceId, config }) {
  const ent = await resolveEntitlement(userId, config)
  const used = await db.countPublishedHosted(userId, instanceId)
  if (used >= ent.quota) {
    throw new HttpError(
      402,
      ent.plan === 'free'
        ? 'Llegaste al límite gratis. Suscribite para publicar más secciones.'
        : 'Llegaste al límite de tu plan. Subí de plan para publicar más.',
      { expose: true },
    )
  }
}
