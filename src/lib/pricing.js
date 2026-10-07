/**
 * Precios para la UI. Las reglas (precios de lista, tramos del builder, qué
 * se vende) viven en src/domain/catalog.js, compartido con el servidor; acá
 * queda lo que es solo de pantalla: pesos con la cotización de /api/catalog
 * (ver useFxRate), formateo y deltas del builder. El total final siempre lo
 * confirma el servidor.
 */
import {
  arsFromUsdOrNull,
  discountedArsFromUsdOrNull,
  estimateCustomPriceUsd,
  isComingSoonSku,
  BUNDLE_PRICE_USD,
  TEMPLATE_PRICES_USD,
} from '../domain/catalog.js'

export {
  TEMPLATE_PRICES_USD,
  COMING_SOON_SKUS,
  LOCAL_ONLY_SKUS,
  BUILDER_HIDDEN_SKUS,
  isComingSoonSku,
  isLocalOnlySku,
  isBuilderHiddenSku,
  CUSTOM_BASE_PRICE_USD,
  CUSTOM_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD,
  MAX_CUSTOM_SECTIONS,
  COMMERCE_PACK_SURCHARGE_USD,
  BUNDLE_PRICE_USD,
  BUNDLE_MODELS,
  WELCOME_COUPON_PERCENT,
  templatePriceUsd,
  customExtraSections,
  estimateCustomPriceUsd,
} from '../domain/catalog.js'

export function isCatalogComingSoon(sku) {
  return isComingSoonSku(sku)
}

/** Respaldo para el primer render, antes de que llegue la cotización real. */
export const FALLBACK_USD_ARS = 1560

/** Mismo redondeo que el servidor: al millar de arriba. `null` si no hay cotización. */
export const arsFromUsd = arsFromUsdOrNull

/** Precio en pesos con cupón: la misma cuenta que el servidor. */
export const discountedArsFromUsd = discountedArsFromUsdOrNull

/**
 * Lo que suma la próxima sección, en pesos. Sale de la resta de dos totales
 * ya redondeados: el redondeo al millar hace que el salto real alterne, y
 * mostrar el adicional de lista suelto no coincidiría con el total.
 */
export function nextSectionArs(sectionCount, hasCommerce, rate) {
  const current = arsFromUsd(estimateCustomPriceUsd(sectionCount, hasCommerce), rate)
  const next = arsFromUsd(estimateCustomPriceUsd(sectionCount + 1, hasCommerce), rate)
  if (current == null || next == null) return null
  return next - current
}

/** Lo que costaría comprar los modelos del bundle por separado. */
export function bundleListPriceUsd() {
  return Object.entries(TEMPLATE_PRICES_USD).reduce((sum, [sku, usd]) => {
    if (isComingSoonSku(sku)) return sum
    return sum + usd
  }, 0)
}

export function bundleDiscountPct() {
  return Math.round((1 - BUNDLE_PRICE_USD / bundleListPriceUsd()) * 100)
}

export function formatArs(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Monto de una orden sin símbolo (la UI pone el código de moneda al lado): con
 * centavos solo si los hay, siempre dos (134,10, no 134,1).
 * @param {number} amount
 * @param {string} [locale]
 */
export function formatAmount(amount, locale) {
  const n = Number(amount)
  const cents = !Number.isInteger(n)
  return n.toLocaleString(locale, {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })
}

export function formatUsd(amount) {
  // Centavos solo si los hay (un cupón los deja): es lo que cobra Paddle.
  const cents = !Number.isInteger(Number(amount))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(amount)
}

/**
 * Precio de lista para UI: EN muestra USD; ES convierte a ARS con la
 * cotización del catálogo. El checkout sigue cobrando en pesos.
 */
export function formatPriceFromUsd(usd, locale, rate) {
  if (!Number.isFinite(usd)) return null
  if (locale === 'en') return formatUsd(usd)
  const ars = arsFromUsd(usd, rate)
  return ars == null ? null : formatArs(ars)
}

/** Delta de la próxima sección en USD (sin redondeo ARS). */
export function nextSectionUsd(sectionCount, hasCommerce) {
  return (
    estimateCustomPriceUsd(sectionCount + 1, hasCommerce) -
    estimateCustomPriceUsd(sectionCount, hasCommerce)
  )
}

/** Próxima sección formateada: USD en EN, delta ARS redondeado en ES. */
export function formatNextSectionPrice(sectionCount, hasCommerce, locale, rate) {
  if (locale === 'en') return formatUsd(nextSectionUsd(sectionCount, hasCommerce))
  const ars = nextSectionArs(sectionCount, hasCommerce, rate)
  return ars == null ? null : formatArs(ars)
}
