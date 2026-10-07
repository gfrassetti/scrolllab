import { db } from '../db.js'
import { noteRefund } from './refundLedger.js'
import { handleLabRefund } from './subscriptions/labRefund.js'
import { HttpError } from '../errors.js'
import {
  verifyPaddleSignature,
  getTransaction,
  transactionItemsCents,
  transactionGrandTotal,
  usdCents,
  PADDLE_CURRENCY,
  PADDLE_PAID_STATUSES,
} from './paddle.js'
import {
  markOrderPaid,
  deliverPaidOrder,
  notifyOrderPaymentFailed,
  alertAdmin,
} from './orders.js'
import {
  handlePaddleLabTransaction,
  handlePaddleLabPaymentFailed,
  syncPaddleSubscription,
} from './subscriptions/paddleSync.js'

/**
 * Casos de uso de Paddle para las compras (market y builder) y el webhook
 * (una sola URL para órdenes y LAB). Ver docs/paddle.md.
 */

const IN_FLIGHT_STATUSES = new Set(['draft', 'ready', 'billed'])

const payerOf = (txn) => txn?.customer?.email || txn?.customer_id || 'cliente desconocido'
const money = (txn) => {
  const total = transactionGrandTotal(txn)
  return total == null ? '—' : `${total} ${txn.currency_code || PADDLE_CURRENCY}`
}

/**
 * ¿De quién es esta transacción? Lo deciden los ids que guardó el servidor, no
 * `custom_data` (viaja dentro de la transacción y no lo firmamos nosotros):
 * - una orden con ese `paddleTransactionId` → compra;
 * - `subscription_id` (lo pone Paddle) o un alta de LAB con ese
 *   `paddleTransactionId` → LAB;
 * - ninguna → nadie la reclama (se avisa si se cobró).
 * @returns {Promise<'order' | 'lab' | 'none'>}
 */
export async function transactionOwner(txn) {
  if (!txn?.id) return 'none'
  if (await db.findOrderByPaddleTransaction(txn.id)) return 'order'
  if (txn.subscription_id) return 'lab'
  if (await db.findSubscriptionByPaddle({ transactionId: txn.id })) return 'lab'
  return 'none'
}

/**
 * Cumple la orden de una transacción de Paddle cobrada: la valida contra la
 * orden (que la creó el servidor), la marca paga, arma el ZIP y manda los
 * mails. Idempotente: el webhook (`.paid` y `.completed`) y el confirm del
 * front pueden llegar en cualquier orden y cualquier cantidad de veces.
 *
 * Una transacción solo paga **su** orden: la que guardó su id al abrir el
 * checkout. Además coinciden `custom_data.orderId`, la moneda y la suma de
 * precios (antes de impuestos, que Paddle agrega según el país).
 * @param {{ transaction: any, config: any, expectedUserId?: string | null }} args
 */
export async function fulfillPaddleTransaction({ transaction: txn, config, expectedUserId = null }) {
  if (!PADDLE_PAID_STATUSES.has(txn?.status)) {
    const processing = IN_FLIGHT_STATUSES.has(txn?.status)
    throw new HttpError(
      processing ? 409 : 400,
      processing ? 'Paddle todavía está procesando el pago' : 'El pago no fue aprobado',
      { expose: true },
    )
  }

  const order = await db.findOrderByPaddleTransaction(txn.id)
  if (!order) {
    // Cobrada y sin dueño: ninguna orden ni alta de LAB guardó este id.
    alertAdmin({
      kind: 'orphan',
      key: `paddle-${txn.id}`,
      title: 'PAGO SIN ORDEN — entregar o reembolsar',
      lines: [
        `transacción Paddle ${txn.id} · ${money(txn)} · ${payerOf(txn)}`,
        `ninguna orden ni suscripción la abrió (orden indicada: ${txn.custom_data?.orderId || '-'})`,
      ],
      config,
    })
    throw new HttpError(404, 'No encontramos la orden de ese pago')
  }
  const orderId = String(db.uid(order) || order.id)

  if (expectedUserId && String(order.userId) !== String(expectedUserId)) {
    throw new HttpError(
      403,
      'Ese pago pertenece a otra cuenta. Entrá con la cuenta que usaste para comprar.',
      { expose: true },
    )
  }
  // Alguien pagó y la orden NO se entrega: el webhook lo anotaba en el log y
  // respondía 200, y nadie se enteraba. Ahora llega un mail (uno por motivo).
  const mismatch = (reason) => {
    alertAdmin({
      kind: 'mismatch',
      key: `paddle-${txn.id}-${reason.replace(/\W+/g, '-').toLowerCase()}`,
      title: 'PAGO NO COINCIDE CON LA ORDEN — revisar o reembolsar',
      lines: [
        `transacción Paddle ${txn.id} · ${money(txn)} · ${payerOf(txn)}`,
        `orden ${orderId} espera ${order.total} ${order.currency_id} (${order.provider})`,
        `motivo: ${reason}`,
      ],
      config,
    })
    return new HttpError(400, reason)
  }
  const customOrderId = txn.custom_data?.orderId
  if (customOrderId && String(customOrderId) !== orderId) {
    throw mismatch('Referencia de orden no coincide')
  }
  if (order.provider !== 'paddle' || order.currency_id !== PADDLE_CURRENCY) {
    throw mismatch('La orden no se cobra con Paddle')
  }
  if (txn.currency_code !== PADDLE_CURRENCY) {
    throw mismatch('Moneda del pago no coincide')
  }
  // Nuestros descuentos (cupón) ya vienen en el precio: uno hecho en Paddle
  // (código en el checkout o desde el panel) cobraría menos de lo que vale.
  if (txn.discount_id || Number(txn.details?.totals?.discount || 0) !== 0) {
    throw mismatch('El pago trae un descuento hecho en Paddle')
  }
  if (transactionItemsCents(txn) !== usdCents(order.total)) {
    console.error(
      `checkout paddle MONTO NO COINCIDE order=${orderId} txn=${txn.id} ` +
        `items=${transactionItemsCents(txn)} esperado=${usdCents(order.total)} (centavos)`,
    )
    throw mismatch('Monto del pago no coincide')
  }

  const { order: updated, created } = await markOrderPaid({
    orderId,
    paddleTransactionId: txn.id,
  })
  const paid = updated || order
  await deliverPaidOrder(paid, config)
  return { order: paid, orderId, alreadyFulfilled: !created }
}

/**
 * Reembolso o contracargo aprobado (`adjustment.*` con `action` refund /
 * chargeback). Total: la orden pasa a `refunded` y deja de descargarse.
 * Parcial, o de LAB: aviso al dueño para revisar a mano.
 */
export async function reversePaddleAdjustment({ adjustment: adj, config }) {
  if (adj?.status !== 'approved') return { skipped: `ajuste ${adj?.status}` }
  if (adj.action !== 'refund' && adj.action !== 'chargeback') {
    return { skipped: `ajuste ${adj.action}` }
  }
  const reason = adj.action === 'chargeback' ? 'charged_back' : 'refunded'
  const amount = Number(adj.totals?.total)
  const currency = adj.currency_code || adj.totals?.currency_code || PADDLE_CURRENCY
  const label = `${Number.isFinite(amount) ? amount / 100 : '—'} ${currency}`
  const order = adj.transaction_id
    ? await db.findOrderByPaddleTransaction(adj.transaction_id)
    : null
  // Cobro de LAB: libro + mail + (primer cobro o contracargo) baja inmediata.
  const labSub =
    !order && adj.subscription_id
      ? await db.findSubscriptionByPaddle({ subscriptionId: adj.subscription_id })
      : null
  if (labSub) {
    return handleLabRefund({
      sub: labSub,
      provider: 'paddle',
      externalId: `paddle-${adj.id}`,
      chargeId: adj.transaction_id || null,
      amount: Number.isFinite(amount) ? amount / 100 : 0,
      currency,
      partial: adj.type === 'partial',
      reason,
      config,
    })
  }
  await recordPaddleRefund({ adj, order, reason, amount, currency, config })

  if (!order) {
    alertAdmin({
      kind: 'reversed',
      key: `paddle-${adj.id}`,
      title:
        adj.action === 'chargeback'
          ? 'CONTRACARGO EN PADDLE — revisar'
          : 'REEMBOLSO EN PADDLE — revisar',
      lines: [
        `ajuste ${adj.id} · ${label} · transacción ${adj.transaction_id || '-'}`,
        adj.subscription_id
          ? `suscripción de LAB ${adj.subscription_id}: revisar el acceso a mano`
          : 'sin orden local',
      ],
      config,
    })
    return { skipped: 'sin orden' }
  }
  const orderId = String(db.uid(order) || order.id)
  if (adj.type === 'partial') {
    alertAdmin({
      kind: 'reversed',
      key: `paddle-${adj.id}`,
      title: 'REEMBOLSO PARCIAL — la orden sigue paga',
      lines: [`ajuste ${adj.id} · ${label}`, `orden ${orderId}`],
      config,
    })
    return { skipped: 'parcial' }
  }
  if (order.status === 'refunded') return { alreadyReversed: true }

  const updated = await db.markOrderRefundedAtomic({
    orderId,
    paddleTransactionId: adj.transaction_id,
    reason,
  })
  if (!updated) return { skipped: `orden ${order.status}` }
  alertAdmin({
    kind: 'reversed',
    key: `paddle-${adj.id}`,
    title:
      reason === 'charged_back'
        ? 'CONTRACARGO — descargas cortadas'
        : 'ORDEN REEMBOLSADA — descargas cortadas',
    lines: [
      `ajuste Paddle ${adj.id} · ${label} · transacción ${adj.transaction_id}`,
      `orden ${orderId}: ${order.items.map((i) => i.title || i.sku).join(', ')}`,
    ],
    config,
  })
  return { reversed: true, order: updated }
}

const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.activated',
  'subscription.trialing',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
  'subscription.canceled',
])

/**
 * Anota en el libro de reembolsos un ajuste de Paddle aprobado (reembolso total
 * o parcial, contracargo), de una orden o de LAB, con quién y cuánto. Una fila
 * por ajuste. Nunca corta el webhook.
 */
async function recordPaddleRefund({ adj, order, reason, amount, currency, config }) {
  try {
    const sub = !order && adj.subscription_id
      ? await db.findSubscriptionByPaddle({ subscriptionId: adj.subscription_id })
      : null
    const userId = order?.userId || sub?.userId || null
    const user = userId ? await db.findUserById(String(userId)).catch(() => null) : null
    await noteRefund({
      order,
      sub,
      config,
      data: {
        externalId: `paddle-${adj.id}`,
        provider: 'paddle',
        kind: order ? 'order' : 'lab',
        orderId: order ? String(db.uid(order) || order.id) : null,
        subscriptionId: sub ? String(db.uid(sub) || sub.id) : null,
        userId: userId ? String(userId) : null,
        email: user?.email || null,
        amount: Number.isFinite(amount) ? amount / 100 : 0,
        currency,
        partial: adj.type === 'partial',
        reason,
        refundedAt: new Date(adj.updated_at || Date.now()),
      },
    })
  } catch (err) {
    console.error(`refunds: no se pudo anotar el ajuste Paddle ${adj?.id}`, err?.message)
  }
}

/**
 * Webhook de Paddle (una URL para todo). La firma se verifica sobre el body
 * crudo, siempre. Resuelve cuando el evento quedó atendido o no aplica (200);
 * tira cuando Paddle tiene que reintentar: firma inválida (401) o una falla
 * nuestra / de Paddle (5xx). Un 4xx del procesamiento (orden inexistente,
 * monto que no coincide) no se arregla reintentando: se loguea y resuelve.
 * @param {{ rawBody: Buffer | string, signature?: string, config: any }} args
 */
export async function handlePaddleNotification({ rawBody, signature, config }, deps = {}) {
  if (!config.paddle?.apiKey || config.paddle.mock) return { skipped: 'paddle apagado' }
  verifyPaddleSignature({ rawBody, header: signature, secret: config.paddle.webhookSecret })

  let event
  try {
    event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody))
  } catch {
    throw new HttpError(400, 'Webhook de Paddle ilegible')
  }
  const type = String(event?.event_type || '')
  const data = event?.data || {}

  try {
    if (type === 'transaction.completed' || type === 'transaction.paid') {
      if ((await transactionOwner(data)) === 'lab') {
        return await handlePaddleLabTransaction({ transaction: data, config }, deps)
      }
      return await fulfillPaddleTransaction({ transaction: data, config })
    }
    if (type === 'transaction.payment_failed') {
      if ((await transactionOwner(data)) === 'lab') {
        return await handlePaddleLabPaymentFailed({ transaction: data, config }, deps)
      }
      const order = await db.findOrderByPaddleTransaction(data.id)
      if (!order) return { skipped: 'sin orden' }
      return await notifyOrderPaymentFailed({ orderId: String(db.uid(order) || order.id), config })
    }
    if (SUBSCRIPTION_EVENTS.has(type)) {
      if (!data.id) return { skipped: 'sin id' }
      return await syncPaddleSubscription({ paddleSubscriptionId: data.id, config }, deps)
    }
    if (type === 'adjustment.created' || type === 'adjustment.updated') {
      return await reversePaddleAdjustment({ adjustment: data, config })
    }
    return { skipped: `evento ${type}` }
  } catch (err) {
    if (err instanceof HttpError && err.status < 500) {
      console.error(`Paddle webhook skipped ${type} id=${data.id}: ${err.message}`)
      return { skipped: err.message }
    }
    if (err?.name === 'PaddleError' && err.status < 500 && err.status !== 401 && err.status !== 403) {
      console.error(`Paddle webhook skipped ${type} id=${data.id}: ${err.message}`)
      return { skipped: err.message }
    }
    throw err
  }
}

/**
 * Confirm del front al cerrar el overlay: trae la transacción de Paddle (no
 * confía en lo que diga el navegador) y cumple la orden sin esperar al webhook.
 * @param {{ transactionId: string, userId: string, config: any }} args
 */
export async function confirmPaddleCheckout({ transactionId, userId, config }, deps = {}) {
  if (!/^txn_[a-z0-9]+$/i.test(String(transactionId || ''))) {
    throw new HttpError(400, 'transactionId inválido')
  }
  const order = await db.findOrderByPaddleTransaction(transactionId)
  if (!order) throw new HttpError(404, 'No encontramos la orden de ese pago')
  if (String(order.userId) !== String(userId)) {
    throw new HttpError(
      403,
      'Ese pago pertenece a otra cuenta. Entrá con la cuenta que usaste para comprar.',
      { expose: true },
    )
  }
  if (order.status === 'paid') {
    return { order, orderId: String(db.uid(order) || order.id), alreadyFulfilled: true }
  }
  const txn = await (deps.getTransaction || getTransaction)(config, transactionId)
  return fulfillPaddleTransaction({ transaction: txn, config, expectedUserId: userId })
}
