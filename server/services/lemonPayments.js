import { db } from '../db.js'
import { noteRefund } from './refundLedger.js'
import { HttpError } from '../errors.js'
import {
  verifyLemonSignature,
  parseLemonEvent,
  usdCents,
  LEMON_CURRENCY,
} from './lemonsqueezy.js'
import { markOrderPaid, deliverPaidOrder, alertAdmin } from './orders.js'
import { parseLemonInvoice } from './lemonsqueezy.js'
import {
  syncLemonSubscriptionEvent,
  handleLemonLabInvoice,
  handleLemonLabPaymentFailed,
} from './subscriptions/lemonSync.js'
import { handleLabRefund } from './subscriptions/labRefund.js'

/**
 * Casos de uso de Lemon Squeezy para las compras (market y builder) y su webhook.
 * Etapa 1 (ver docs/lemonsqueezy.md): órdenes y reembolsos. LAB va en otra etapa.
 *
 * La orden se identifica por lo que guardó el servidor al abrir el checkout
 * (`custom.orderId`, firmado con el resto del webhook) y se valida contra ella:
 * proveedor, moneda, modo (prueba / real) y el monto antes de impuestos. Un pago
 * que no coincide no entrega nada y avisa al dueño.
 */

const money = (e) => `${e.totalCents == null ? '—' : e.totalCents / 100} ${e.currency || LEMON_CURRENCY}`
const orderIdOf = (o) => String(db.uid(o) || o.id)

/** Orden por id (un id mal formado no es un error: simplemente no existe). */
async function findOrder(id) {
  if (!id) return null
  try {
    return await db.findOrderById(String(id))
  } catch {
    return null
  }
}

/**
 * Cumple una orden cobrada (`order_created`, ya con `status: paid`). Idempotente:
 * el mismo evento repetido devuelve `alreadyFulfilled`.
 * @param {{ event: ReturnType<typeof parseLemonEvent>, config: any }} args
 */
export async function fulfillLemonOrder({ event, config }) {
  if (event.status !== 'paid') return { skipped: `orden ${event.status || 'sin estado'}` }

  const alert = (/** @type {string} */ kind, /** @type {string} */ reason, /** @type {any} */ order = null) => {
    alertAdmin({
      kind,
      key: `lemon-${event.id}-${reason.replace(/\W+/g, '-').toLowerCase().slice(0, 40)}`,
      title:
        kind === 'orphan'
          ? 'PAGO SIN ORDEN (Lemon Squeezy) — entregar o reembolsar'
          : 'PAGO NO COINCIDE CON LA ORDEN (Lemon Squeezy) — revisar o reembolsar',
      lines: [
        `orden de Lemon Squeezy ${event.id} · ${money(event)} · ${event.email || 'sin email'}`,
        order
          ? `orden ${orderIdOf(order)} espera ${order.total} ${order.currency_id} (${order.provider})`
          : `orden indicada: ${event.custom.orderId || '-'}`,
        `motivo: ${reason}`,
      ],
      config,
    })
    return { skipped: reason }
  }

  // Una orden de prueba no entrega nada en producción, ni al revés.
  if (event.testMode !== Boolean(config.lemon?.testMode)) {
    return alert('mismatch', `modo ${event.testMode ? 'prueba' : 'real'} distinto del servidor`)
  }
  if (event.custom.kind && event.custom.kind !== 'order') return { skipped: `kind ${event.custom.kind}` }

  const order = await findOrder(event.custom.orderId)
  if (!order) return alert('orphan', 'ninguna orden la abrió')
  if (order.provider !== 'lemonsqueezy' || order.currency_id !== LEMON_CURRENCY) {
    return alert('mismatch', 'La orden no se cobra con Lemon Squeezy', order)
  }
  if (event.currency !== LEMON_CURRENCY) return alert('mismatch', 'Moneda del pago no coincide', order)
  // Un pago de prueba (tarjeta 4242) solo cumple órdenes de prueba: nunca una compra real.
  if (event.testMode && !order.qa) return alert('mismatch', 'Pago de prueba sobre una orden real', order)
  // Nuestros descuentos ya vienen en el precio: uno hecho en Lemon Squeezy cobraría menos.
  if (event.discountCents !== 0) return alert('mismatch', 'El pago trae un descuento hecho en Lemon Squeezy', order)
  if (event.subtotalCents !== usdCents(order.total)) {
    console.error(
      `checkout lemon MONTO NO COINCIDE order=${orderIdOf(order)} lemon=${event.id} ` +
        `subtotal=${event.subtotalCents} esperado=${usdCents(order.total)} (centavos)`,
    )
    return alert('mismatch', 'Monto del pago no coincide', order)
  }

  const { order: updated, created } = await markOrderPaid({
    orderId: orderIdOf(order),
    lemonOrderId: event.id,
    config,
  })
  const paid = updated || order
  if (paid.status !== 'paid') return { skipped: `orden ${paid.status}` }
  await deliverPaidOrder(paid, config)
  return { order: paid, orderId: orderIdOf(paid), alreadyFulfilled: !created }
}

/**
 * Reembolso (`order_refunded`): total → la orden pasa a `refunded` y deja de
 * descargarse; parcial → aviso al dueño y la orden sigue paga. Siempre al libro.
 * @param {{ event: ReturnType<typeof parseLemonEvent>, config: any }} args
 */
export async function reverseLemonRefund({ event, config }) {
  const order = event.id ? await db.findOrderByLemonOrder(event.id) : null
  const full = event.status === 'refunded'
  const amount = (event.refundedAmountCents ?? event.totalCents ?? 0) / 100
  const label = `${amount} ${event.currency || LEMON_CURRENCY}`

  if (!order) {
    alertAdmin({
      kind: 'reversed',
      key: `lemon-refund-${event.id}`,
      title: 'REEMBOLSO EN LEMON SQUEEZY — sin orden local, revisar',
      lines: [`orden de Lemon Squeezy ${event.id} · ${label} · ${event.email || '-'}`],
      config,
    })
    return { skipped: 'sin orden' }
  }
  const orderId = orderIdOf(order)

  try {
    const user = order.userId ? await db.findUserById(String(order.userId)).catch(() => null) : null
    await noteRefund({
      order,
      config,
      data: {
        externalId: `lemon-${event.id}`,
        provider: 'lemonsqueezy',
        kind: 'order',
        orderId,
        subscriptionId: null,
        userId: order.userId ? String(order.userId) : null,
        email: user?.email || event.email || null,
        amount,
        currency: event.currency || LEMON_CURRENCY,
        partial: !full,
        reason: 'refunded',
        refundedAt: new Date(),
      },
    })
  } catch (err) {
    console.error(`refunds: no se pudo anotar el reembolso Lemon ${event.id}`, err?.message)
  }

  if (!full) {
    alertAdmin({
      kind: 'reversed',
      key: `lemon-refund-${event.id}-partial`,
      title: 'REEMBOLSO PARCIAL — la orden sigue paga',
      lines: [`orden Lemon Squeezy ${event.id} · ${label}`, `orden ${orderId}`],
      config,
    })
    return { skipped: 'parcial' }
  }
  if (order.status === 'refunded') return { alreadyReversed: true }

  const updated = await db.markOrderRefundedAtomic({
    orderId,
    lemonOrderId: event.id,
    reason: 'refunded',
  })
  if (!updated) return { skipped: `orden ${order.status}` }
  alertAdmin({
    kind: 'reversed',
    key: `lemon-refund-${event.id}`,
    title: 'ORDEN REEMBOLSADA — descargas cortadas',
    lines: [
      `orden Lemon Squeezy ${event.id} · ${label}`,
      `orden ${orderId}: ${order.items.map((i) => i.title || i.sku).join(', ')}`,
    ],
    config,
  })
  return { reversed: true, order: updated }
}

/**
 * Facturas de LAB: cobro (alta, renovación, diferencia de plan), rechazo y devolución.
 * @param {{ name: string, data: any, custom: any, config: any }} args
 */
async function handleLemonLabInvoiceEvent({ name, data, custom, config }) {
  const invoice = parseLemonInvoice(data)
  if (name === 'subscription_payment_success' || name === 'subscription_payment_recovered') {
    return handleLemonLabInvoice({ invoice, custom, config })
  }
  if (name === 'subscription_payment_failed') return handleLemonLabPaymentFailed({ invoice, custom, config })
  if (name === 'subscription_payment_refunded') {
    const sub = invoice.subscriptionId ? await db.findSubscriptionByLemon(invoice.subscriptionId) : null
    const amount = (invoice.refundedAmountCents ?? invoice.totalCents ?? 0) / 100
    if (!sub) {
      alertAdmin({
        kind: 'reversed',
        key: `lemon-inv-${invoice.id}-refund`,
        title: 'REEMBOLSO DE LAB EN LEMON SQUEEZY — sin suscripción local, revisar',
        lines: [`factura ${invoice.id} · ${amount} ${invoice.currency} · suscripción ${invoice.subscriptionId}`],
        config,
      })
      return { skipped: 'sin suscripción local' }
    }
    return handleLabRefund({
      sub,
      provider: 'lemonsqueezy',
      externalId: `lemon-inv-${invoice.id}`,
      chargeId: invoice.id,
      amount,
      currency: invoice.currency || 'USD',
      partial: invoice.status === 'partial_refund',
      reason: 'refunded',
      config,
    })
  }
  return { skipped: `evento ${name}` }
}

/**
 * Webhook de Lemon Squeezy. La firma se verifica sobre el body crudo, siempre.
 * Resuelve cuando el evento quedó atendido o no aplica (200); tira solo cuando
 * Lemon Squeezy tiene que reintentar: firma inválida (401) o una falla nuestra (5xx).
 * @param {{ rawBody: Buffer | string, signature?: string, config: any }} args
 */
export async function handleLemonNotification({ rawBody, signature, config }) {
  if (!config.lemon?.enabled) return { skipped: 'lemon squeezy apagado' }
  verifyLemonSignature({ rawBody, header: signature, secret: config.lemon.webhookSecret })

  let payload
  try {
    payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody))
  } catch {
    throw new HttpError(400, 'Webhook de Lemon Squeezy ilegible')
  }
  const event = parseLemonEvent(payload)

  try {
    // LAB: los `subscription_*` traen la suscripción; los `subscription_payment_*`, una factura.
    if (event.name.startsWith('subscription_payment_')) {
      return await handleLemonLabInvoiceEvent({ name: event.name, data: payload?.data, custom: event.custom, config })
    }
    if (event.name.startsWith('subscription_')) {
      return await syncLemonSubscriptionEvent({ data: payload?.data, custom: event.custom, config })
    }
    // Una orden de suscripción (el alta) también llega como `order_created`: la entrega es por la suscripción.
    if (event.name === 'order_created' && event.custom?.kind === 'lab') return { skipped: 'orden de LAB' }
    if (event.name === 'order_created') return await fulfillLemonOrder({ event, config })
    if (event.name === 'order_refunded') return await reverseLemonRefund({ event, config })
    if (event.name === 'dispute_created') {
      alertAdmin({
        kind: 'reversed',
        key: `lemon-dispute-${event.id}`,
        title: 'CONTRACARGO EN LEMON SQUEEZY — revisar',
        lines: [`disputa ${event.id} · orden ${payload?.data?.attributes?.order_id || '-'}`],
        config,
      })
      return { alerted: 'dispute' }
    }
    return { skipped: `evento ${event.name}` }
  } catch (err) {
    if (err instanceof HttpError && err.status < 500) {
      console.error(`Lemon webhook skipped ${event.name} id=${event.id}: ${err.message}`)
      return { skipped: err.message }
    }
    throw err
  }
}

/**
 * Vuelta del pago: la orden la cumple el webhook, así que el front pregunta cómo
 * va. No consulta a Lemon Squeezy ni confía en la URL: lee la orden de este usuario.
 * 409 mientras el webhook no llegó (el front reintenta).
 * @param {{ orderId: string, userId: string }} args
 */
export async function confirmLemonCheckout({ orderId, userId }) {
  const order = await findOrder(orderId)
  if (!order) throw new HttpError(404, 'No encontramos la orden de ese pago')
  if (String(order.userId) !== String(userId)) {
    throw new HttpError(
      403,
      'Ese pago pertenece a otra cuenta. Entrá con la cuenta que usaste para comprar.',
      { expose: true },
    )
  }
  if (order.status === 'paid') return { order, orderId: orderIdOf(order), alreadyFulfilled: true }
  throw new HttpError(409, 'El pago todavía se está procesando', { expose: true })
}
