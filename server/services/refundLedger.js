import { db } from '../db.js'
import { HOSTED_PLANS } from '../catalog.js'
import { sendRefundIssued } from './email.js'

/**
 * El libro de reembolsos y el mail al cliente, en un solo lugar: lo llaman los
 * webhooks de Mercado Pago y de Paddle cuando la pasarela confirma una
 * devolución (automática por el Botón de arrepentimiento o hecha a mano en el
 * panel). Una fila por pago/ajuste (`externalId`); el mail «Te devolvimos el
 * dinero» sale una vez por monto (un parcial que se completa manda otro) y
 * nunca en un contracargo (eso no lo inició nadie de este lado).
 */

const tierName = (plan) => {
  const tier = HOSTED_PLANS[plan]?.tier || ''
  return tier ? `LAB ${tier.replace(/^./, (c) => c.toUpperCase())}` : 'LAB'
}

/** Qué se devolvió, como lo lee el cliente. */
export function refundWhat({ order, sub }) {
  if (order) {
    return (order.items || [])
      .map((i) => i.title || i.sku)
      .filter(Boolean)
      .join(', ') || 'SCROLLLAB'
  }
  return tierName(sub?.paidPlan || sub?.plan)
}

/**
 * @param {{ data: any, order?: any, sub?: any, config: any }} args
 */
export async function noteRefund({ data, order = null, sub = null, config }) {
  const previous = await db.findRefund(data.externalId).catch(() => null)
  const row = await db.recordRefund(data)
  try {
    const amount = Number(data.amount) || 0
    const notified = Number(previous?.notifiedAmount) || 0
    if (data.reason === 'charged_back' || !(amount > notified)) return row
    const userId = data.userId || order?.userId || sub?.userId
    const user = userId ? await db.findUserById(String(userId)).catch(() => null) : null
    const to = user?.email || data.email
    if (!to) return row
    await sendRefundIssued({
      to,
      ref: data.externalId,
      name: user?.name || to,
      locale: order?.locale || sub?.locale || 'es',
      amount,
      currency: data.currency,
      provider: data.provider,
      what: refundWhat({ order, sub }),
      kind: data.kind,
      partial: !!data.partial,
      config,
    })
    await db.recordRefund({ externalId: data.externalId, notifiedAmount: amount })
  } catch (err) {
    console.error(`refunds: no se pudo avisar al cliente ${data.externalId}`, err?.message)
  }
  return row
}
