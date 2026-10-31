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
 * @typedef {string | { id: string, props?: Record<string, unknown>, font?: string }} RecipeEntry
 */

/** Precio de lista por template. Incluye los que todavía no se venden (RATIO). */
/**
 * 2026-10-12 (decisión del dueño): chapters/nocturne/unity 149→169; velocity,
 * comic y atrium igualados a 307 (antes 199/189/189). fold, monolith y fizz
 * quedan iguales por ahora. El bundle (BUNDLE_PRICE_USD) sube en la misma
 * proporción para mantener el ~53% off sobre el nuevo precio de lista.
 */
export const TEMPLATE_PRICES_USD = Object.freeze({
  chapters: 169,
  nocturne: 169,
  monolith: 239,
  velocity: 307,
  fizz: 239,
  atelier: 279,
  comic: 307,
  unity: 169,
  ratio: 269,
  atrium: 307,
  meridian: 379,
  kin: 379,
  fold: 229,
  apex: 239,
  // ORDO (2026-10-31): precio fijado por el dueño al nivel de KIN / MERIDIAN (379), el más alto del catálogo. Todavía no
  // se vende: a la vista solo por URL (/templates/ordo) hasta que salga de COMING_SOON / LOCAL_ONLY / BUILDER_HIDDEN.
  ordo: 379,
})

export const BUNDLE_PRICE_USD = 879

/** Modelos que trae el SKU `bundle`. Orden = orden del ZIP. */
/**
 * 2026-10-18 (decisión del dueño): VELOCITY y NOCTURNE salen de la venta;
 * ATRIUM y APEX ocupan sus lugares y el bundle sigue en 8 y en 879.
 */
export const BUNDLE_MODELS = Object.freeze([
  'chapters',
  'apex',
  'monolith',
  'atrium',
  'fizz',
  'atelier',
  'comic',
  'unity',
])

/**
 * Composición del builder: base por tramo + adicional por sección extra.
 * Cuenta cada entrada de la receta (nav, footer y repeticiones incluidas),
 * porque cada una es un componente renderizado en el App.jsx del ZIP. Una
 * composición del tamaño de un template (10 secciones) queda en 599 USD.
 * La base tiene que superar al template más caro EN VENTA (`npm run check`).
 *
 * 2026-10-10 (decisión del dueño): 389 / 15 / 39 → 690 / 29 / 79. Con 8
 * secciones el builder costaba casi lo mismo que UN template caro (KIN o
 * MERIDIAN, 379) y deja mezclar los mejores modelos, todo editable desde el
 * panel. El mismo día, a la vista ($ 1.063.000 en pesos) quedó muy caro: se
 * bajó a la opción moderada, 549 / 25 / 59 (~1,45× el template más caro).
 * Los precios del Estudio tienen que quedar arriba del techo (USD 1.158 con
 * 30 secciones y commerce): ver docs/estudio-positioning.md.
 */
export const CUSTOM_BASE_PRICE_USD = 549
export const CUSTOM_BASE_SECTIONS = 8
export const CUSTOM_EXTRA_SECTION_USD = 25
/**
 * Composiciones del builder en una misma compra: cada una se cobra aparte
 * (su propio tramo) y se baja en su propio ZIP.
 */
export const MAX_CART_COMPOSITIONS = 5

/** Tope de secciones de una receta (el builder lo muestra, el checkout lo aplica). */
export const MAX_CUSTOM_SECTIONS = 30

export const COMMERCE_PACK_SURCHARGE_USD = 59

/** Redondeo del monto en pesos: al millar de arriba, para no perder en el cambio. */
export const ARS_ROUNDING = 1000

/** Cupón de bienvenida: el % que promete la home es el que descuenta el checkout. */
export const WELCOME_COUPON_PERCENT = 10

/**
 * No se venden ni van en el bundle. Los que además son LOCAL_ONLY no se
 * listan en ningún lado. VELOCITY y NOCTURNE salieron de la venta el 2026-10-18
 * (decisión del dueño): su código queda solo para rearmar los ZIP ya vendidos y no romper los
 * widgets de LAB ya publicados.
 */
export const COMING_SOON_SKUS = Object.freeze(['ratio', 'plum', 'signal', 'velocity', 'nocturne', 'ordo'])

/**
 * Sin card en home, sin sitemap ni páginas de producto, y en producción la
 * ruta redirige a la home. RATIO sigue en obra; PLUM y SIGNAL no se van a
 * terminar. Excepción: ORDO (2026-10-31) está en esta lista pero su ruta
 * /templates/ordo SÍ abre en producción (App.jsx): a la vista solo por URL.
 */
export const LOCAL_ONLY_SKUS = Object.freeze(['ratio', 'plum', 'signal', 'velocity', 'nocturne', 'ordo'])

/**
 * No entran a la paleta pública del builder, y el servidor rechaza sus
 * secciones aunque alguien arme la receta a mano.
 */
export const BUILDER_HIDDEN_SKUS = Object.freeze(['ratio', 'plum', 'signal', 'velocity', 'nocturne', 'ordo'])

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

/**
 * Lo que costaría comprar por separado los templates de los que la receta
 * saca secciones (solo modelos en venta con precio de lista; commerce y el
 * form de contacto no son templates). Es el ancla que muestra el builder.
 * @param {RecipeEntry[] | null | undefined} recipe
 * @returns {{ models: string[], usd: number }}
 */
export function separateModelsPriceUsd(recipe) {
  const models = []
  for (const entry of Array.isArray(recipe) ? recipe : []) {
    const model = String(recipeSectionId(entry) || '').split('/')[0]
    if (!model || models.includes(model)) continue
    if (!(model in TEMPLATE_PRICES_USD) || isComingSoonSku(model)) continue
    models.push(model)
  }
  return { models, usd: models.reduce((sum, m) => sum + TEMPLATE_PRICES_USD[m], 0) }
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
 * Precio en USD con cupón (lo que cobra Polar afuera de Argentina): descuenta
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
