/**
 * Políticas comerciales que comparten el front y el servidor (dominio puro).
 */

/**
 * Plazo (días corridos) para pedir el reembolso total por arrepentimiento.
 * Templates, bundle y builder: solo si no se descargó el ZIP. LAB: cada cobro,
 * sin condiciones. Paddle exige entre 14 y 90 para aprobar el dominio: no bajar
 * de 14. Ver docs/paddle.md.
 */
export const REFUND_DAYS = 14

const DAY_MS = 86_400_000

/**
 * ¿Una orden de templates / bundle / builder todavía tiene reembolso por
 * arrepentimiento? Pagada, dentro del plazo y con el ZIP sin descargar (el
 * contador sube cuando el archivo realmente se baja). El defecto técnico se
 * revisa aparte, a mano: esto es solo el arrepentimiento.
 * @param {{ status?: string, paidAt?: any, createdAt?: any, downloadCount?: number } | null | undefined} order
 * @param {{ now?: number, days?: number }} [options]
 * @returns {{ eligible: boolean, reason: 'ok' | 'downloaded' | 'expired' | 'refunded' | 'not_paid' | 'no_order', deadline: string | null, days: number, downloads: number }}
 */
export function refundEligibility(order, { now = Date.now(), days = REFUND_DAYS } = {}) {
  const downloads = Number(order?.downloadCount) || 0
  const none = { deadline: null, days, downloads }
  if (!order) return { eligible: false, reason: 'no_order', ...none }
  if (order.status === 'refunded') return { eligible: false, reason: 'refunded', ...none }
  if (order.status !== 'paid') return { eligible: false, reason: 'not_paid', ...none }
  const paidMs = new Date(order.paidAt || order.createdAt || now).getTime()
  const deadline = new Date((Number.isFinite(paidMs) ? paidMs : now) + days * DAY_MS)
  const base = { deadline: deadline.toISOString(), days, downloads }
  if (now > deadline.getTime()) return { eligible: false, reason: 'expired', ...base }
  if (downloads > 0) return { eligible: false, reason: 'downloaded', ...base }
  return { eligible: true, reason: 'ok', ...base }
}
