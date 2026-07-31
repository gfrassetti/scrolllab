/**
 * Catálogo del servidor. Los precios de lista están en USD y se convierten a
 * ARS con la cotización de fx.js recién al crear la orden — así el valor no se
 * licúa con la inflación y la conversión queda auditable en cada orden.
 * Nunca se confía en el precio que manda el cliente.
 *
 * Mantener los USD en sync con src/lib/pricing.js.
 */
export const COMMERCE_PACK_SURCHARGE_USD = 39

/** Redondeo del monto en pesos: al millar de arriba, para no perder en el cambio. */
export const ARS_ROUNDING = 1000

/** Modelos incluidos en el SKU `bundle`. Orden = orden del ZIP. */
export const BUNDLE_MODELS = [
  'chapters',
  'nocturne',
  'monolith',
  'velocity',
  'fizz',
  'atelier',
]

export const PRODUCTS = {
  chapters: {
    sku: 'chapters',
    title: 'CHAPTERS — template',
    description: 'Modelo editorial cinético completo (código fuente).',
    unit_price_usd: 129,
    currency_id: 'ARS',
  },
  nocturne: {
    sku: 'nocturne',
    title: 'NOCTURNE — template',
    description: 'Modelo noir cinematográfico completo (código fuente).',
    unit_price_usd: 129,
    currency_id: 'ARS',
  },
  monolith: {
    sku: 'monolith',
    title: 'MONOLITH — template',
    description: 'Modelo brutalista con Three.js (código fuente).',
    unit_price_usd: 159,
    currency_id: 'ARS',
  },
  velocity: {
    sku: 'velocity',
    title: 'VELOCITY — template',
    description: 'Modelo de energía athlete / scroll cinematográfico (código fuente).',
    unit_price_usd: 129,
    currency_id: 'ARS',
  },
  fizz: {
    sku: 'fizz',
    title: 'FIZZ — template',
    description: 'Modelo pop carbonatado con lata 3D y mundos de color (código fuente).',
    unit_price_usd: 159,
    currency_id: 'ARS',
  },
  atelier: {
    sku: 'atelier',
    title: 'ATELIER — template',
    description: 'Modelo studio con WebGL + fondos reactivos al scroll (código fuente).',
    unit_price_usd: 179,
    currency_id: 'ARS',
  },
  bundle: {
    sku: 'bundle',
    title: 'BUNDLE — los 6 modelos',
    description: 'Los seis modelos completos en un solo ZIP (código fuente).',
    unit_price_usd: 389,
    currency_id: 'ARS',
  },
  custom: {
    sku: 'custom',
    title: 'Composición del builder',
    description: 'ZIP a medida según la receta armada en el builder.',
    unit_price_usd: 229,
    currency_id: 'ARS',
  },
}

export function arsFromUsd(usd, rate) {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('Conversión USD→ARS inválida')
  }
  return Math.ceil((usd * rate) / ARS_ROUNDING) * ARS_ROUNDING
}

export function recipeSectionId(entry) {
  return typeof entry === 'string' ? entry : entry?.id
}

export function recipeHasCommerce(recipe) {
  return (recipe || []).some((entry) =>
    String(recipeSectionId(entry) || '').startsWith('commerce/'),
  )
}

export function priceCustomRecipeUsd(recipe) {
  const base = PRODUCTS.custom.unit_price_usd
  return base + (recipeHasCommerce(recipe) ? COMMERCE_PACK_SURCHARGE_USD : 0)
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
  return { ...product, recipe: null }
}

/** Catálogo público con el precio ya convertido a pesos. */
export function catalogWithArs(rate) {
  return Object.values(PRODUCTS).map((product) => ({
    ...product,
    unit_price: arsFromUsd(product.unit_price_usd, rate),
  }))
}
