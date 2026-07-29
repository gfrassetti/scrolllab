import fs from 'node:fs'
import path from 'node:path'
import {
  packFixedTemplate,
  packCustomTemplate,
} from '../packaging.js'
import { HttpError } from '../validation.js'
import { db } from '../db.js'

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
 * Consume un slot de descarga de forma atómica.
 */
export async function consumeDownload(orderId, maxDownloads) {
  const order = await db.consumeDownloadAtomic(orderId, maxDownloads)
  if (!order) {
    throw new HttpError(429, 'Límite de descargas alcanzado o orden no disponible')
  }
  return order
}
