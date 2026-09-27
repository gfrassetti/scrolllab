/**
 * El catálogo del kit a partir de los productos editados en el builder (la
 * lista `products` del ProductGrid: nombre, precio, descripción y foto). Lo
 * que una fila deja vacío toma el valor del producto de ejemplo en esa
 * posición, así la grilla nunca queda sin foto o sin precio. Los productos
 * editados no traen variantes (talle, color): se suman en el código, con la
 * forma que muestra `products.js`. Sin productos editados queda `base`.
 *
 * Puro (sin React ni imports de imágenes): lo usan el preview del builder y
 * el ZIP, a través de ShopCatalogProvider.
 */
export function catalogFromEdits(rows, base) {
  const edited = Array.isArray(rows)
    ? rows.filter((row) => row && typeof row === 'object' && Object.keys(row).length)
    : []
  if (!edited.length) return base
  return edited.map((row, i) => {
    const sample = base[i % base.length]
    return {
      id: `p-${String(i + 1).padStart(2, '0')}`,
      name: row.name || sample.name,
      price: parsePrice(row.price) ?? sample.price,
      currency: sample.currency,
      blurb: row.blurb || sample.blurb,
      img: row.img || sample.img,
    }
  })
}

/** «15000», «12.5», «12,50» o un número → número; cualquier otra cosa → null. */
export function parsePrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const n = Number(value.trim().replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Los productos editados de una composición: los del ProductGrid (el primero). */
export function productsFromItems(items) {
  const grid = (items || []).find(
    (item) => (item.sectionId || item.id) === 'commerce/ProductGrid',
  )
  return grid?.props?.products
}
