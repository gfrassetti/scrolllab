/**
 * Catálogo del servidor. Los precios de lista están en USD y se convierten a
 * ARS con la cotización de fx.js recién al crear la orden — así el valor no se
 * licúa con la inflación y la conversión queda auditable en cada orden.
 * Nunca se confía en el precio que manda el cliente.
 *
 * Mantener los USD en sync con src/lib/pricing.js.
 */
export const COMMERCE_PACK_SURCHARGE_USD = 39

/**
 * Composición del builder: `PRODUCTS.custom.unit_price_usd` es la base e
 * incluye CUSTOM_BASE_SECTIONS secciones; cada sección extra suma
 * CUSTOM_EXTRA_SECTION_USD. Cuenta cada entrada de la receta, porque cada una
 * es un componente renderizado en el App.jsx del ZIP.
 */
export const CUSTOM_BASE_SECTIONS = 8
export const CUSTOM_EXTRA_SECTION_USD = 15

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
  'comic',
  'unity',
]

/** Listados en home como “próximamente”; no se venden ni van en el bundle. */
export const COMING_SOON_SKUS = ['ratio']

/**
 * En el repo, no en el marketplace: sin card en home, ruta solo en local.
 */
export const LOCAL_ONLY_SKUS = ['ratio']

/** Espejo de src/lib/pricing.js — no se venden por sección en el builder. */
export const BUILDER_HIDDEN_SKUS = ['ratio']

export function isComingSoonSku(sku) {
  return COMING_SOON_SKUS.includes(sku)
}

export function isLocalOnlySku(sku) {
  return LOCAL_ONLY_SKUS.includes(sku)
}

export const PRODUCTS = {
  // Opcional por SKU: `picture: '/ruta.png'` (público bajo CLIENT_URL).
  // Si falta, Checkout Pro usa /icon-512.png.
  chapters: {
    sku: 'chapters',
    title: 'CHAPTERS — template',
    description: 'Modelo editorial cinético completo (código fuente).',
    unit_price_usd: 149,
    currency_id: 'ARS',
  },
  nocturne: {
    sku: 'nocturne',
    title: 'NOCTURNE — template',
    description: 'Modelo noir cinematográfico completo (código fuente).',
    unit_price_usd: 149,
    currency_id: 'ARS',
  },
  monolith: {
    sku: 'monolith',
    title: 'MONOLITH — template',
    description: 'Modelo brutalista con Three.js (código fuente).',
    unit_price_usd: 189,
    currency_id: 'ARS',
  },
  velocity: {
    sku: 'velocity',
    title: 'VELOCITY — template',
    description: 'Modelo de energía athlete / scroll cinematográfico (código fuente).',
    unit_price_usd: 149,
    currency_id: 'ARS',
  },
  fizz: {
    sku: 'fizz',
    title: 'FIZZ — template',
    description: 'Modelo pop carbonatado con lata 3D y mundos de color (código fuente).',
    unit_price_usd: 189,
    currency_id: 'ARS',
  },
  atelier: {
    sku: 'atelier',
    title: 'ATELIER — template',
    description: 'Modelo studio con WebGL + fondos reactivos al scroll (código fuente).',
    unit_price_usd: 229,
    currency_id: 'ARS',
  },
  comic: {
    sku: 'comic',
    title: 'COMIC — template',
    description: 'Modelo historieta scrollytelling con paneles y escena en capas (código fuente).',
    unit_price_usd: 229,
    currency_id: 'ARS',
  },
  unity: {
    sku: 'unity',
    title: 'UNITY — template',
    description: 'Modelo editorial deportivo con mosaico→slider y footer de trofeo (código fuente).',
    unit_price_usd: 189,
    currency_id: 'ARS',
  },
  ratio: {
    sku: 'ratio',
    title: 'RATIO — template',
    description: 'Modelo Beat (riel + seek): cubo, tipo y placas coreografiados. Solo desktop (código fuente).',
    unit_price_usd: 269,
    currency_id: 'ARS',
  },
  bundle: {
    sku: 'bundle',
    title: 'BUNDLE — los 8 modelos',
    description: 'Los ocho modelos completos en un solo ZIP (código fuente).',
    unit_price_usd: 649,
    currency_id: 'ARS',
  },
  custom: {
    sku: 'custom',
    title: 'Composición del builder',
    description: 'ZIP a medida según la receta armada en el builder.',
    unit_price_usd: 279,
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

export function customExtraSections(sectionCount) {
  const count = Number.isFinite(sectionCount) ? Math.floor(sectionCount) : 0
  return Math.max(0, count - CUSTOM_BASE_SECTIONS)
}

export function priceCustomRecipeUsd(recipe) {
  const sections = Array.isArray(recipe) ? recipe.length : 0
  return (
    PRODUCTS.custom.unit_price_usd +
    customExtraSections(sections) * CUSTOM_EXTRA_SECTION_USD +
    (recipeHasCommerce(recipe) ? COMMERCE_PACK_SURCHARGE_USD : 0)
  )
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
