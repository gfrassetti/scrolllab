/**
 * Server-side catalog — prices are ARS (centavos not used; MP uses unit_price).
 * Never trust client-sent prices.
 */
export const PRODUCTS = {
  chapters: {
    sku: 'chapters',
    title: 'CHAPTERS — template',
    description: 'Modelo editorial cinético completo (código fuente).',
    unit_price: 49000,
    currency_id: 'ARS',
  },
  nocturne: {
    sku: 'nocturne',
    title: 'NOCTURNE — template',
    description: 'Modelo noir cinematográfico completo (código fuente).',
    unit_price: 49000,
    currency_id: 'ARS',
  },
  monolith: {
    sku: 'monolith',
    title: 'MONOLITH — template',
    description: 'Modelo brutalista con Three.js (código fuente).',
    unit_price: 59000,
    currency_id: 'ARS',
  },
  custom: {
    sku: 'custom',
    title: 'Composición del builder',
    description: 'ZIP a medida según la receta armada en el builder.',
    unit_price: 79000,
    currency_id: 'ARS',
  },
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
