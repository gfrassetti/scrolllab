/**
 * Precios de lista en USD — deben coincidir con server/catalog.js.
 * El monto en pesos se calcula con la cotización que devuelve /api/catalog
 * (ver useFxRate) y el total final siempre lo confirma el servidor.
 */
export const TEMPLATE_PRICES_USD = {
  chapters: 129,
  nocturne: 129,
  monolith: 159,
  velocity: 129,
  fizz: 159,
  atelier: 179,
}

export const CUSTOM_BASE_PRICE_USD = 229
export const COMMERCE_PACK_SURCHARGE_USD = 39
export const BUNDLE_PRICE_USD = 389

/** Respaldo para el primer render, antes de que llegue la cotización real. */
export const FALLBACK_USD_ARS = 1560

const ARS_ROUNDING = 1000

export function templatePriceUsd(sku) {
  return TEMPLATE_PRICES_USD[sku] ?? null
}

export function estimateCustomPriceUsd(hasCommerce) {
  return CUSTOM_BASE_PRICE_USD + (hasCommerce ? COMMERCE_PACK_SURCHARGE_USD : 0)
}

/** Lo que costaría comprar los 6 modelos por separado. */
export function bundleListPriceUsd() {
  return Object.values(TEMPLATE_PRICES_USD).reduce((sum, usd) => sum + usd, 0)
}

export function bundleDiscountPct() {
  return Math.round((1 - BUNDLE_PRICE_USD / bundleListPriceUsd()) * 100)
}

/** Mismo redondeo que el servidor: al millar de arriba. */
export function arsFromUsd(usd, rate) {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || rate <= 0) return null
  return Math.ceil((usd * rate) / ARS_ROUNDING) * ARS_ROUNDING
}

export function formatArs(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}
