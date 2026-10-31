/**
 * El checkout, la ficha de producto y el carrito lateral son rutas / un panel,
 * no secciones: el builder no los puede seleccionar. Sus textos viajan como
 * props del ProductGrid con prefijo (`checkout*`, `detail*`, `cart*`) y acá se
 * traducen a las props reales de cada componente. Compartido por el preview y
 * el packaging para que el ZIP diga exactamente lo mismo que la pantalla
 * aprobada. Los colores libres de la tienda (bg / fg / accent) también salen
 * del ProductGrid.
 */

/** `checkoutPayLabel` con prefijo `checkout` → `payLabel`. */
function propsWithPrefix(gridProps, prefix) {
  const out = {}
  for (const [key, value] of Object.entries(gridProps || {})) {
    if (!key.startsWith(prefix) || key.length <= prefix.length) continue
    if (typeof value !== 'string' || !value) continue
    const rest = key.slice(prefix.length)
    out[rest[0].toLowerCase() + rest.slice(1)] = value
  }
  return out
}

/**
 * Prefijos de las props del ProductGrid que van a otra pantalla o a toda la
 * tienda, no a la grilla (`shopify*`: la tienda Shopify conectada).
 */
export const SHOP_ROUTE_PREFIXES = Object.freeze(['checkout', 'detail', 'cart', 'shopify'])

export function checkoutPropsFrom(gridProps) {
  return propsWithPrefix(gridProps, 'checkout')
}

const gridOf = (items) =>
  (items || []).find((item) => (item.sectionId || item.id) === 'commerce/ProductGrid')

/** Props del checkout dentro de una composición / receta con ProductGrid. */
export function checkoutPropsFromItems(items) {
  return checkoutPropsFrom(gridOf(items)?.props)
}

/** Props de la ficha de producto (`detail*`). */
export function detailPropsFromItems(items) {
  return propsWithPrefix(gridOf(items)?.props, 'detail')
}

/** Props del botón flotante y del carrito lateral (`cart*`). */
export function cartPropsFromItems(items) {
  return propsWithPrefix(gridOf(items)?.props, 'cart')
}

/** Colores libres de la tienda (pisan los de la paleta elegida en `theme`). */
export function shopColorsFromItems(items) {
  const props = gridOf(items)?.props || {}
  const out = {}
  for (const key of ['bg', 'fg', 'accent']) {
    if (typeof props[key] === 'string' && props[key]) out[key] = props[key]
  }
  return out
}

/**
 * La tienda Shopify conectada en el ProductGrid ({ domain, token, collection })
 * o null si no hay dominio. El token es el público de Storefront (solo lectura,
 * hecho para ir en el navegador). Lo que falte lo resuelve
 * normalizeShopifyConfig (src/lib/shop/shopify.js).
 */
export function shopifyConfigFromItems(items) {
  const props = gridOf(items)?.props || {}
  const text = (key) => (typeof props[key] === 'string' ? props[key].trim() : '')
  // Apagado a propósito: queda guardado pero no se usa. Sin el interruptor
  // (composiciones de antes de que existiera) manda el dominio.
  if (props.shopifyEnabled === 'off') return null
  const domain = text('shopifyDomain')
  if (!domain) return null
  return { domain, token: text('shopifyToken'), collection: text('shopifyCollection') }
}

/** Moneda de los precios de la tienda (vacío: la del catálogo de ejemplo). */
export function shopCurrencyFromItems(items) {
  const value = gridOf(items)?.props?.currency
  return typeof value === 'string' && value ? value : ''
}
