import express from 'express'
import { asyncHandler, HttpError } from '../../middleware.js'
import { verifyMpWebhookSignature, fetchPayment } from '../../services/mercadoPago.js'
import {
  applyUpgradePayment,
  isUpgradeReference,
  handlePreapprovalEvent,
  handleAuthorizedPaymentEvent,
} from '../../services/subscriptions.js'
import {
  fulfillApprovedPayment,
  reverseOrderPayment,
  REVERSED_PAYMENT_STATUSES,
} from '../../services/orders.js'

/**
 * Webhook de Mercado Pago (una sola URL): pagos únicos de Checkout Pro
 * (compras y la diferencia de un upgrade de LAB) y eventos de suscripción
 * (preapproval / cuota cobrada). Firma verificada siempre; un 4xx corta con
 * 200 para que MP no reintente, un 5xx se propaga para que sí reintente.
 */
export function createWebhooksRouter({ config, limits }) {
  const router = express.Router()

  router.post(
    '/api/webhooks/mercadopago',
    limits.webhook,
    asyncHandler(async (req, res) => {
      const type = req.query.type || req.body?.type
      const dataId = req.query['data.id'] || req.body?.data?.id
      if (!dataId) return res.sendStatus(200)

      // ——— Suscripciones (LAB) — misma URL, otro `type` ———
      if (
        type === 'subscription_preapproval' ||
        type === 'subscription_authorized_payment'
      ) {
        if (!config.mpSubs.accessToken) return res.sendStatus(200)
        verifyMpWebhookSignature({
          secret: config.mpSubs.webhookSecret,
          xSignature: req.headers['x-signature'],
          xRequestId: req.headers['x-request-id'],
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
            return res.sendStatus(200)
          }
          throw err
        }
        return res.sendStatus(200)
      }

      // ——— Pago único (Checkout Pro) ———
      // Compras del market, y la diferencia al subir de plan en LAB: esa
      // preference la arma la app de suscripciones y notifica con
      // `?source=lab` (su secreto y su token, por si son otra app de MP).
      const lab = req.query.source === 'lab'
      const payToken = lab ? config.mpSubs.accessToken : config.mpAccessToken
      if (config.mpMock || !payToken) {
        return res.sendStatus(200)
      }
      if (type !== 'payment') {
        return res.sendStatus(200)
      }

      verifyMpWebhookSignature({
        secret: lab ? config.mpSubs.webhookSecret : config.mpWebhookSecret,
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        dataId,
      })

      // Un 4xx no se arregla reintentando: cortamos con 200 para que MP no
      // repita el evento. Los 5xx (MP caído, Mongo) sí tienen que reintentarse.
      try {
        const payment = await fetchPayment(payToken, dataId)
        if (isUpgradeReference(payment.external_reference)) {
          await applyUpgradePayment({ payment, config })
        } else if (REVERSED_PAYMENT_STATUSES.has(payment.status)) {
          await reverseOrderPayment({ payment, config })
        } else {
          await fulfillApprovedPayment({ payment, config })
        }
      } catch (err) {
        if (err instanceof HttpError && err.status < 500) {
          console.error(`MP webhook skipped payment=${dataId}: ${err.message}`)
          return res.sendStatus(200)
        }
        throw err
      }

      res.sendStatus(200)
    }),
  )

  return router
}
