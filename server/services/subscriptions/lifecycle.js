import { db } from '../../db.js'
import { toMs, subId } from './billing.js'

/**
 * Ciclo de vida de una suscripción de LAB, igual para cualquier pasarela:
 * activarla, cerrar las que reemplaza y detectar una segunda vigente. Lo usan
 * mpSync.js (Mercado Pago) y paddleSync.js (Paddle).
 */

export function markActivated(sub) {
  sub.status = 'authorized'
  if (!sub.activatedAt) sub.activatedAt = new Date()
  if (sub.abandonedAt) sub.abandonedAt = undefined
}

/**
 * Al activarse una suscripción nueva, las anteriores del usuario que seguían
 * vigentes por días ya pagados (canceladas) se cierran: la nueva cubre ese
 * período (el primer cobro es cuando terminaba la vieja).
 */
export async function closeSupersededSubscriptions(sub) {
  const id = subId(sub)
  const created = toMs(sub.createdAt) ?? Date.now()
  for (const other of await db.findSubscriptionsByUser(sub.userId)) {
    if (subId(other) === id) continue
    if (other.status !== 'authorized' && other.status !== 'paused') continue
    if ((toMs(other.createdAt) ?? 0) > created) continue
    if (other.canceledAt) {
      other.status = 'cancelled'
      await other.save()
    } else {
      console.error(
        `subs DOBLE SUSCRIPCIÓN user=${sub.userId} nueva=${id} previa=${subId(other)} ` +
          `ref=${other.mpPreapprovalId || other.paddleSubscriptionId || '-'} — revisar y dar de baja una`,
      )
    }
  }
}

export async function hasOtherActiveSubscription(sub) {
  const other = await db.findActiveSubscriptionByUser(sub.userId)
  return !!other && subId(other) !== subId(sub)
}
