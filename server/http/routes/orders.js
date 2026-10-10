import express from 'express'
import fs from 'node:fs'
import { db } from '../../db.js'
import { requireAuth, asyncHandler, HttpError } from '../../middleware.js'
import { assertObjectIdLike } from '../../validation.js'
import { purchaseCode } from '../../license.js'
import { visibleOrders } from '../../orderRetention.js'
import {
  ensureOrderZip,
  ensureOrderItemZip,
  orderItemIndex,
  orderItemZipPath,
  consumeDownload,
  assertPathInsideStorage,
} from '../../services/orders.js'
import { signDownloadToken, verifyDownloadToken } from '../../downloadToken.js'
import { refundEligibility } from '../../../src/domain/policy.js'
import { orderPriceSummary } from '../../../src/domain/orderSummary.js'

/**
 * Mis compras y la entrega del ZIP: la orden paga pide un link firmado (TTL +
 * tope de descargas) y el link baja el archivo, siempre dentro de STORAGE_DIR.
 * Con `?item=N` el link es del ZIP de ese ítem solo (varias composiciones del
 * builder en la misma compra se bajan por separado); sin él, de la orden.
 */
export function createOrdersRouter({ config, limits }) {
  const router = express.Router()

  router.get(
    '/api/orders',
    requireAuth,
    asyncHandler(async (req, res) => {
      const all = await db.findOrdersByUser(db.uid(req.user))
      res.json({
        orders: visibleOrders(all).map((o) => ({
          id: db.uid(o) || o.id,
          status: o.status,
          items: o.items,
          total: o.total,
          totalUsd: o.totalUsd,
          fxRate: o.fxRate,
          currency_id: o.currency_id,
          createdAt: o.createdAt,
          downloadCount: o.downloadCount || 0,
          // ¿Todavía hay reembolso por arrepentimiento? (plazo + ZIP sin descargar)
          refund: refundEligibility(o),
          // Subtotal a precio de lista, descuento de primera compra y total.
          summary: orderPriceSummary(o),
          purchaseCode: purchaseCode(db.uid(o) || o.id, config.downloadSecret),
          ...(o.qa ? { qa: true } : {}),
          // Pendiente con un pago rechazado: no está «confirmando», se rechazó.
          ...(o.status === 'pending' && o.paymentFailedAt ? { paymentFailed: true } : {}),
        })),
      })
    }),
  )

  router.get(
    '/api/orders/:id/download',
    requireAuth,
    limits.downloadToken,
    asyncHandler(async (req, res) => {
      assertObjectIdLike(req.params.id)
      const order = await db.findOrderById(req.params.id)
      if (!order || String(order.userId) !== String(db.uid(req.user))) {
        throw new HttpError(404, 'Orden no encontrada')
      }
      if (order.status === 'refunded') {
        throw new HttpError(
          403,
          'Esta compra fue reembolsada: la descarga ya no está disponible.',
        )
      }
      if (order.status !== 'paid') {
        throw new HttpError(403, 'La orden todavía no está paga')
      }
      if (
        config.maxDownloads > 0 &&
        (order.downloadCount || 0) >= config.maxDownloads
      ) {
        throw new HttpError(429, 'Límite de descargas alcanzado')
      }

      const item = req.query.item !== undefined ? orderItemIndex(order, req.query.item) : undefined
      if (item === undefined) await ensureOrderZip(order, req.user, config)
      else await ensureOrderItemZip(order, item, req.user, config)
      const orderId = db.uid(order) || order.id
      const token = signDownloadToken({
        orderId,
        userId: String(db.uid(req.user)),
        secret: config.downloadSecret,
        ttlSeconds: config.downloadTtl,
        item,
      })

      res.json({ url: `/api/download/${token}`, expiresIn: config.downloadTtl })
    }),
  )

  router.get(
    '/api/download/:token',
    limits.download,
    asyncHandler(async (req, res) => {
      let data
      try {
        data = verifyDownloadToken(req.params.token, config.downloadSecret)
      } catch {
        throw new HttpError(400, 'Token inválido')
      }
      if (!data) {
        // El link vencido llega por navegación del browser: un JSON crudo no le
        // dice nada al comprador, así que lo devolvemos a Mis compras avisado.
        if (String(req.headers.accept || '').includes('text/html')) {
          const base = config.clientUrl.replace(/\/$/, '')
          return res.redirect(302, `${base}/account?download=expired`)
        }
        throw new HttpError(
          410,
          'El link de descarga venció. Entrá a Mis compras y tocá Descargar de nuevo.',
        )
      }

      const existing = await db.findOrderById(data.orderId)
      if (!existing || existing.status !== 'paid') {
        throw new HttpError(404, 'Orden no disponible')
      }
      if (String(existing.userId) !== String(data.userId)) {
        throw new HttpError(403, 'Forbidden')
      }
      const single = Number.isInteger(data.item)
      if (!single && !existing.zipPath) {
        throw new HttpError(404, 'ZIP no encontrado')
      }
      const safePath = single
        ? orderItemZipPath(data.orderId, orderItemIndex(existing, data.item), config.storageDir)
        : assertPathInsideStorage(existing.zipPath, config.storageDir)
      if (!fs.existsSync(safePath)) {
        throw new HttpError(404, 'ZIP no encontrado')
      }

      await consumeDownload(data.orderId, config.maxDownloads, { ip: req.ip })
      res.download(safePath, `scrolllab-${data.orderId}${single ? `-${data.item + 1}` : ''}.zip`)
    }),
  )

  return router
}
