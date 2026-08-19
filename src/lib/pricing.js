/**
 * Precios de lista en USD — deben coincidir con server/catalog.js.
 * El monto en pesos se calcula con la cotización que devuelve /api/catalog
 * (ver useFxRate) y el total final siempre lo confirma el servidor.
 */
export const TEMPLATE_PRICES_USD = {
  chapters: 149,
  nocturne: 149,
  monolith: 189,
  velocity: 149,
  fizz: 189,
  atelier: 229,
  comic: 229,
  unity: 189,
  ratio: 269,
  vanta: 229,
}

/** En catálogo se ven grayed-out; no se venden ni tienen demo pública. */
export const COMING_SOON_SKUS = ['vanta', 'ratio']

/**
 * En el repo, no en el marketplace: sin card en home, ruta solo en `npm run dev`.
 */
export const LOCAL_ONLY_SKUS = ['ratio']

/**
 * Modelos que no entran a la paleta del builder.
 * VANTA / RATIO siguen en obra: van acá y en COMING_SOON_SKUS.
 */
export const BUILDER_HIDDEN_SKUS = ['vanta', 'ratio']

export function isComingSoonSku(sku) {
  return COMING_SOON_SKUS.includes(sku)
}

export function isLocalOnlySku(sku) {
  return LOCAL_ONLY_SKUS.includes(sku)
}

/**
 * Composición del builder: base por tramo + adicional por sección extra.
 * Una composición del tamaño de un template (10 secciones) queda en 309 USD.
 * El piso tiene que superar al template más caro en venta.
 */
export const CUSTOM_BASE_PRICE_USD = 279
export const CUSTOM_BASE_SECTIONS = 8
export const CUSTOM_EXTRA_SECTION_USD = 15
/** Tope de secciones de una receta — espejo de `maxRecipeSections`. */
export const MAX_CUSTOM_SECTIONS = 30

export const COMMERCE_PACK_SURCHARGE_USD = 39
export const BUNDLE_PRICE_USD = 649

/** Respaldo para el primer render, antes de que llegue la cotización real. */
export const FALLBACK_USD_ARS = 1560

const ARS_ROUNDING = 1000

export function templatePriceUsd(sku) {
  return TEMPLATE_PRICES_USD[sku] ?? null
}


/** Secciones por encima de las que trae la base. Cuenta cada instancia. */
export function customExtraSections(sectionCount) {
  const count = Number.isFinite(sectionCount) ? Math.floor(sectionCount) : 0
  return Math.max(0, count - CUSTOM_BASE_SECTIONS)
}

export function estimateCustomPriceUsd(sectionCount, hasCommerce) {
  return (
    CUSTOM_BASE_PRICE_USD +
    customExtraSections(sectionCount) * CUSTOM_EXTRA_SECTION_USD +
    (hasCommerce ? COMMERCE_PACK_SURCHARGE_USD : 0)
  )
}

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

export function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
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
