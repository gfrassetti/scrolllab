/**
 * Retención de órdenes sin pagar.
 *
 * Una orden nace `pending` al abrir el checkout, no al cobrar, así que cada
 * intento abandonado queda en Mis compras para siempre. Se esconden a las pocas
 * horas —el webhook de Mercado Pago tarda segundos— y Mongo las borra solas
 * pasada una semana, margen de sobra para los pagos en efectivo, que se
 * acreditan días después y devuelven la orden a la vista ya como `paid`.
 *
 * Las órdenes pagas no vencen nunca.
 */
export const PENDING_VISIBLE_MS = 2 * 60 * 60 * 1000
export const PENDING_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

/** Fecha de caducidad para el índice TTL de Mongo. */
export function pendingExpiresAt(now = Date.now()) {
  return new Date(now + PENDING_RETENTION_MS)
}

export function isStalePending(
  order,
  now = Date.now(),
  visibleMs = PENDING_VISIBLE_MS,
) {
  if (!order || order.status !== 'pending') return false
  const created = new Date(order.createdAt ?? NaN).getTime()
  // Sin fecha usable no hay forma de saber si venció: se muestra.
  if (!Number.isFinite(created)) return false
  return now - created > visibleMs
}

export function visibleOrders(
  orders,
  now = Date.now(),
  visibleMs = PENDING_VISIBLE_MS,
) {
  return (orders || []).filter((order) => !isStalePending(order, now, visibleMs))
}
