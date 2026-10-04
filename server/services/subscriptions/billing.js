import { db } from '../../db.js'
import { HOSTED_PLANS } from '../../catalog.js'
import {
  sendSubscriptionWelcomeOnce,
  sendSubscriptionCanceledOnce,
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
