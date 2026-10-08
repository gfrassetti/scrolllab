import { db } from '../db.js'
import {
  sendOrderPaymentFailedOnce,
  sendSubscriptionPaymentFailedOnce,
  sendSubscriptionSuspended,
} from './email.js'
import { graceMs } from './subscriptions/entitlement.js'
import { retryPendingWithdrawals } from './autoRefund.js'

const MINUTE_MS = 60 * 1000

/**
 * Cuánto se espera después de un rechazo antes de mandar el mail. En el
 * checkout (Mercado Pago o Paddle) el comprador suele reintentar con otra
 * tarjeta en el momento: si paga, no tiene que recibir un «rechazado».
 */
export const PAYMENT_FAILED_EMAIL_DELAY_MS = 10 * MINUTE_MS

/**
 * Manda el mail «pago rechazado» de las compras y de las altas de LAB que se
 * rechazaron hace más de `PAYMENT_FAILED_EMAIL_DELAY_MS` y siguen sin pagarse.
 * Uno por orden / por alta: el claim en la base evita duplicados aunque haya
 * dos instancias del server; si Resend falla, la próxima pasada reintenta. Las
 * cuotas rechazadas de una suscripción viva avisan en el momento (no hay nadie
 * frente al checkout), no pasan por acá.
 * @param {{ config: any, client?: any, now?: Date }} args
 */
export async function sendDuePaymentFailedEmails({ config, client, now = new Date() }) {
  if (!config.email?.enabled) return { skipped: 'disabled', sent: 0, failed: 0 }
  const before = new Date(now.getTime() - PAYMENT_FAILED_EMAIL_DELAY_MS)
  let sent = 0
  let failed = 0

  for (const order of await db.listFailedOrdersDue({ before })) {
    try {
      const out = await sendOrderPaymentFailedOnce({ order, config, client })
      if (out.sent) sent += 1
    } catch (err) {
      failed += 1
      console.error('order payment-failed email', err?.message)
    }
  }

  for (const subscription of await db.listCheckoutFailuresDue({ before })) {
    try {
      const out = await sendSubscriptionPaymentFailedOnce({
        subscription,
        config,
        client,
        ref: `checkout-${subscription.paddleTransactionId || db.uid(subscription)}`,
        stage: 'checkout',
      })
      if (out.sent) sent += 1
    } catch (err) {
      failed += 1
      console.error('subs checkout payment-failed email', err?.message)
    }
  }

  return { sent, failed }
}

/**
 * «Tu plan se suspendió»: una suscripción viva que pasó el fin del período y la
 * gracia sin cobro ya cayó al plan gratis (`resolveEntitlement`). Un mail por
 * período: se anota el fin de período antes de mandar (dos instancias del
 * server no lo duplican) y la clave de Resend cubre el reintento.
 * @param {{ config: any, client?: any, now?: Date }} args
 */
export async function sendDueSuspendedEmails({ config, client, now = new Date() }) {
  if (!config.email?.enabled) return { skipped: 'disabled', sent: 0 }
  let sent = 0
  for (const row of await db.listSubscriptions()) {
    if (row.status !== 'authorized' || row.canceledAt || !row.currentPeriodEnd) continue
    const end = new Date(row.currentPeriodEnd)
    if (now.getTime() < end.getTime() + graceMs(row, config)) continue
    if (row.suspendedEmailFor === end.toISOString()) continue
    const sub = await db.findSubscriptionById(String(db.uid(row) || row.id))
    if (!sub || sub.suspendedEmailFor === end.toISOString()) continue
    sub.suspendedEmailFor = end.toISOString()
    await sub.save()
    try {
      const user = await db.findUserById(String(sub.userId))
      if (!user?.email) continue
      await sendSubscriptionSuspended({ subscription: sub, user, ref: `${db.uid(sub) || sub.id}-${end.toISOString()}`, config, client })
      sent += 1
    } catch (err) {
      console.error('subs suspended email', err?.message)
    }
  }
  return { sent }
}

/**
 * Todo lo que corre cada 5 minutos: mails diferidos y devoluciones a reintentar.
 * @param {{ config: any, client?: any, now?: Date }} args
 */
export async function runSweeps({ config, client, now = new Date() }) {
  await sendDuePaymentFailedEmails({ config, client, now })
  await sendDueSuspendedEmails({ config, client, now })
  await retryPendingWithdrawals(config)
}

/**
 * Corre el barrido cada 5 minutos dentro del proceso de la API (los mails se
 * saltean con el mail apagado; las devoluciones a reintentar corren igual). Devuelve `stop()` para el shutdown; los timers no mantienen
 * vivo el proceso.
 */
export function startPaymentFailedSweep({
  config,
  intervalMs = 5 * MINUTE_MS,
  initialDelayMs = 45_000,
  run = runSweeps,
}) {
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      await run({ config })
    } catch (err) {
      console.error('payment-failed sweep', err?.message)
    } finally {
      busy = false
    }
  }
  const first = setTimeout(tick, initialDelayMs)
  const every = setInterval(tick, intervalMs)
  first.unref?.()
  every.unref?.()
  return () => {
    clearTimeout(first)
    clearInterval(every)
  }
}
