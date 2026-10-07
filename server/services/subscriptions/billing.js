import { db } from '../../db.js'
import { HOSTED_PLANS } from '../../catalog.js'
import {
  sendSubscriptionWelcomeOnce,
  sendSubscriptionCanceledOnce,
  sendSubscriptionChargeOnce,
  sendSubscriptionPaymentFailedOnce,
} from '../email.js'

/**
 * Base de las suscripciones de LAB: constantes del cobro, ciclos de facturación
 * (sumar / restar un período), el período pago vigente, la regla de la prueba
 * gratis y los disparadores de mails. Puro salvo los disparadores.
 */

export const DAY_MS = 24 * 60 * 60 * 1000

// MP acredita el primer cobro (fin de la prueba) en ~1 h: un día cubre esa
// demora y la del webhook sin estirarle la prueba a una tarjeta que no paga.
export const FIRST_CHARGE_GRACE_DAYS = 1

// Subir de plan: por debajo de esto la diferencia no se cobra (últimas horas
// del período). ARS.
export const MIN_UPGRADE_CHARGE = 1000
// Lo mismo en USD (suscripciones de Paddle).
export const MIN_UPGRADE_CHARGE_USD = 1

// El checkout de la diferencia vence rápido: el monto depende de los días que
// quedan. Nunca después del fin del período.
export const UPGRADE_QUOTE_TTL_MS = 2 * 60 * 60 * 1000

export const UPGRADE_REF_PREFIX = 'labup'

export const toMs = (d) => (d ? new Date(d).getTime() : null)

export const subId = (sub) => String(db.uid(sub) || sub.id)

export const isMock = (config) => !config.mpSubs?.accessToken || !!config.mpMock

/** Mail de bienvenida al activarse — fire-and-forget, idempotente por el claim. */
export function fireWelcome(sub, config) {
  if (sub?.status !== 'authorized') return
  sendSubscriptionWelcomeOnce({ subscription: sub, config }).catch((err) =>
    console.error('subs welcome email', err?.message),
  )
}

export function fireCanceled(sub, config) {
  if (!sub?.canceledAt) return
  sendSubscriptionCanceledOnce({ subscription: sub, config }).catch((err) =>
    console.error('subs canceled email', err?.message),
  )
}

/**
 * Mail «cobro realizado» de una cuota (fire-and-forget, uno por cobro). El
 * primer cobro de un alta sin prueba ya lo cuenta la bienvenida; con la prueba
 * (o días pagos de una baja) el primer cobro sí avisa: la bienvenida no tenía
 * monto cobrado.
 * @param {any} sub
 * @param {any} config
 * @param {{ ref: string, firstCharge: boolean, amount?: number | null, currency?: string, paidAt?: any }} charge
 */
export function fireCharge(sub, config, { ref, firstCharge, amount, currency, paidAt }) {
  if (firstCharge && !sub.trialEndsAt && !sub.firstChargeAt) return
  sendSubscriptionChargeOnce({
    subscription: sub,
    config,
    ref,
    charge: { amount, currency, paidAt, periodEnd: sub.currentPeriodEnd },
  }).catch((err) => console.error('subs charge email', err?.message))
}

/**
 * Mail «pago rechazado» de LAB (fire-and-forget, uno por cobro). En una
 * renovación dice hasta cuándo dura la gracia.
 * @param {any} sub
 * @param {any} config
 * @param {{ ref: string, stage?: 'renewal' | 'checkout', updateUrl?: string | null }} failure
 */
export function firePaymentFailed(sub, config, { ref, stage = 'renewal', updateUrl = null }) {
  const end = toMs(sub.currentPeriodEnd)
  const days = Math.max(0, Number(config.hostedGraceDays) || 0)
  const graceEndsAt =
    stage === 'renewal' && end != null
      ? new Date(Math.max(end, Date.now()) + (sub.lastPaidAt ? days : Math.min(days, FIRST_CHARGE_GRACE_DAYS)) * DAY_MS)
      : null
  sendSubscriptionPaymentFailedOnce({
    subscription: sub,
    config,
    ref,
    stage,
    updateUrl,
    graceEndsAt,
  }).catch((err) => console.error('subs payment-failed email', err?.message))
}

export const FREE = (config, extra = {}) => ({
  plan: 'free',
  cycle: null,
  quota: config.hostedFreeQuota,
  subscriptionStatus: null,
  subscriptionId: null,
  currentPeriodEnd: null,
  canceledAt: null,
  createdAt: null,
  trialEndsAt: null,
  trialing: false,
  pastDue: false,
  graceEndsAt: null,
  paymentFailed: false,
  lapsedPlan: null,
  paidPlan: null,
  provider: null,
  currency_id: null,
  ...extra,
})

/** Un ciclo de facturación después de `date`: mes calendario o año. */
export function addBillingCycle(date, cycle) {
  const d = new Date(date)
  if (cycle === 'yearly') {
    d.setUTCFullYear(d.getUTCFullYear() + 1)
    return d
  }
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + 1)
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d
}

/** Un ciclo antes de `date` (inverso de `addBillingCycle`). */
export function subtractBillingCycle(date, cycle) {
  const d = new Date(date)
  if (cycle === 'yearly') {
    d.setUTCFullYear(d.getUTCFullYear() - 1)
    return d
  }
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - 1)
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d
}

/**
 * La prueba es una por usuario: se pierde apenas una suscripción llegó a
 * activarse. Un alta abandonada no cuenta. Filas viejas sin `activatedAt`:
 * cuenta cualquier estado ≠ pending (la regla anterior).
 */
export function trialEligible(rows) {
  return !rows.some(
    (s) => s.activatedAt || (s.status !== 'pending' && !s.abandonedAt),
  )
}

/**
 * Período ya pagado que corre hoy: con qué plan y ciclo se pagó y entre qué
 * fechas. `null` si todavía no se cobró nada (prueba gratis, primer cobro
 * pendiente) o si ya venció.
 * - Suscripción cobrada: `paidPlan` / `paidCycle` (filas viejas: `plan` y
 *   `cycle` si hubo un cobro), hasta `currentPeriodEnd`.
 * - Re-suscripción tras una baja: el plan y el ciclo de la vieja, que está
 *   pago hasta `currentPeriodEnd` (el primer cobro de la nueva).
 */
export function paidWindow(sub, now = Date.now()) {
  const end = toMs(sub.currentPeriodEnd)
  if (end == null || end <= now) return null
  const plan = sub.paidPlan || (sub.lastPaidAt ? sub.plan : null)
  if (!plan || !HOSTED_PLANS[plan]) return null
  const cycle = sub.paidCycle || sub.cycle
  return { plan, cycle, start: subtractBillingCycle(end, cycle).getTime(), end }
}
