import express from 'express'
import { db } from '../../db.js'
import { requireAuth, asyncHandler, HttpError } from '../../middleware.js'
import { validateCheckoutItems, assertObjectIdLike } from '../../validation.js'
import { pendingExpiresAt } from '../../orderRetention.js'
import { createCheckoutPreference, fetchPayment } from '../../services/mercadoPago.js'
import {
  ensureOrderZip,
  markOrderPaid,
  fulfillApprovedPayment,
} from '../../services/orders.js'
import {
  sendOrderReceiptOnce,
  sendOrderAdminNotifyOnce,
} from '../../services/email.js'
import { discountedArsFromUsd } from '../../catalog.js'
import { getUsdArsRate } from '../../fx.js'
import { resolveCouponForCheckout } from '../../services/coupons.js'

/**
 * Compra de templates y composiciones del builder: crear la orden con los
 * precios del servidor (y el cupón, si viene) y la preferencia de Checkout
 * Pro; confirmar el pago al volver de MP (en test MP no manda webhooks); y el
 * pago mock de desarrollo. El webhook de MP vive en webhooks.js.
 */
export function createCheckoutRouter({ config, limits }) {
  const router = express.Router()

  async function sendReceiptSafely(order, user) {
    try {
      const result = await sendOrderReceiptOnce({ order, user, config })
      if (result.sent) {
        console.log(`Order receipt sent order=${db.uid(order) || order.id}`)
      }
    } catch (emailErr) {
      console.error('Order receipt email failed', emailErr)
    }
    try {
      const result = await sendOrderAdminNotifyOnce({ order, user, config })
      if (result.sent) {
        console.log(`Order admin notify sent order=${db.uid(order) || order.id}`)
      }
    } catch (emailErr) {
      console.error('Order admin notify failed', emailErr)
    }
  }

  /**
   * Confirma un pago al volver de Checkout Pro. Obligatorio en test:
   * MP no envía webhooks con credenciales de prueba.
   */
  router.post(
    '/api/checkout/confirm',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      if (config.mpMock || !config.mpAccessToken) {
        throw new HttpError(400, 'Confirmación MP no disponible en modo mock')
      }

      const paymentId = String(
        req.body?.paymentId || req.body?.collection_id || '',
      ).trim()
      if (!paymentId || paymentId === 'null') {
        throw new HttpError(400, 'paymentId requerido')
      }

      const payment = await fetchPayment(config.mpAccessToken, paymentId)
      const { order, orderId, alreadyFulfilled } = await fulfillApprovedPayment({
        payment,
        config,
        expectedUserId: db.uid(req.user),
      })

      res.json({
        ok: true,
        orderId,
        alreadyFulfilled,
        status: order?.status || 'paid',
        order: order
          ? {
              id: orderId,
              status: order.status,
              items: order.items,
              total: order.total,
              currency_id: order.currency_id,
            }
          : null,
      })
    }),
  )

  router.post(
    '/api/checkout',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      const fx = await getUsdArsRate()
      const resolved = validateCheckoutItems(req.body?.items, {
        maxCartItems: config.maxCartItems,
        maxRecipeSections: config.maxRecipeSections,
        rate: fx.rate,
      })

      // Cupón de bienvenida: el cliente manda solo el código; el descuento lo
      // calcula el servidor sobre el precio de lista, nunca sale de un monto suyo.
      const coupon = req.body?.couponCode
        ? await resolveCouponForCheckout({
            code: req.body.couponCode,
            userId: db.uid(req.user),
            userEmail: req.user.email,
          })
        : null
      const lines = coupon
        ? resolved.map((i) => ({
            ...i,
            unit_price: discountedArsFromUsd(i.unit_price_usd, fx.rate, coupon.percent),
          }))
        : resolved

      const total = lines.reduce((sum, i) => sum + i.unit_price, 0)
      const order = await db.createOrder({
        userId: db.uid(req.user),
        status: 'pending',
        items: lines.map((i) => ({
          sku: i.sku,
          title: i.title,
          unit_price: i.unit_price,
          unit_price_usd: i.unit_price_usd,
          currency_id: i.currency_id,
          recipe: i.recipe || undefined,
        })),
        total,
        totalUsd: resolved.reduce((sum, i) => sum + i.unit_price_usd, 0),
        fxRate: fx.rate,
        couponCode: coupon?.code,
        discountPct: coupon?.percent,
        currency_id: 'ARS',
        expiresAt: pendingExpiresAt(),
      })

      const orderId = db.uid(order) || order.id

      if (config.mpMock) {
        return res.json({
          init_point: `${config.clientUrl}/checkout/mock?orderId=${orderId}`,
          orderId,
          mock: true,
        })
      }

      const result = await createCheckoutPreference({
        accessToken: config.mpAccessToken,
        items: lines,
        orderId,
        userId: db.uid(req.user),
        clientUrl: config.clientUrl,
        apiPublicUrl: config.apiPublicUrl,
        payer: { email: req.user.email, name: req.user.name },
      })

      order.mpPreferenceId = result.id
      await order.save()

      // sandbox_init_point está deprecado por MP: con credenciales de Prueba,
      // init_point ya abre el entorno de test.
      res.json({
        init_point: result.init_point,
        orderId,
      })
    }),
  )

  router.post(
    '/api/checkout/mock-pay',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      if (!config.mpMock && !config.authDev) {
        throw new HttpError(403, 'Mock pay deshabilitado')
      }
      const orderId = String(req.body?.orderId || '')
      assertObjectIdLike(orderId)
      const order = await db.findOrderById(orderId)
      if (!order || String(order.userId) !== String(db.uid(req.user))) {
        throw new HttpError(404, 'Orden no encontrada')
      }
      const { order: paid } = await markOrderPaid({
        orderId,
        mpPaymentId: `mock-${Date.now()}`,
      })
      const paidOrder = paid || order
      await ensureOrderZip(paidOrder, req.user, config)
      await sendReceiptSafely(paidOrder, req.user)
      res.json({ ok: true, orderId })
    }),
  )

  return router
}
