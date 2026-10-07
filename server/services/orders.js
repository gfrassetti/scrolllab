import fs from 'node:fs'
import path from 'node:path'
import { packOrderTemplate, PACK_VERSION } from '../packaging.js'
import { BUNDLE_MODELS } from '../catalog.js'
import { purchaseCode } from '../license.js'
import { HttpError } from '../errors.js'
import { db } from '../db.js'
import { assertPaymentMatchesOrder } from './mercadoPago.js'
import {
  sendOrderReceiptOnce,
  sendOrderAdminNotifyOnce,
  sendAdminAlert,
} from './email.js'
import { redeemCouponForOrder } from './coupons.js'

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
 * Empaqueta el ZIP de una orden una sola vez (lock por orderId). Con todos sus
 * ítems: antes solo entraba el primero y quien compraba dos templates juntos
 * pagaba los dos y recibía uno.
 */
export async function ensureOrderZip(order, user, config) {
  const orderId = db.uid(order) || order.id
  // Un ZIP armado con otra versión del empaquetador (PACK_VERSION) se rearma:
  // así un arreglo le llega también a quien ya había comprado.
  if (order.zipPath && order.zipVersion === PACK_VERSION) {
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

    // La licencia se fecha al emitirse (el primer armado) y rearmar no la
    // cambia. Un ZIP de antes de guardar la fecha usa la de la orden.
    const reissue = Boolean(order.zipPath)
    const licenseDate =
      order.licenseDate ||
      new Date(reissue ? order.createdAt || Date.now() : Date.now())
        .toISOString()
        .slice(0, 10)
    const licenseMeta = {
      orderId,
      email: user.email,
      date: licenseDate,
      purchaseCode: purchaseCode(orderId, config.downloadSecret),
    }

    if (!order.items?.length) throw new HttpError(500, 'Orden sin ítems')
    // Se arma aparte y se renombra encima: una descarga en curso del ZIP
    // anterior sigue leyendo su archivo, nunca uno a medio escribir.
    const tmp = `${dest}.${process.pid}-${Date.now()}.tmp`
    try {
      await packOrderTemplate({
        items: order.items,
        destPath: tmp,
        licenseMeta,
        bundleModels: BUNDLE_MODELS,
      })
      fs.renameSync(tmp, dest)
    } finally {
      fs.rmSync(tmp, { force: true })
    }

    await db.setOrderZipPath(orderId, dest, { zipVersion: PACK_VERSION, licenseDate })
    order.zipPath = dest
    order.zipVersion = PACK_VERSION
    order.licenseDate = licenseDate
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
 * Mercado Pago pasa `mpPaymentId`; Paddle, `paddleTransactionId`.
 * @param {{ orderId: string, mpPaymentId?: string, paddleTransactionId?: string }} args
 */
export async function markOrderPaid({ orderId, mpPaymentId, paddleTransactionId }) {
  const result = await db.markOrderPaidAtomic({ orderId, mpPaymentId, paddleTransactionId })
  // Canjear el cupón es contabilidad: si falla no puede frenar lo ya pagado.
  if (result.created && result.order?.couponCode) {
    try {
      const { redeemed } = await redeemCouponForOrder(result.order)
      if (!redeemed) {
        // Dos checkouts abiertos con el mismo cupón y pagados los dos: el
        // segundo ya se cobró con descuento.
        console.warn(
          `checkout CUPÓN USADO DOS VECES code=${result.order.couponCode} order=${orderId}`,
        )
      }
    } catch (err) {
      console.error('Coupon redeem failed', err)
    }
  }
  return result
}

const money = (payment) =>
  `${payment.transaction_amount} ${payment.currency_id || 'ARS'}`
const payerOf = (payment) => payment.payer?.email || 'mail desconocido'

/**
 * Pago que pide acción a mano: log greppable + mail al admin (una vez por
 * evento). Nunca tira: el webhook tiene que responder igual.
 */
export function alertAdmin({ kind, key, title, lines, config }) {
  console.error(`checkout ${title} ${lines.join(' · ')}`)
  sendAdminAlert({ kind, key, subject: title, lines: [title, '', ...lines], config }).catch(
    (err) => console.error('checkout alert email', err?.message),
  )
}

/**
 * Un pago aprobado cuya orden no existe. Si es nuestro (la referencia tiene
 * forma de orden y no es una suscripción de LAB, cuyos cobros también llegan
 * como `payment`), alguien pagó y no recibe nada: la orden venció (efectivo
 * acreditado tarde) o se borró.
 */
async function reportPaymentWithoutOrder(payment, ref, config) {
  if (payment.operation_type === 'recurring_payment') return
  if (!/^[a-f0-9]{24}$/i.test(String(ref))) return
  try {
    if (await db.findSubscriptionById(ref)) return
  } catch {
    /* no es una suscripción */
  }
  alertAdmin({
    kind: 'orphan',
    key: String(payment.id),
    title: 'PAGO SIN ORDEN — entregar o reembolsar',
    lines: [
      `pago MP ${payment.id} · ${money(payment)} · ${payerOf(payment)}`,
      `referencia ${ref}: la orden no existe (venció o se borró)`,
    ],
    config,
  })
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
    if (err?.name !== 'CastError') throw err
  }
  if (!order) {
    await reportPaymentWithoutOrder(payment, orderId, config)
    throw new HttpError(404, 'No encontramos la orden de ese pago')
  }

  const orderUserId = String(order.userId)
  if (expectedUserId && orderUserId !== String(expectedUserId)) {
    throw new HttpError(
      403,
      'Ese pago pertenece a otra cuenta. Entrá con la cuenta que usaste para comprar.',
    )
  }

  try {
    assertPaymentMatchesOrder(payment, {
      ...(typeof order.toObject === 'function' ? order.toObject() : order),
      id: db.uid(order) || order.id,
    })
  } catch (err) {
    // Alguien pagó y la orden NO se entrega: sin este aviso el webhook lo
    // anotaba en el log y respondía 200, y nadie se enteraba.
    if (err instanceof HttpError && err.status === 400) {
      alertAdmin({
        kind: 'mismatch',
        key: `mp-${payment.id}`,
        title: 'PAGO NO COINCIDE CON LA ORDEN — revisar o reembolsar',
        lines: [
          `pago MP ${payment.id} · ${money(payment)} · ${payerOf(payment)}`,
          `orden ${db.uid(order) || order.id} espera ${order.total} ${order.currency_id}`,
          `motivo: ${err.message}`,
        ],
        config,
      })
    }
    throw err
  }

  const { order: updated, created } = await markOrderPaid({
    orderId: db.uid(order) || order.id,
    mpPaymentId: payment.id,
  })

  // El webhook puede haber cumplido la orden antes del confirm: confirmar de
  // nuevo tiene que devolver éxito, no un error.
  const paid = updated || order

  // Otro pago aprobado para una orden que ya estaba paga (MP deja pagar el
  // mismo link más de una vez): se cobró dos veces.
  if (!created && paid.mpPaymentId && String(paid.mpPaymentId) !== String(payment.id)) {
    alertAdmin({
      kind: 'duplicate',
      key: String(payment.id),
      title: 'COMPRA PAGADA DOS VECES — reembolsar',
      lines: [
        `pago MP ${payment.id} · ${money(payment)} · ${payerOf(payment)}`,
        `orden ${db.uid(paid) || paid.id} (${paid.status}) ya pagada con el pago ${paid.mpPaymentId}`,
      ],
      config,
    })
  }

  await deliverPaidOrder(paid, config)

  return {
    order: paid,
    orderId: db.uid(paid) || paid.id || orderId,
    alreadyFulfilled: !created,
  }
}

/**
 * Lo que sigue a cobrar una orden, sea cual sea la pasarela: el ZIP, el recibo
 * al comprador y el aviso al dueño. Idempotente (lock del ZIP + claims de los
 * mails) y nunca tira: el pago ya está registrado.
 */
export async function deliverPaidOrder(paid, config) {
  if (paid?.status !== 'paid') return
  let user = null
  try {
    user = await db.findUserById(paid.userId)
  } catch (userErr) {
    console.error('Order user lookup failed', userErr)
  }
  if (!user) return
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

/**
 * Un pago de una orden fue rechazado (MP `rejected`, Paddle
 * `transaction.payment_failed`): se anota y la orden sigue pendiente. El mail
 * no sale acá: el comprador suele reintentar en el mismo checkout, así que lo
 * manda el barrido (services/paymentFailedSweep.js) un rato después y solo si
 * la orden sigue sin pagarse. Nunca tira.
 * @param {{ orderId: string, config?: any }} args
 */
export async function notifyOrderPaymentFailed({ orderId }) {
  if (!/^[a-f0-9]{24}$/i.test(String(orderId || ''))) return { skipped: 'sin orden' }
  try {
    const order = await db.markOrderPaymentFailed(orderId)
    if (!order) return { skipped: 'orden no pendiente' }
    console.warn(`checkout pago rechazado order=${orderId}`)
    return { marked: true }
  } catch (err) {
    console.error('Order payment-failed mark failed', err?.message || err)
    return { skipped: 'error' }
  }
}

/**
 * Estados de MP que dan vuelta un pago aprobado. Se consulta con `payment.status`,
 * que MP puede no mandar: `has(undefined)` es false.
 * @type {Set<string | undefined>}
 */
export const REVERSED_PAYMENT_STATUSES = new Set(['refunded', 'charged_back'])

/**
 * Reembolso o contracargo del pago de una orden: la orden pasa a `refunded`
 * y deja de descargarse. Si el pago devuelto no es el que la pagó (el
 * reembolso de un pago duplicado), la orden sigue paga.
 */
export async function reverseOrderPayment({ payment, config }) {
  const ref = payment.external_reference
  if (!ref) return { skipped: 'sin referencia' }
  let order = null
  try {
    order = await db.findOrderById(ref)
  } catch (err) {
    if (err?.name !== 'CastError') throw err
  }
  if (!order) return { skipped: 'sin orden' }
  const orderId = db.uid(order) || order.id
  if (String(order.mpPaymentId) !== String(payment.id)) {
    console.warn(
      `checkout reembolso de otro pago order=${orderId} pago=${payment.id} ` +
        `(la orden sigue ${order.status}, pagada con ${order.mpPaymentId || '-'})`,
    )
    return { skipped: 'otro pago' }
  }
  if (order.status === 'refunded') return { alreadyReversed: true }

  const updated = await db.markOrderRefundedAtomic({
    orderId,
    mpPaymentId: payment.id,
    reason: payment.status,
  })
  if (!updated) return { skipped: `orden ${order.status}` }
  await recordMpRefund({ payment, order, partial: false })
  alertAdmin({
    kind: 'reversed',
    key: `${payment.id}-${payment.status}`,
    title:
      payment.status === 'charged_back'
        ? 'CONTRACARGO — descargas cortadas'
        : 'ORDEN REEMBOLSADA — descargas cortadas',
    lines: [
      `pago MP ${payment.id} · ${money(payment)} · ${payerOf(payment)}`,
      `orden ${orderId}: ${order.items.map((i) => i.title || i.sku).join(', ')}`,
    ],
    config,
  })
  return { reversed: true, order: updated }
}

/**
 * Anota en el libro de reembolsos un pago de MP devuelto (total, parcial o
 * contracargo), con quién y cuánto: lo muestra el panel. Una fila por pago; un
 * parcial que después se completa actualiza la misma. Nunca corta el webhook.
 * @param {{ payment: any, order?: any, partial: boolean }} args
 */
export async function recordMpRefund({ payment, order = null, partial }) {
  try {
    let o = order
    if (!o && payment.external_reference) {
      o = await db.findOrderById(String(payment.external_reference)).catch(() => null)
    }
    const user = o?.userId ? await db.findUserById(String(o.userId)).catch(() => null) : null
    const refunded = Number(payment.transaction_amount_refunded) || 0
    await db.recordRefund({
      externalId: `mp-${payment.id}`,
      provider: 'mercadopago',
      kind: 'order',
      orderId: o ? String(db.uid(o) || o.id) : null,
      userId: o?.userId ? String(o.userId) : null,
      email: user?.email || payment.payer?.email || null,
      // Lo devuelto hasta ahora; un contracargo no lo informa: es el pago entero.
      amount: refunded > 0 ? refunded : Number(payment.transaction_amount),
      currency: payment.currency_id || o?.currency_id || 'ARS',
      partial,
      reason: payment.status === 'charged_back' ? 'charged_back' : 'refunded',
      refundedAt: new Date(),
    })
  } catch (err) {
    console.error(`refunds: no se pudo anotar el reembolso MP ${payment?.id}`, err?.message)
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
