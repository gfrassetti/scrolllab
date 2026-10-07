/**
 * Catálogo: fuente única de los precios de lista y de qué se vende.
 *
 * Dominio puro (sin React, sin `window`, sin Node): lo importan el front
 * (src/lib/pricing.js) y el servidor (server/catalog.js), así un precio no
 * puede quedar distinto entre lo que muestra la home y lo que cobra el
 * checkout. El servidor sigue sin confiar en el cliente: recalcula todo con
 * estas mismas constantes.
 *
 * Los precios están en USD y se pasan a ARS con la cotización del día recién
 * al crear la orden, así el valor no se licúa con la inflación.
 */

/**
 * Una sección de una receta del builder: su id (`'chapters/HeroKinetic'`) o
 * `{ id, props }` con los textos / listas editados.
 * @typedef {string | { id: string, props?: Record<string, unknown> }} RecipeEntry
 */

/** Precio de lista por template. Incluye los que todavía no se venden (RATIO). */
export const TEMPLATE_PRICES_USD = Object.freeze({
  chapters: 149,
  nocturne: 149,
  monolith: 189,
  velocity: 149,
  fizz: 189,
  atelier: 229,
  comic: 189,
  unity: 189,
  ratio: 269,
  atrium: 189,
  meridian: 379,
})

export const BUNDLE_PRICE_USD = 649

/** Modelos que trae el SKU `bundle`. Orden = orden del ZIP. */
export const BUNDLE_MODELS = Object.freeze([
  'chapters',
  'nocturne',
  'monolith',
  'velocity',
  'fizz',
  'atelier',
  'comic',
  'unity',
])

/**
 * Composición del builder: base por tramo + adicional por sección extra.
 * Cuenta cada entrada de la receta (nav, footer y repeticiones incluidas),
 * porque cada una es un componente renderizado en el App.jsx del ZIP. Una
 * composición del tamaño de un template (10 secciones) queda en 419 USD.
 * La base tiene que superar al template más caro EN VENTA (`npm run check`).
 */
export const CUSTOM_BASE_PRICE_USD = 389
export const CUSTOM_BASE_SECTIONS = 8
export const CUSTOM_EXTRA_SECTION_USD = 15
/** Tope de secciones de una receta (el builder lo muestra, el checkout lo aplica). */
export const MAX_CUSTOM_SECTIONS = 30

export const COMMERCE_PACK_SURCHARGE_USD = 39

/** Redondeo del monto en pesos: al millar de arriba, para no perder en el cambio. */
export const ARS_ROUNDING = 1000

/** Cupón de bienvenida: el % que promete la home es el que descuenta el checkout. */
export const WELCOME_COUPON_PERCENT = 10

/**
 * No se venden ni van en el bundle. Los que además son LOCAL_ONLY no se
 * listan en ningún lado.
 */
export const COMING_SOON_SKUS = Object.freeze(['ratio', 'plum', 'signal'])

/**
 * Solo en local: sin card en home, sin sitemap ni páginas de producto, y en
 * producción la ruta redirige a la home. RATIO sigue en obra; PLUM y SIGNAL no
 * se van a terminar.
 */
export const LOCAL_ONLY_SKUS = Object.freeze(['ratio', 'plum', 'signal'])

/**
 * No entran a la paleta pública del builder, y el servidor rechaza sus
 * secciones aunque alguien arme la receta a mano.
 */
export const BUILDER_HIDDEN_SKUS = Object.freeze(['ratio', 'plum', 'signal'])

/**
 * No se van a terminar: quedan en el repo solo como referencia local y el
 * servidor no acepta sus secciones en ninguna receta (server/sections.js).
 * A diferencia de RATIO, que sigue en obra: sus secciones pasan la allowlist
 * y las frena BUILDER_HIDDEN_SKUS hasta que salga a la venta.
 */
export const RETIRED_SKUS = Object.freeze(['plum', 'signal'])

/**
 * @param {string} sku
 * @returns {boolean}
 */
export function isRetiredSku(sku) {
  return RETIRED_SKUS.includes(sku)
}

/**
 * @param {string} sku
 * @returns {boolean}
 */
export function isComingSoonSku(sku) {
  return COMING_SOON_SKUS.includes(sku)
}

/**
 * @param {string} sku
 * @returns {boolean}
 */
export function isLocalOnlySku(sku) {
  return LOCAL_ONLY_SKUS.includes(sku)
}

/**
 * @param {string} sku
 * @returns {boolean}
 */
export function isBuilderHiddenSku(sku) {
  return BUILDER_HIDDEN_SKUS.includes(sku)
}

/**
 * @param {string} sku
 * @returns {number | null} USD de lista, o null si el SKU no tiene precio
 */
export function templatePriceUsd(sku) {
  return TEMPLATE_PRICES_USD[sku] ?? null
}

/** Una entrada de receta es un id (`'chapters/HeroKinetic'`) o `{ id, props }`. */
/**
 * @param {RecipeEntry | null | undefined} entry
 * @returns {string | undefined}
 */
export function recipeSectionId(entry) {
  return typeof entry === 'string' ? entry : entry?.id
}

/**
 * @param {RecipeEntry[] | null | undefined} recipe
 * @returns {boolean}
 */
export function recipeHasCommerce(recipe) {
  return (recipe || []).some((entry) =>
    String(recipeSectionId(entry) || '').startsWith('commerce/'),
  )
}

/** Secciones por encima de las que trae la base. Cuenta cada instancia. */
/**
 * @param {number} sectionCount
 * @returns {number}
 */
export function customExtraSections(sectionCount) {
  const count = Number.isFinite(sectionCount) ? Math.floor(sectionCount) : 0
  return Math.max(0, count - CUSTOM_BASE_SECTIONS)
}

/**
 * @param {number} sectionCount
 * @param {boolean} hasCommerce
 * @returns {number} USD
 */
export function estimateCustomPriceUsd(sectionCount, hasCommerce) {
  return (
    CUSTOM_BASE_PRICE_USD +
    customExtraSections(sectionCount) * CUSTOM_EXTRA_SECTION_USD +
    (hasCommerce ? COMMERCE_PACK_SURCHARGE_USD : 0)
  )
}

/** Precio de una receta del builder: el mismo cálculo en el carrito y en la orden. */
/**
 * @param {RecipeEntry[] | null | undefined} recipe
 * @returns {number} USD
 */
export function priceCustomRecipeUsd(recipe) {
  const sections = Array.isArray(recipe) ? recipe.length : 0
  return estimateCustomPriceUsd(sections, recipeHasCommerce(recipe))
}

/**
 * USD → ARS redondeado al millar de arriba, o `null` si la entrada no sirve.
 * Cada lado decide qué hacer con el `null`: el front no muestra precio, el
 * servidor corta la orden (server/catalog.js).
 * @param {number} usd
 * @param {number} rate cotización USD→ARS
 * @returns {number | null} pesos, o null si la entrada no sirve
 */
export function arsFromUsdOrNull(usd, rate) {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || rate <= 0) return null
  return Math.ceil((usd * rate) / ARS_ROUNDING) * ARS_ROUNDING
}

/**
 * Precio en USD con cupón (lo que cobra Paddle afuera de Argentina): descuenta
 * en centavos enteros, igual que el precio en pesos. `null` si la entrada o el
 * porcentaje no sirven.
 * @param {number} usd
 * @param {number} percent descuento, 0 a menos de 100
 * @returns {number | null} USD con hasta dos decimales
 */
export function discountedUsdOrNull(usd, percent) {
  if (!Number.isFinite(usd)) return null
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return null
  return Math.round(usd * (100 - percent)) / 100
}

/**
 * Precio en pesos con cupón: descuenta en USD (en centavos enteros) y redondea
 * igual que `arsFromUsdOrNull`, así el total de la orden es la suma de sus
 * líneas. `null` si la entrada o el porcentaje no sirven.
 * @param {number} usd
 * @param {number} rate cotización USD→ARS
 * @param {number} percent descuento, 0 a menos de 100
 * @returns {number | null} pesos, o null si la entrada no sirve
 */
export function discountedArsFromUsdOrNull(usd, rate, percent) {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || rate <= 0) return null
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return null
  const cents = Math.round(usd * (100 - percent))
  return Math.ceil((cents * rate) / (100 * ARS_ROUNDING)) * ARS_ROUNDING
}
