import fs from 'node:fs'
import path from 'node:path'
import {
  packFixedTemplate,
  packCustomTemplate,
} from '../packaging.js'
import { HttpError } from '../validation.js'
import { db } from '../db.js'
import { assertPaymentMatchesOrder } from './mercadoPago.js'
import { sendOrderReceiptOnce } from './email.js'

const packingLocks = new Map()

export function assertPathInsideStorage(filePath, storageDir) {
  const resolved = path.resolve(filePath)
  const root = path.resolve(storageDir)
  const rel = path.relative(root, resolved)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new HttpError(500, 'Ruta de almacenamiento inválida')
  }
  return resolved
}

/**
 * Empaqueta el ZIP de una orden una sola vez (lock por orderId).
 */
export async function ensureOrderZip(order, user, config) {
  const orderId = db.uid(order) || order.id
  if (order.zipPath) {
    try {
      const safe = assertPathInsideStorage(order.zipPath, config.storageDir)
      if (fs.existsSync(safe)) return safe
    } catch {
      /* regenerar */
    }
  }

  if (packingLocks.has(orderId)) {
    return packingLocks.get(orderId)
  }

  const work = (async () => {
    const dest = assertPathInsideStorage(
      path.join(config.storageDir, `${orderId}.zip`),
      config.storageDir,
    )
    fs.mkdirSync(path.dirname(dest), { recursive: true })

    const licenseMeta = {
      orderId,
      email: user.email,
      date: new Date().toISOString().slice(0, 10),
    }

    const item = order.items[0]
    if (!item) throw new HttpError(500, 'Orden sin ítems')

    if (
      item.sku === 'custom' ||
      String(item.sku).startsWith('custom:') ||
      item.recipe?.length
    ) {
      await packCustomTemplate({
        recipe: item.recipe || [],
        destPath: dest,
        licenseMeta,
      })
    } else {
      await packFixedTemplate({
        model: item.sku,
        destPath: dest,
        licenseMeta,
      })
    }

    await db.setOrderZipPath(orderId, dest)
    order.zipPath = dest
    return dest
  })()

  packingLocks.set(orderId, work)
  try {
    return await work
  } finally {
    packingLocks.delete(orderId)
  }
}

/**
 * Marca la orden como paga de forma atómica e idempotente.
 * Devuelve { order, created: boolean } donde created=false si ya estaba paga.
 */
export async function markOrderPaid({ orderId, mpPaymentId }) {
  return db.markOrderPaidAtomic({ orderId, mpPaymentId })
}

/**
 * Valida un pago aprobado de MP, marca la orden y empaqueta el ZIP.
 * Usado por webhook y por el return del checkout (necesario en test:
 * MP no envía webhooks con credenciales de prueba).
 */
export async function fulfillApprovedPayment({
  payment,
  config,
  expectedUserId = null,
}) {
  if (payment.status !== 'approved') {
    throw new HttpError(400, 'Pago no aprobado')
  }

  const orderId = payment.external_reference || payment.metadata?.orderId
  if (!orderId) {
    throw new HttpError(400, 'Pago sin referencia de orden')
  }

  const order = await db.findOrderById(orderId)
  if (!order) {
    throw new HttpError(404, 'Orden no encontrada')
  }

  const orderUserId = String(order.userId)
  if (expectedUserId && orderUserId !== String(expectedUserId)) {
    throw new HttpError(403, 'La orden no pertenece a este usuario')
  }

  assertPaymentMatchesOrder(payment, {
    ...(typeof order.toObject === 'function' ? order.toObject() : order),
    id: db.uid(order) || order.id,
  })

  const { order: paid } = await markOrderPaid({
    orderId: db.uid(order) || order.id,
    mpPaymentId: payment.id,
  })

  if (paid) {
    const user = await db.findUserById(paid.userId)
    if (user) {
      try {
        await ensureOrderZip(paid, user, config)
      } catch (packErr) {
        console.error('ZIP pack failed after payment', packErr)
      }
      try {
        const result = await sendOrderReceiptOnce({ order: paid, user, config })
        if (result.sent) {
          console.log(`Order receipt sent order=${db.uid(paid) || paid.id}`)
        }
      } catch (emailErr) {
        console.error('Order receipt email failed', emailErr)
      }
    }
  }

  return { order: paid, orderId: db.uid(paid) || orderId }
}

/**
 * Consume un slot de descarga de forma atómica.
 */
export async function consumeDownload(orderId, maxDownloads) {
  const order = await db.consumeDownloadAtomic(orderId, maxDownloads)
  if (!order) {
    throw new HttpError(429, 'Límite de descargas alcanzado o orden no disponible')
  }
  return order
}
