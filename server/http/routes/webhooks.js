import express from 'express'
import { asyncHandler } from '../../middleware.js'
import { handleMercadoPagoNotification } from '../../services/payments.js'
import { handleLemonNotification } from '../../services/lemonPayments.js'

/**
 * Webhooks de Mercado Pago (una sola URL): pagos únicos de Checkout Pro
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
      await handleMercadoPagoNotification({
        type: req.query.type || req.body?.type,
        dataId: req.query['data.id'] || req.body?.data?.id,
        source: req.query.source,
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        config,
      })
      res.sendStatus(200)
    }),
  )

  // Lemon Squeezy: la firma (`X-Signature`) va sobre el body crudo, que app.js
  // guarda en `req.rawBody` solo para esta ruta (express.json ya lo parseó).
  router.post(
    '/api/webhooks/lemonsqueezy',
    limits.webhook,
    asyncHandler(async (req, res) => {
      await handleLemonNotification({
        rawBody: req.rawBody ?? '',
        signature: req.headers['x-signature'],
        config,
      })
      res.sendStatus(200)
    }),
  )

  return router
}
