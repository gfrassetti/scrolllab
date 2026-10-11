/**
 * El catálogo del kit a partir de los productos editados en el builder (la
 * lista `products` del ProductGrid: nombre, precio, descripción y foto). Lo
 * que una fila deja vacío toma el valor del producto de ejemplo en esa
 * posición, así la grilla nunca queda sin foto o sin precio. Lo mismo las
 * opciones (talle, color…), la etiqueta («Nuevo»), la descripción larga y la
 * ficha técnica: lo escrito, lo del ejemplo o nada («—»). Las fotos extra
 * (img2…img4) arman la galería de la ficha; «agotado» es un interruptor.
 * Sin productos editados queda `base`.
 *
 * Puro (sin React ni imports de imágenes): lo usan el preview del builder y
 * el ZIP, a través de ShopCatalogProvider.
 */
export function catalogFromEdits(rows, base, currency = '') {
  const edited = Array.isArray(rows)
    ? rows.filter((row) => row && typeof row === 'object' && Object.keys(row).length)
    : []
  // La moneda elegida en el builder vale para todo el catálogo.
  const withCurrency = (list) => (currency ? list.map((p) => ({ ...p, currency })) : list)
  if (!edited.length) return withCurrency(base)
  return withCurrency(edited.map((row, i) => {
    const sample = base[i % base.length]
    return {
      id: `p-${String(i + 1).padStart(2, '0')}`,
      name: row.name || sample.name,
      price: parsePrice(row.price) ?? sample.price,
      currency: sample.currency,
      blurb: row.blurb || sample.blurb,
      img: row.img || sample.img,
      ...galleryFor(row, sample),
      ...variantsFor(row, sample),
      ...textOr('badge', row.badge, sample.badge),
      ...textOr('details', row.details, sample.details),
      ...specsFor(row, sample),
      ...(row.showSoldOut === 'on' ? { soldOut: true } : {}),
    }
  }))
}

const NONE = new Set(['—', '-'])

/** Lo escrito, lo del ejemplo o nada («—»). */
function textOr(key, own, sample) {
  const raw = typeof own === 'string' ? own.trim() : ''
  if (NONE.has(raw)) return {}
  const value = raw || sample
  return value ? { [key]: value } : {}
}

/** La foto principal y las extra (img2…img4): la galería de la ficha. */
function galleryFor(row, sample) {
  const extra = [row.img2, row.img3, row.img4].filter((src) => typeof src === 'string' && src)
  if (!extra.length) return sample.images && !row.img ? { images: sample.images } : {}
  return { images: [row.img || sample.img, ...extra] }
}

/** Ficha técnica: una línea por dato, «Material | Algodón». */
function specsFor(row, sample) {
  const raw = typeof row.specs === 'string' ? row.specs.trim() : ''
  if (NONE.has(raw)) return {}
  if (!raw) return sample.specs ? { specs: sample.specs } : {}
  const specs = raw
    .split(/\r?\n/)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter(([label, value]) => label && value)
    .slice(0, 12)
  return specs.length ? { specs } : {}
}

/**
 * Las opciones de un producto editado (talle, color…): «S, M, L» en
 * `variantOptions` con su nombre en `variantLabel`. Vacío = las del producto de
 * ejemplo en esa posición; «—» (o «-») = sin opciones.
 */
function variantsFor(row, sample) {
  const raw = typeof row.variantOptions === 'string' ? row.variantOptions.trim() : ''
  if (NONE.has(raw)) return {}
  const ownLabel = typeof row.variantLabel === 'string' ? row.variantLabel.trim() : ''
  if (!raw) {
    if (!sample.variants) return {}
    return { variants: ownLabel ? { ...sample.variants, label: ownLabel } : sample.variants }
  }
  // «Negro:#111111» = una muestra de color; sin color, un botón con el nombre.
  const options = []
  const swatches = {}
  for (const part of raw.split(',').map((o) => o.trim()).filter(Boolean).slice(0, 12)) {
    const m = /^(.*?)\s*:\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)$/i.exec(part)
    if (m && m[1]) {
      options.push(m[1])
      swatches[m[1]] = m[2]
    } else {
      options.push(part)
    }
  }
  const label = ownLabel || sample.variants?.label || 'Option'
  return { variants: { label, options, ...(Object.keys(swatches).length ? { swatches } : {}) } }
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
