import express from 'express'
import { db } from '../../db.js'
import { requireAuth, asyncHandler, HttpError } from '../../middleware.js'
import { assertObjectIdLike } from '../../validation.js'
import { fetchPayment } from '../../services/mercadoPago.js'
import {
  ensureOrderZip,
  markOrderPaid,
  voidOtherCouponOrders,
  fulfillApprovedPayment,
} from '../../services/orders.js'
import {
  sendOrderReceiptOnce,
  sendOrderAdminNotifyOnce,
} from '../../services/email.js'
import { createCheckoutOrder } from '../../services/checkout.js'
import { confirmLemonCheckout } from '../../services/lemonPayments.js'
import { isQaBuyer } from '../../qa.js'

/** País del request según el proxy (Vercel / Cloudflare), en mayúsculas o null. */
export function requestCountry(req) {
  const raw =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-country-code'] ||
    ''
  const code = String(raw).trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : null
}

/**
 * Compra de templates y composiciones del builder: crear la orden con los
 * precios del servidor (y el cupón, si viene) y el checkout de la pasarela
 * (Checkout Pro de MP en ARS, o Lemon Squeezy en USD); confirmar el pago al volver
 * (en test MP no manda webhooks; con Lemon Squeezy se espera al webhook); qué
 * pasarelas hay y desde qué país viene el request; y el pago mock de
 * desarrollo. Los webhooks viven en webhooks.js.
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
              ...(order.qa ? { qa: true } : {}),
            }
          : null,
      })
    }),
  )

  // Qué pasarelas hay y desde dónde se conecta: el carrito preselecciona
  // «Argentina» (MP) o «internacional» (Lemon Squeezy, USD). Es solo el default:
  // el comprador elige. Sin sesión (se muestra antes de loguearse).
  router.get('/api/checkout/methods', (req, res) => {
    const country = requestCountry(req)
    // En modo prueba (no cobra), solo para las cuentas de QA: para el resto no hay carril.
    const lemonOn =
      Boolean(config.lemon?.enabled) && (!config.lemon.testMode || isQaBuyer(req.user, config))
    res.set('Cache-Control', 'private, no-store')
    res.json({
      country,
      suggested: lemonOn && country && country !== 'AR' ? 'lemonsqueezy' : 'mercadopago',
      providers: {
        mercadopago: { enabled: true, mock: Boolean(config.mpMock), currency: 'ARS' },
        lemonsqueezy: {
          enabled: lemonOn,
          currency: 'USD',
          ...(lemonOn ? { testMode: Boolean(config.lemon.testMode) } : {}),
        },
      },
    })
  })

  router.post(
    '/api/checkout',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      res.json(
        await createCheckoutOrder({
          user: req.user,
          items: req.body?.items,
          couponCode: req.body?.couponCode,
          provider: req.body?.provider === 'lemonsqueezy' ? 'lemonsqueezy' : 'mercadopago',
          locale: req.body?.locale,
          config,
        }),
      )
    }),
  )

  /**
   * Vuelta de Lemon Squeezy: la orden la cumple el webhook; esto solo dice cómo va
   * (409 mientras el webhook no llegó: el front reintenta). Lee la orden de este
   * usuario, no confía en la URL.
   */
  router.post(
    '/api/checkout/lemonsqueezy/confirm',
    requireAuth,
    limits.checkout,
    asyncHandler(async (req, res) => {
      if (!config.lemon?.enabled) {
        throw new HttpError(400, 'Confirmación de Lemon Squeezy no disponible')
      }
      const { order, orderId, alreadyFulfilled } = await confirmLemonCheckout({
        orderId: String(req.body?.orderId || '').trim(),
        userId: db.uid(req.user),
      })
      res.json({
        ok: true,
        orderId,
        alreadyFulfilled,
        status: order.status,
        order: {
          id: orderId,
          status: order.status,
          items: order.items,
          total: order.total,
          currency_id: order.currency_id,
        },
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
        config,
      })
      const paidOrder = paid || order
      await voidOtherCouponOrders(paidOrder, config)
      await ensureOrderZip(paidOrder, req.user, config)
      await sendReceiptSafely(paidOrder, req.user)
      res.json({ ok: true, orderId })
    }),
  )

  return router
}
