/**
 * Server-side catalog — prices are ARS (centavos not used; MP uses unit_price).
 * Never trust client-sent prices.
 *
 * Keep CUSTOM_BASE / COMMERCE_PACK_SURCHARGE in sync with src/lib/pricing.js.
 */
export const COMMERCE_PACK_SURCHARGE = 150000

export const PRODUCTS = {
  chapters: {
    sku: 'chapters',
    title: 'CHAPTERS — template',
    description: 'Modelo editorial cinético completo (código fuente).',
    unit_price: 200000,
    currency_id: 'ARS',
  },
  nocturne: {
    sku: 'nocturne',
    title: 'NOCTURNE — template',
    description: 'Modelo noir cinematográfico completo (código fuente).',
    unit_price: 200000,
    currency_id: 'ARS',
  },
  monolith: {
    sku: 'monolith',
    title: 'MONOLITH — template',
    description: 'Modelo brutalista con Three.js (código fuente).',
    unit_price: 250000,
    currency_id: 'ARS',
  },
  velocity: {
    sku: 'velocity',
    title: 'VELOCITY — template',
    description: 'Modelo de energía athlete / scroll cinematográfico (código fuente).',
    unit_price: 250000,
    currency_id: 'ARS',
  },
  fizz: {
    sku: 'fizz',
    title: 'FIZZ — template',
    description: 'Modelo pop carbonatado con lata 3D y mundos de color (código fuente).',
    unit_price: 250000,
    currency_id: 'ARS',
  },
  atelier: {
    sku: 'atelier',
    title: 'ATELIER — template',
    description: 'Modelo studio con WebGL + fondos reactivos al scroll (código fuente).',
    unit_price: 280000,
    currency_id: 'ARS',
  },
  custom: {
    sku: 'custom',
    title: 'Composición del builder',
    description: 'ZIP a medida según la receta armada en el builder.',
    unit_price: 350000,
    currency_id: 'ARS',
  },
}

export function recipeSectionId(entry) {
  return typeof entry === 'string' ? entry : entry?.id
}

export function recipeHasCommerce(recipe) {
  return (recipe || []).some((entry) =>
    String(recipeSectionId(entry) || '').startsWith('commerce/'),
  )
}

export function priceCustomRecipe(recipe) {
  const base = PRODUCTS.custom.unit_price
  return base + (recipeHasCommerce(recipe) ? COMMERCE_PACK_SURCHARGE : 0)
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
