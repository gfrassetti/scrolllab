import { db } from '../db.js'
import {
  sendOrderPaymentFailedOnce,
  sendSubscriptionPaymentFailedOnce,
} from './email.js'

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
 * Corre el barrido cada 5 minutos dentro del proceso de la API. No arranca con
 * el mail apagado. Devuelve `stop()` para el shutdown; los timers no mantienen
 * vivo el proceso.
 */
export function startPaymentFailedSweep({
  config,
  intervalMs = 5 * MINUTE_MS,
  initialDelayMs = 45_000,
  run = sendDuePaymentFailedEmails,
}) {
  if (!config.email?.enabled) return () => {}
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
