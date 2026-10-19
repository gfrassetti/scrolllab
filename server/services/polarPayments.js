import { db } from '../db.js'
import { noteRefund } from './refundLedger.js'
import { HttpError } from '../errors.js'
import { verifyPolarSignature, parsePolarOrder, usdCents, POLAR_CURRENCY } from './polar.js'
import { markOrderPaid, deliverPaidOrder, alertAdmin } from './orders.js'
import { syncPolarSubscriptionEvent, handlePolarLabOrder, handlePolarLabRefund } from './subscriptions/polarSync.js'

/**
 * Casos de uso de Polar para las compras (market y builder) y su webhook. Ver
 * docs/polar.md. Mismo contrato que Mercado Pago (payments.js): la orden se
 * identifica por lo que guardó el servidor al abrir el checkout (`metadata.orderId`,
 * dentro del webhook firmado) y se valida contra ella: proveedor, moneda, entorno
 * (prueba / real) y el monto antes de impuestos. Un pago que no coincide no entrega
 * nada y avisa al dueño.
 */

const money = (o) => `${o.totalCents == null ? '—' : o.totalCents / 100} ${o.currency || POLAR_CURRENCY}`
const orderIdOf = (o) => String(db.uid(o) || o.id)

async function findOrder(id) {
  if (!id) return null
  try {
    return await db.findOrderById(String(id))
  } catch {
    return null
  }
}

/**
 * Cumple una orden cobrada (`order.paid`). Idempotente: el mismo evento repetido
 * devuelve `alreadyFulfilled`.
 * @param {{ order: ReturnType<typeof parsePolarOrder>, config: any }} args
 */
export async function fulfillPolarOrder({ order: po, config }) {
  if (!po.paid) return { skipped: `orden ${po.status || 'sin estado'}` }
  const meta = po.metadata || {}

  const alert = (/** @type {string} */ kind, /** @type {string} */ reason, /** @type {any} */ order = null) => {
    alertAdmin({
      kind,
      key: `polar-${po.id}-${reason.replace(/\W+/g, '-').toLowerCase().slice(0, 40)}`,
      title:
        kind === 'orphan'
          ? 'PAGO SIN ORDEN (Polar) — entregar o reembolsar'
          : 'PAGO NO COINCIDE CON LA ORDEN (Polar) — revisar o reembolsar',
      lines: [
        `orden de Polar ${po.id} · ${money(po)} · ${po.email || 'sin email'}`,
        order
          ? `orden ${orderIdOf(order)} espera ${order.total} ${order.currency_id} (${order.provider})`
          : `orden indicada: ${meta.orderId || '-'}`,
        `motivo: ${reason}`,
      ],
      config,
    })
    return { skipped: reason }
  }

  // Las órdenes de suscripción (LAB) se atienden por la suscripción.
  if (meta.kind && meta.kind !== 'order') return { skipped: `kind ${meta.kind}` }
  if (po.billingReason && po.billingReason !== 'purchase') return { skipped: `billing ${po.billingReason}` }

  const order = await findOrder(meta.orderId)
  if (!order) return alert('orphan', 'ninguna orden la abrió')
  if (order.provider !== 'polar' || order.currency_id !== POLAR_CURRENCY) {
    return alert('mismatch', 'La orden no se cobra con Polar', order)
  }
  if (po.currency !== POLAR_CURRENCY) return alert('mismatch', 'Moneda del pago no coincide', order)
  // El entorno de prueba (tarjeta 4242) solo cumple órdenes de prueba: nunca una compra real.
  if (config.polar?.testMode && !order.qa) return alert('mismatch', 'Pago de prueba sobre una orden real', order)
  // Nuestros descuentos ya vienen en el precio: uno hecho en Polar cobraría menos.
  if (po.discountCents !== 0) return alert('mismatch', 'El pago trae un descuento hecho en Polar', order)
  if (po.subtotalCents !== usdCents(order.total)) {
    console.error(
      `checkout polar MONTO NO COINCIDE order=${orderIdOf(order)} polar=${po.id} ` +
        `subtotal=${po.subtotalCents} esperado=${usdCents(order.total)} (centavos)`,
    )
    return alert('mismatch', 'Monto del pago no coincide', order)
  }

  const { order: updated, created } = await markOrderPaid({
    orderId: orderIdOf(order),
    polarOrderId: po.id,
    config,
  })
  const paid = updated || order
  if (paid.status !== 'paid') return { skipped: `orden ${paid.status}` }
  await deliverPaidOrder(paid, config)
  return { order: paid, orderId: orderIdOf(paid), alreadyFulfilled: !created }
}

/**
 * Reembolso (`order.refunded` / `order.updated` con `refunded_amount`): total → la orden
 * pasa a `refunded` y deja de descargarse; parcial → aviso al dueño y la orden sigue
 * paga. Siempre al libro.
 * @param {{ order: { id: string, status: string, refundedCents: number, currency?: string, email?: string }, config: any }} args
 */
export async function reversePolarRefund({ order: po, config }) {
  if (!(po.refundedCents > 0)) return { skipped: 'sin reembolso' }
  const order = po.id ? await db.findOrderByPolarOrder(po.id) : null
  const full = po.status === 'refunded'
  // Lo devuelto antes de impuestos es lo que se cobró como precio; con el impuesto, el total.
  const amount = po.refundedCents / 100
  const label = `${amount} ${po.currency || POLAR_CURRENCY}`

  if (!order) {
    alertAdmin({
      kind: 'reversed',
      key: `polar-refund-${po.id}`,
      title: 'REEMBOLSO EN POLAR — sin orden local, revisar',
      lines: [`orden de Polar ${po.id} · ${label} · ${po.email || '-'}`],
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
        externalId: `polar-${po.id}-${po.refundedCents}`,
        provider: 'polar',
        kind: 'order',
        orderId,
        subscriptionId: null,
        userId: order.userId ? String(order.userId) : null,
        email: user?.email || po.email || null,
        amount,
        currency: po.currency || POLAR_CURRENCY,
        partial: !full,
        reason: 'refunded',
        refundedAt: new Date(),
      },
    })
  } catch (err) {
    console.error(`refunds: no se pudo anotar el reembolso Polar ${po.id}`, err?.message)
  }

  if (!full) {
    alertAdmin({
      kind: 'reversed',
      key: `polar-refund-${po.id}-partial-${po.refundedCents}`,
      title: 'REEMBOLSO PARCIAL — la orden sigue paga',
      lines: [`orden Polar ${po.id} · ${label}`, `orden ${orderId}`],
      config,
    })
    return { skipped: 'parcial' }
  }
  if (order.status === 'refunded') return { alreadyReversed: true }

  const updated = await db.markOrderRefundedAtomic({ orderId, polarOrderId: po.id, reason: 'refunded' })
  if (!updated) return { skipped: `orden ${order.status}` }
  alertAdmin({
    kind: 'reversed',
    key: `polar-refund-${po.id}`,
    title: 'ORDEN REEMBOLSADA — descargas cortadas',
    lines: [`orden Polar ${po.id} · ${label}`, `orden ${orderId}: ${order.items.map((i) => i.title || i.sku).join(', ')}`],
    config,
  })
  return { reversed: true, order: updated }
}

/**
 * Webhook de Polar. La firma se verifica sobre el body crudo, siempre. Resuelve cuando
 * el evento quedó atendido o no aplica (200); tira solo cuando Polar tiene que
 * reintentar: firma inválida (401) o una falla nuestra (5xx).
 * @param {{ rawBody: Buffer | string, headers: Record<string, any>, config: any }} args
 */
export async function handlePolarNotification({ rawBody, headers, config }) {
  if (!config.polar?.enabled) return { skipped: 'polar apagado' }
  verifyPolarSignature({ rawBody, headers, secret: config.polar.webhookSecret })

  let payload
  try {
    payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody))
  } catch {
    throw new HttpError(400, 'Webhook de Polar ilegible')
  }
  const type = String(payload?.type || '')
  const data = payload?.data || {}

  try {
    // LAB: la suscripción, sus cobros (órdenes con `subscription_id`) y sus devoluciones.
    if (type.startsWith('subscription.')) return await syncPolarSubscriptionEvent({ type, data, config })
    if (type.startsWith('order.') && data?.subscription_id) {
      if (type === 'order.paid') return await handlePolarLabOrder({ data, config })
      if ((type === 'order.refunded' || type === 'order.updated') && Number(data?.refunded_amount) > 0) {
        return await handlePolarLabRefund({ data, config })
      }
      return { skipped: `LAB ${type}` }
    }
    if (type === 'order.paid') return await fulfillPolarOrder({ order: parsePolarOrder(data), config })
    if (type === 'order.refunded' || type === 'order.updated') {
      const po = parsePolarOrder(data)
      if (po.refundedCents > 0) return await reversePolarRefund({ order: po, config })
      return { skipped: `evento ${type}` }
    }
    return { skipped: `evento ${type}` }
  } catch (err) {
    if (err instanceof HttpError && err.status < 500) {
      console.error(`Polar webhook skipped ${type} id=${data?.id}: ${err.message}`)
      return { skipped: err.message }
    }
    throw err
  }
}

/**
 * Vuelta del pago: la orden la cumple el webhook, así que el front pregunta cómo va.
 * Lee la orden de este usuario (no confía en la URL). 409 mientras el webhook no llegó.
 * @param {{ orderId: string, userId: string }} args
 */
export async function confirmPolarCheckout({ orderId, userId }) {
  const order = await findOrder(orderId)
  if (!order) throw new HttpError(404, 'No encontramos la orden de ese pago')
  if (String(order.userId) !== String(userId)) {
    throw new HttpError(403, 'Ese pago pertenece a otra cuenta. Entrá con la cuenta que usaste para comprar.', {
      expose: true,
    })
  }
  if (order.status === 'paid') return { order, orderId: orderIdOf(order), alreadyFulfilled: true }
  throw new HttpError(409, 'El pago todavía se está procesando', { expose: true })
}
