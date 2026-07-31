/**
 * Precios estimados del front — deben coincidir con server/catalog.js.
 * El total final siempre lo confirma el servidor en checkout.
 */
export const TEMPLATE_PRICES = {
  chapters: 200000,
  nocturne: 200000,
  monolith: 250000,
  velocity: 250000,
  fizz: 250000,
  atelier: 280000,
}

export const CUSTOM_BASE_PRICE = 350000
export const COMMERCE_PACK_SURCHARGE = 150000

export function templatePrice(sku) {
  return TEMPLATE_PRICES[sku] ?? null
}

export function estimateCustomPrice(hasCommerce) {
  return CUSTOM_BASE_PRICE + (hasCommerce ? COMMERCE_PACK_SURCHARGE : 0)
}

export function formatArs(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}
