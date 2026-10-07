import crypto from 'node:crypto'
import { db } from '../db.js'
import { HttpError } from '../errors.js'
import { refundEligibility, labRefundEligibility } from '../../src/domain/policy.js'
import { refundPayment, fetchPayment } from './mercadoPago.js'
import { createAdjustment, getTransaction, PADDLE_PAID_STATUSES } from './paddle.js'
import { reverseOrderPayment, alertAdmin, REVERSED_PAYMENT_STATUSES } from './orders.js'
import { reversePaddleAdjustment } from './paddlePayments.js'
import { handleLabRefund } from './subscriptions/labRefund.js'
import { cancelAtPeriodEnd } from './subscriptions/cancel.js'
import { isPaddleSub } from './subscriptions/paddleSync.js'

/**
 * Devolución automática del Botón de arrepentimiento. Solo corre sobre lo que
 * cumple la política (src/domain/policy.js), revisado de nuevo al ejecutar:
 * - compra (template, bundle, builder) pagada, en plazo y con el ZIP sin bajar
 *   → devolución total en la pasarela;
 * - LAB en la prueba → baja (no hay nada que devolver);
 * - LAB con el primer cobro en plazo → devolución de ese cobro y baja inmediata.
 * Lo demás no llega acá: lo revisa el dueño.
 *
 * La pasarela devuelve al mismo medio de pago. Lo que sigue (orden cortada,
 * baja, libro de reembolsos, mail «Te devolvimos el dinero») lo hacen los
 * mismos caminos que el webhook (`reverseOrderPayment`, `reversePaddleAdjustment`,
 * `handleLabRefund`), así que da igual si llega antes la respuesta o el webhook.
 *
 * Resultado (`status` de la solicitud): `refunded` · `canceled` (LAB en prueba)
 * · `refund_pending` (Paddle la tiene en revisión: se aplica con su webhook) ·
 * `refund_retry` (Paddle todavía no completó la transacción: reintenta el
 * barrido) · `manual` (no se pudo: avisa al dueño para hacerlo a mano).
 */

const WITHDRAWAL_TOKEN_TTL_MS = 48 * 60 * 60 * 1000
const RETRY_WINDOW_MS = 48 * 60 * 60 * 1000

/** Error que el barrido tiene que reintentar (Paddle todavía procesa el cobro). */
const retryLater = (message) => Object.assign(new Error(message), { retry: true })

// ——— link de confirmación (pedido sin sesión) ———

/** Token firmado del link «Confirmar la devolución» (48 h). */
export function signWithdrawalToken(code, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ c: code, e: now + WITHDRAWAL_TOKEN_TTL_MS })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(`withdrawal:${payload}`).digest('base64url')
  return `${payload}.${sig}`
}

/** El código de la solicitud si el token es válido y no venció; si no, null. */
export function verifyWithdrawalToken(token, secret, now = Date.now()) {
  const [payload, sig] = String(token || '').split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(`withdrawal:${payload}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const { c, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof c === 'string' && Number(e) > now ? c : null
  } catch {
    return null
  }
}

// ——— ejecución ———

async function refundOrder(order, row, config, deps) {
  if (!order) return { status: 'manual', note: 'la orden ya no existe' }
  if (order.status === 'refunded') return { status: 'refunded', note: 'ya estaba reembolsada' }
  const e = refundEligibility(order)
  if (!e.eligible) return { status: 'manual', note: `ya no corresponde: ${e.reason}` }

  if (order.provider === 'paddle') {
    if (config.paddle?.mock || !order.paddleTransactionId) {
      return { status: 'manual', note: 'Paddle sin cuenta real (mock)' }
    }
    return refundPaddleTransaction(order.paddleTransactionId, row, config, deps)
  }

  if (config.mpMock || !config.mpAccessToken || !order.mpPaymentId) {
    return { status: 'manual', note: 'Mercado Pago sin cuenta real (mock)' }
  }
  await (deps.refundPayment || refundPayment)(config.mpAccessToken, order.mpPaymentId, {
    idempotencyKey: `scrolllab-withdrawal-${row.code}`,
  })
  const payment = await (deps.fetchPayment || fetchPayment)(config.mpAccessToken, order.mpPaymentId)
  if (REVERSED_PAYMENT_STATUSES.has(payment.status)) await reverseOrderPayment({ payment, config })
  return { status: 'refunded', note: `pago MP ${order.mpPaymentId}` }
}

/** Devolución total de una transacción de Paddle (compra o primer cobro de LAB). */
async function refundPaddleTransaction(transactionId, row, config, deps) {
  const txn = await (deps.getTransaction || getTransaction)(config, transactionId)
  // Paddle solo reembolsa transacciones completadas (pasan de «paid» a
  // «completed» al rato): hasta entonces, reintenta el barrido.
  if (txn?.status !== 'completed') {
    if (PADDLE_PAID_STATUSES.has(txn?.status)) throw retryLater(`Paddle todavía completa ${transactionId}`)
    return { status: 'manual', note: `transacción ${txn?.status || 'desconocida'}` }
  }
  const adj = await (deps.createAdjustment || createAdjustment)(config, {
    action: 'refund',
    type: 'full',
    reason: `Withdrawal request ${row.code}`,
    transaction_id: transactionId,
  })
  if (adj?.status === 'approved') {
    await reversePaddleAdjustment({ adjustment: adj, config })
    return { status: 'refunded', note: `ajuste Paddle ${adj.id}` }
  }
  return { status: 'refund_pending', note: `ajuste Paddle ${adj?.id} ${adj?.status}` }
}

async function refundLab(sub, row, config, deps) {
  if (!sub) return { status: 'manual', note: 'la suscripción ya no existe' }
  const e = labRefundEligibility(sub)
  if (e.reason === 'trial') {
    if (sub.canceledAt || sub.status === 'cancelled') return { status: 'canceled', note: 'ya estaba dada de baja' }
    await cancelAtPeriodEnd(sub, config, deps)
    return { status: 'canceled', note: 'baja en la prueba gratis, sin cobro' }
  }
  if (sub.refundedAt) return { status: 'refunded', note: 'ya estaba devuelto' }
  if (!e.eligible) return { status: 'manual', note: `ya no corresponde: ${e.reason}` }
  if (!sub.firstChargeId) return { status: 'manual', note: 'no hay registro del primer cobro' }

  if (isPaddleSub(sub)) {
    if (config.paddle?.mock) return { status: 'manual', note: 'Paddle sin cuenta real (mock)' }
    return refundPaddleTransaction(sub.firstChargeId, row, config, deps)
  }
  const token = config.mpSubs?.accessToken
  if (config.mpMock || !token) return { status: 'manual', note: 'Mercado Pago sin cuenta real (mock)' }
  await (deps.refundPayment || refundPayment)(token, sub.firstChargeId, {
    idempotencyKey: `scrolllab-withdrawal-${row.code}`,
  })
  const payment = await (deps.fetchPayment || fetchPayment)(token, sub.firstChargeId)
  const refunded = Number(payment.transaction_amount_refunded) || 0
  await handleLabRefund({
    sub,
    provider: 'mercadopago',
    externalId: `mp-${payment.id}`,
    chargeId: String(payment.id),
    amount: refunded > 0 ? refunded : Number(payment.transaction_amount),
    currency: payment.currency_id || sub.currency_id || 'ARS',
    partial: false,
    reason: 'refunded',
    config,
  })
  return { status: 'refunded', note: `pago MP ${payment.id}` }
}

/**
 * Ejecuta la devolución de una solicitud (o la baja, en la prueba). Nunca
 * tira: lo que no sale queda `manual` (o `refund_retry`) y el dueño se entera.
 * @param {any} row la solicitud (Withdrawal)
 * @returns {Promise<{ status: string, note?: string }>}
 */
export async function executeWithdrawal(row, config, deps = {}) {
  let out
  try {
    if (row.orderId) {
      const order = await db.findOrderById(String(row.orderId)).catch(() => null)
      out = await refundOrder(order, row, config, deps)
    } else if (row.subscriptionId) {
      const sub = await db.findSubscriptionById(String(row.subscriptionId)).catch(() => null)
      out = await refundLab(sub, row, config, deps)
    } else {
      out = { status: 'manual', note: 'sin compra ni suscripción asociada' }
    }
  } catch (err) {
    const message = err instanceof HttpError || err?.name === 'PaddleError' ? err.message : String(err?.message || err)
    out = { status: err?.retry ? 'refund_retry' : 'manual', note: message.slice(0, 300) }
  }

  await db.updateWithdrawal(row.code, {
    status: out.status,
    note: out.note || null,
    executedAt: new Date(),
    attempts: (Number(row.attempts) || 0) + 1,
  })

  const done = { refunded: 'DEVUELTO AUTOMÁTICAMENTE', canceled: 'BAJA EN LA PRUEBA (sin cobro)', refund_pending: 'DEVOLUCIÓN PEDIDA A PADDLE (en revisión)' }[out.status]
  if (out.status !== 'refund_retry') {
    alertAdmin({
      kind: 'withdrawal-done',
      key: `${row.code}-${out.status}`,
      title: done
        ? `ARREPENTIMIENTO ${row.code} — ${done}`
        : `ARREPENTIMIENTO ${row.code} — NO SE PUDO DEVOLVER SOLO: hacelo a mano`,
      lines: [`${row.name || ''} <${row.email}>`, out.note || '', done ? '' : 'Devolvé desde el panel de Mercado Pago o de Paddle.'].filter(Boolean),
      config,
    })
  }
  return out
}

/**
 * Barrido: reintenta las devoluciones que esperaban que Paddle completara la
 * transacción. Pasadas 48 h, quedan para el dueño.
 */
export async function retryPendingWithdrawals(config, deps = {}, now = Date.now()) {
  const rows = (await db.listWithdrawals()).filter((w) => w.status === 'refund_retry')
  for (const row of rows) {
    if (now - new Date(row.createdAt).getTime() > RETRY_WINDOW_MS) {
      await db.updateWithdrawal(row.code, { status: 'manual', note: 'Paddle no completó la transacción en 48 h' })
      alertAdmin({
        kind: 'withdrawal-done',
        key: `${row.code}-manual-timeout`,
        title: `ARREPENTIMIENTO ${row.code} — NO SE PUDO DEVOLVER SOLO: hacelo a mano`,
        lines: [`${row.email}`, 'Paddle no completó la transacción en 48 h.'],
        config,
      })
      continue
    }
    await executeWithdrawal(row, config, deps)
  }
}
