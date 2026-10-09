/**
 * Catálogo del servidor. Los precios de lista y las reglas de qué se vende
 * vienen de src/domain/catalog.js (los mismos que ve el front); acá viven el
 * copy de cada producto para Checkout Pro, los planes de LAB y la conversión a
 * pesos, que corta la orden si no hay cotización. Nunca se confía en el precio
 * que manda el cliente.
 */
import {
  arsFromUsdOrNull,
  discountedArsFromUsdOrNull,
  isComingSoonSku,
  BUNDLE_PRICE_USD,
  CUSTOM_BASE_PRICE_USD,
  TEMPLATE_PRICES_USD,
} from '../src/domain/catalog.js'

export {
  COMMERCE_PACK_SURCHARGE_USD,
  CUSTOM_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD,
  ARS_ROUNDING,
  BUNDLE_MODELS,
  COMING_SOON_SKUS,
  LOCAL_ONLY_SKUS,
  BUILDER_HIDDEN_SKUS,
  isComingSoonSku,
  isLocalOnlySku,
  WELCOME_COUPON_PERCENT,
  recipeSectionId,
  recipeHasCommerce,
  customExtraSections,
  priceCustomRecipeUsd,
} from '../src/domain/catalog.js'

function template(sku, title, description) {
  return {
    sku,
    title,
    description,
    unit_price_usd: TEMPLATE_PRICES_USD[sku],
    currency_id: 'ARS',
  }
}

// Opcional por SKU: `picture: '/ruta.png'` (público bajo CLIENT_URL).
// Si falta, Checkout Pro usa /icon-512.png.
export const PRODUCTS = {
  chapters: template(
    'chapters',
    'CHAPTERS — template',
    'Modelo editorial cinético completo (código fuente).',
  ),
  nocturne: template(
    'nocturne',
    'NOCTURNE — template',
    'Modelo noir cinematográfico completo (código fuente).',
  ),
  monolith: template(
    'monolith',
    'MONOLITH — template',
    'Modelo brutalista con Three.js (código fuente).',
  ),
  velocity: template(
    'velocity',
    'VELOCITY — template',
    'Modelo de energía athlete / scroll cinematográfico (código fuente).',
  ),
  fizz: template(
    'fizz',
    'FIZZ — template',
    'Modelo pop carbonatado con botella de vidrio 3D y mundos de color (código fuente).',
  ),
  atelier: template(
    'atelier',
    'ATELIER — template',
    'Modelo studio con WebGL + fondos reactivos al scroll (código fuente).',
  ),
  comic: template(
    'comic',
    'COMIC — template',
    'Modelo historieta scrollytelling con paneles y escena en capas (código fuente).',
  ),
  unity: template(
    'unity',
    'UNITY — template',
    'Modelo editorial deportivo con mosaico→slider y footer de trofeo (código fuente).',
  ),
  ratio: template(
    'ratio',
    'RATIO — template',
    'Modelo Beat (riel + seek): cubo, tipo y placas coreografiados. Solo desktop (código fuente).',
  ),
  atrium: template(
    'atrium',
    'ATRIUM — template',
    'Modelo de estudio de arquitectura: massing, manifiesto, anillo de fotos y wordmark (código fuente).',
  ),
  meridian: template(
    'meridian',
    'MERIDIAN — template',
    'Modelo para desarrollos inmobiliarios, complejos de cabañas o departamentos, desarrolladoras y resorts: hero de flythrough aéreo scrubeado por scroll, menú drawer, sliders con efecto mask, mapa con pines interactivos e interiores con hotspots (código fuente).',
  ),
  kin: template(
    'kin',
    'KIN — template',
    'Modelo brutalista para galerías de arte, de moda o de diseño: la marca es una palabra hecha de barras que se arma en el loader, se desarma en una puerta que se atraviesa al scrollear y se rearma en el footer; colección fijada con obras apiladas en profundidad (código fuente).',
  ),
  fold: template(
    'fold',
    'FOLD — template',
    'Modelo de película al scroll: un mundo de papel contado como un film continuo en canvas que avanza con cada tick del scroll, capítulos con riel y menú, transiciones de puntos y de papel picado, y un footer en loop. La película de la demo es de muestra: hay que producir clips propios; trae el script y la guía para armarla (código fuente).',
  ),
  bundle: {
    sku: 'bundle',
    title: 'BUNDLE — los 8 modelos',
    description: 'Los ocho modelos completos en un solo ZIP (código fuente).',
    unit_price_usd: BUNDLE_PRICE_USD,
    currency_id: 'ARS',
  },
  custom: {
    sku: 'custom',
    title: 'Composición del builder',
    description: 'ZIP a medida según la receta armada en el builder.',
    unit_price_usd: CUSTOM_BASE_PRICE_USD,
    currency_id: 'ARS',
  },
}

/**
 * Planes de suscripción de LAB (secciones en vivo). A diferencia de los
 * one-time, el precio es ARS fijo (no pasa por fx). Precios fijados por el
 * owner: ladder marcado 24.900 / 99.900 / 299.900 (Pro 4× Starter, Studio
 * 12×). `instanceQuota` es definitivo (5 / 15 / sin tope). `yearly` = 10×
 * `monthly` (2 meses gratis) y siempre por debajo de 12× (el "ahorro").
 * Cambiar un precio es una acción explícita; nunca automática.
 *
 * `priceMonthlyUsd` / `priceYearlyUsd`: lo que cobra Paddle afuera de
 * Argentina (docs/paddle.md). Fijados por el owner (2026-10-06): 19 / 79 / 229
 * por mes (misma escalera ~4× / ~12×), anual = 10×.
 */
export const HOSTED_PLANS = Object.freeze({
  hosted_starter: {
    id: 'hosted_starter',
    tier: 'starter',
    priceMonthly: 24900,
    priceYearly: 249000,
    priceMonthlyUsd: 19,
    priceYearlyUsd: 190,
    instanceQuota: 5,
    currency_id: 'ARS',
  },
  hosted_pro: {
    id: 'hosted_pro',
    tier: 'pro',
    priceMonthly: 99900,
    priceYearly: 999000,
    priceMonthlyUsd: 79,
    priceYearlyUsd: 790,
    instanceQuota: 15,
    currency_id: 'ARS',
  },
  hosted_studio: {
    id: 'hosted_studio',
    tier: 'studio',
    priceMonthly: 299900,
    priceYearly: 2999000,
    priceMonthlyUsd: 229,
    priceYearlyUsd: 2290,
    // Sin tope: Infinity vive acá adentro (las comparaciones `used >= quota`
    // dan siempre false). Se serializa a `null` en el borde HTTP — ver
    // `quotaForWire` en app.js — y el cliente lo lee como "ilimitado".
    instanceQuota: Infinity,
    currency_id: 'ARS',
  },
})

export const HOSTED_PLAN_IDS = Object.freeze(Object.keys(HOSTED_PLANS))

export function isHostedPlanId(id) {
  return Object.prototype.hasOwnProperty.call(HOSTED_PLANS, id)
}

export function hostedPlanPrice(planId, cycle) {
  const plan = HOSTED_PLANS[planId]
  if (!plan) return null
  return cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
}

/**
 * Precio de un plan en la moneda de la suscripción: ARS (Mercado Pago) o USD
 * (Paddle).
 * @param {string} planId
 * @param {'monthly' | 'yearly' | string} cycle
 * @param {'ARS' | 'USD' | string} [currency]
 */
export function hostedPlanPriceIn(planId, cycle, currency = 'ARS') {
  if (currency !== 'USD') return hostedPlanPrice(planId, cycle)
  const plan = HOSTED_PLANS[planId]
  if (!plan) return null
  return cycle === 'yearly' ? plan.priceYearlyUsd : plan.priceMonthlyUsd
}

export function hostedPlanQuota(planId) {
  return HOSTED_PLANS[planId]?.instanceQuota ?? 0
}

export function arsFromUsd(usd, rate) {
  const ars = arsFromUsdOrNull(usd, rate)
  if (ars == null) throw new Error('Conversión USD→ARS inválida')
  return ars
}

/**
 * Cupón de bienvenida: un solo uso por mail, solo en la primera compra y sin
 * vencimiento (vale hasta que compra). El porcentaje vive en src/domain/catalog.js.
 */
/**
 * El cupón es personal: solo lo canjea quien compra con la cuenta de Google de
 * ese mail. En `false` es un código al portador y lo usa el primero que pague.
 */
export const WELCOME_COUPON_BOUND_TO_EMAIL = true

/**
 * Precio en pesos con cupón: descuenta en USD (en centavos enteros) y redondea
 * igual que `arsFromUsd`, así el total de la orden es la suma de sus líneas.
 */
export function discountedArsFromUsd(usd, rate, percent) {
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) {
    throw new Error('Descuento inválido')
  }
  const ars = discountedArsFromUsdOrNull(usd, rate, percent)
  if (ars == null) throw new Error('Conversión USD→ARS inválida')
  return ars
}

export function resolveLineItem(item) {
  if (item.sku === 'custom' || String(item.sku).startsWith('custom:')) {
    return {
      ...PRODUCTS.custom,
      sku: item.sku,
      title: item.title || PRODUCTS.custom.title,
      recipe: item.recipe || null,
    }
  }
  const product = PRODUCTS[item.sku]
  if (!product) return null
  if (isComingSoonSku(item.sku)) return null
  return { ...product, recipe: null }
}

/** Catálogo público con el precio ya convertido a pesos. */
export function catalogWithArs(rate) {
  return Object.values(PRODUCTS)
    .filter((product) => !isComingSoonSku(product.sku))
    .map((product) => ({
      ...product,
      unit_price: arsFromUsd(product.unit_price_usd, rate),
    }))
}
