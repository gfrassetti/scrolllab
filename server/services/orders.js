import fs from 'node:fs'
import path from 'node:path'
import {
  packFixedTemplate,
  packCustomTemplate,
  packBundleTemplate,
} from '../packaging.js'
import { BUNDLE_MODELS } from '../catalog.js'
import { HttpError } from '../validation.js'
import { db } from '../db.js'
import { assertPaymentMatchesOrder } from './mercadoPago.js'
import { sendOrderReceiptOnce, sendOrderAdminNotifyOnce } from './email.js'

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
    } else if (item.sku === 'bundle') {
      await packBundleTemplate({
        models: BUNDLE_MODELS,
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
    const processing = ['pending', 'in_process', 'authorized'].includes(
      payment.status,
    )
    throw new HttpError(
      processing ? 409 : 400,
      processing
        ? 'Mercado Pago todavía está procesando el pago'
        : 'El pago no fue aprobado',
    )
  }

  const orderId = payment.external_reference || payment.metadata?.orderId
  if (!orderId) {
    throw new HttpError(400, 'Pago sin referencia de orden')
  }

  // Un external_reference que no es ObjectId hace que Mongo tire CastError:
  // eso es una orden que no existe, no un error del servidor.
  let order
  try {
    order = await db.findOrderById(orderId)
  } catch (err) {
    if (err?.name === 'CastError') {
      throw new HttpError(404, 'No encontramos la orden de ese pago')
    }
    throw err
  }
  if (!order) {
    throw new HttpError(404, 'No encontramos la orden de ese pago')
  }

  const orderUserId = String(order.userId)
  if (expectedUserId && orderUserId !== String(expectedUserId)) {
    throw new HttpError(
      403,
      'Ese pago pertenece a otra cuenta. Entrá con la cuenta que usaste para comprar.',
    )
  }

  assertPaymentMatchesOrder(payment, {
    ...(typeof order.toObject === 'function' ? order.toObject() : order),
    id: db.uid(order) || order.id,
  })

  const { order: updated, created } = await markOrderPaid({
    orderId: db.uid(order) || order.id,
    mpPaymentId: payment.id,
  })

  // El webhook puede haber cumplido la orden antes del confirm: confirmar de
  // nuevo tiene que devolver éxito, no un error.
  const paid = updated || order

  let user = null
  if (paid.status === 'paid') {
    try {
      user = await db.findUserById(paid.userId)
    } catch (userErr) {
      console.error('Order user lookup failed', userErr)
    }
  }
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
    try {
      const result = await sendOrderAdminNotifyOnce({ order: paid, user, config })
      if (result.sent) {
        console.log(`Order admin notify sent order=${db.uid(paid) || paid.id}`)
      }
    } catch (emailErr) {
      console.error('Order admin notify failed', emailErr)
    }
  }

  return {
    order: paid,
    orderId: db.uid(paid) || paid.id || orderId,
    alreadyFulfilled: !created,
  }
}

/**
 * Cuenta la descarga de forma atómica. Con maxDownloads 0 nunca frena:
 * el contador queda solo como señal de abuso para soporte.
 */
export async function consumeDownload(orderId, maxDownloads, meta = {}) {
  const order = await db.consumeDownloadAtomic(orderId, maxDownloads, meta)
  if (!order) {
    throw new HttpError(429, 'Límite de descargas alcanzado o orden no disponible')
  }
  return order
}
