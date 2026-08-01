/**
 * Qué hacer con el `status` que Mercado Pago pega en la URL de retorno.
 *
 * Importa distinguir el rechazo del pago en proceso: el efectivo (Rapipago,
 * Pago Fácil) vuelve como `pending` y se acredita días después, así que
 * tratarlo como fallido y mandar al comprador de vuelta al carrito lo haría
 * pagar dos veces.
 */
const PROCESSING_STATUSES = new Set([
  'pending',
  'in_process',
  'in_mediation',
  'authorized',
])

/** Sin status lo damos por aprobado: el confirm contra el API decide. */
export function outcomeForStatus(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase()
  if (!value || value === 'approved') return 'approved'
  return PROCESSING_STATUSES.has(value) ? 'processing' : 'not-approved'
}

/**
 * El carrito solo se vacía cuando el pago existe. Si Mercado Pago lo rechazó,
 * el comprador vuelve al carrito con todo puesto para reintentar.
 */
const KEEPS_CART = new Set(['idle', 'busy', 'not-approved'])

export function shouldClearCart(confirmState) {
  return !KEEPS_CART.has(confirmState)
}
