/**
 * El checkout es una ruta, no una sección: el builder no lo puede seleccionar.
 * Sus textos viajan como props `checkout*` del ProductGrid y acá se traducen a
 * las props reales del componente. Compartido por el preview y el packaging
 * para que el ZIP diga exactamente lo mismo que la pantalla aprobada.
 */
const PREFIX = 'checkout'

export function checkoutPropsFrom(gridProps) {
  const out = {}
  for (const [key, value] of Object.entries(gridProps || {})) {
    if (!key.startsWith(PREFIX) || key.length <= PREFIX.length) continue
    if (typeof value !== 'string' || !value) continue
    const rest = key.slice(PREFIX.length)
    out[rest[0].toLowerCase() + rest.slice(1)] = value
  }
  return out
}

/** Props del checkout dentro de una composición / receta con ProductGrid. */
export function checkoutPropsFromItems(items) {
  const entry = (items || []).find(
    (item) => (item.sectionId || item.id) === 'commerce/ProductGrid',
  )
  return checkoutPropsFrom(entry?.props)
}
