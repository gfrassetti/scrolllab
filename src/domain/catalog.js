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

/** Precio de lista por template. Incluye los que todavía no se venden (RATIO). */
export const TEMPLATE_PRICES_USD = Object.freeze({
  chapters: 149,
  nocturne: 149,
  monolith: 189,
  velocity: 149,
  fizz: 189,
  atelier: 229,
  comic: 229,
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

export function isComingSoonSku(sku) {
  return COMING_SOON_SKUS.includes(sku)
}

export function isLocalOnlySku(sku) {
  return LOCAL_ONLY_SKUS.includes(sku)
}

export function isBuilderHiddenSku(sku) {
  return BUILDER_HIDDEN_SKUS.includes(sku)
}

export function templatePriceUsd(sku) {
  return TEMPLATE_PRICES_USD[sku] ?? null
}

/** Una entrada de receta es un id (`'chapters/HeroKinetic'`) o `{ id, props }`. */
export function recipeSectionId(entry) {
  return typeof entry === 'string' ? entry : entry?.id
}

export function recipeHasCommerce(recipe) {
  return (recipe || []).some((entry) =>
    String(recipeSectionId(entry) || '').startsWith('commerce/'),
  )
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

/** Precio de una receta del builder: el mismo cálculo en el carrito y en la orden. */
export function priceCustomRecipeUsd(recipe) {
  const sections = Array.isArray(recipe) ? recipe.length : 0
  return estimateCustomPriceUsd(sections, recipeHasCommerce(recipe))
}

/**
 * USD → ARS redondeado al millar de arriba, o `null` si la entrada no sirve.
 * Cada lado decide qué hacer con el `null`: el front no muestra precio, el
 * servidor corta la orden (server/catalog.js).
 */
export function arsFromUsdOrNull(usd, rate) {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || rate <= 0) return null
  return Math.ceil((usd * rate) / ARS_ROUNDING) * ARS_ROUNDING
}

/**
 * Precio en pesos con cupón: descuenta en USD (en centavos enteros) y redondea
 * igual que `arsFromUsdOrNull`, así el total de la orden es la suma de sus
 * líneas. `null` si la entrada o el porcentaje no sirven.
 */
export function discountedArsFromUsdOrNull(usd, rate, percent) {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || rate <= 0) return null
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return null
  const cents = Math.round(usd * (100 - percent))
  return Math.ceil((cents * rate) / (100 * ARS_ROUNDING)) * ARS_ROUNDING
}
