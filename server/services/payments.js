import { HttpError } from '../errors.js'
import { verifyMpWebhookSignature, fetchPayment } from './mercadoPago.js'
import { handleLabRefund, handleUpgradeRefund, findLabSubscriptionForMpPayment } from './subscriptions/labRefund.js'
import { parseUpgradeReference } from './subscriptions/planChange.js'
import { db } from '../db.js'
import {
  applyUpgradePayment,
  isUpgradeReference,
  handlePreapprovalEvent,
  handleAuthorizedPaymentEvent,
} from './subscriptions.js'
import {
  fulfillApprovedPayment,
  reverseOrderPayment,
  notifyOrderPaymentFailed,
  REVERSED_PAYMENT_STATUSES,
  alertAdmin,
  recordMpRefund,
} from './orders.js'

/**
 * Caso de uso: una notificación de Mercado Pago (una sola URL para todo).
 *  - `subscription_preapproval` / `subscription_authorized_payment`: LAB.
 *  - `payment`: pago único de Checkout Pro — una compra del market, o la
 *    diferencia de un upgrade de LAB (`source: 'lab'`, su token y su secreto).
 *
 * La firma se verifica siempre con el secreto de la app que corresponde.
 * Resuelve sin valor cuando la notificación quedó atendida o no aplica (el
 * webhook responde 200). Tira el error cuando MP tiene que enterarse: firma
 * inválida (4xx) o una falla nuestra / de MP (5xx, MP reintenta). Un 4xx del
 * procesamiento (pago no aprobado, orden inexistente) no se arregla
 * reintentando: se loguea y resuelve.
 */
export async function handleMercadoPagoNotification({
  type,
  dataId,
  source,
  xSignature,
  xRequestId,
  config,
}) {
  if (!dataId) return

  // ——— Suscripciones (LAB) — misma URL, otro `type` ———
  if (
    type === 'subscription_preapproval' ||
    type === 'subscription_authorized_payment'
  ) {
    if (!config.mpSubs.accessToken) return
    verifyMpWebhookSignature({
      secret: config.mpSubs.webhookSecret,
      xSignature: xSignature,
      xRequestId: xRequestId,
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
        return
      }
      throw err
    }
    return
  }

  // ——— Pago único (Checkout Pro) ———
  // Compras del market, y la diferencia al subir de plan en LAB: esa
  // preference la arma la app de suscripciones y notifica con
  // `?source=lab` (su secreto y su token, por si son otra app de MP).
  const lab = source === 'lab'
  const payToken = lab ? config.mpSubs.accessToken : config.mpAccessToken
  if (config.mpMock || !payToken) {
    return
  }
  if (type !== 'payment') {
    return
  }

  verifyMpWebhookSignature({
    secret: lab ? config.mpSubs.webhookSecret : config.mpWebhookSecret,
    xSignature: xSignature,
    xRequestId: xRequestId,
    dataId,
  })

  // Un 4xx no se arregla reintentando: cortamos con 200 para que MP no
  // repita el evento. Los 5xx (MP caído, Mongo) sí tienen que reintentarse.
  try {
    const payment = await fetchPayment(payToken, dataId)
    if (isUpgradeReference(payment.external_reference) && REVERSED_PAYMENT_STATUSES.has(payment.status)) {
      // Devolución (o contracargo) de una diferencia de plan: antes se tomaba
      // como «pago no aprobado» y no quedaba en el libro ni avisaba a nadie.
      const ref = parseUpgradeReference(payment.external_reference)
      const sub = ref ? await db.findSubscriptionById(ref.subscriptionId).catch(() => null) : null
      if (sub) {
        const refunded = Number(payment.transaction_amount_refunded) || 0
        await handleUpgradeRefund({
          sub,
          paymentId: String(payment.id),
          amount: refunded > 0 ? refunded : Number(payment.transaction_amount),
          currency: payment.currency_id || 'ARS',
          reason: payment.status === 'charged_back' ? 'charged_back' : 'refunded',
          config,
        })
      }
    } else if (isUpgradeReference(payment.external_reference)) {
      await applyUpgradePayment({ payment, config })
    } else if (REVERSED_PAYMENT_STATUSES.has(payment.status)) {
      const out = await reverseOrderPayment({ payment, config })
      // No era de una orden: puede ser una cuota de LAB.
      if (out?.skipped === 'sin orden' || out?.skipped === 'sin referencia') {
        const sub = await findLabSubscriptionForMpPayment(payment)
        if (sub) {
          const refunded = Number(payment.transaction_amount_refunded) || 0
          await handleLabRefund({
            sub,
            provider: 'mercadopago',
            externalId: `mp-${payment.id}`,
            chargeId: String(payment.id),
            amount: refunded > 0 ? refunded : Number(payment.transaction_amount),
            currency: payment.currency_id || sub.currency_id || 'ARS',
            partial: false,
            reason: payment.status === 'charged_back' ? 'charged_back' : 'refunded',
            config,
          })
        }
      }
    } else if (payment.status === 'rejected') {
      // El comprador puede reintentar en MP; el mail sale una vez por orden.
      await notifyOrderPaymentFailed({ orderId: String(payment.external_reference || ''), config })
    } else {
      await fulfillApprovedPayment({ payment, config })
      // Reembolso parcial: MP deja el pago «approved» con la devolución adentro.
      // La compra sigue paga (como en Paddle); solo se avisa, una vez por monto.
      const refunded = Number(payment.transaction_amount_refunded) || 0
      if (refunded > 0) {
        await recordMpRefund({ payment, partial: true, config })
        alertAdmin({
          kind: 'reversed',
          key: `mp-partial-${payment.id}-${refunded}`,
          title: 'REEMBOLSO PARCIAL — la orden sigue paga',
          lines: [
            `pago MP ${payment.id} · devuelto ${refunded} de ${payment.transaction_amount} ${payment.currency_id}`,
            `orden ${payment.external_reference || '-'}`,
          ],
          config,
        })
      }
    }
  } catch (err) {
    if (err instanceof HttpError && err.status < 500) {
      console.error(`MP webhook skipped payment=${dataId}: ${err.message}`)
      return
    }
    throw err
  }
}
