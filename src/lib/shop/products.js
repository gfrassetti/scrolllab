import tee from './assets/tee.png'
import cap from './assets/cap.png'
import tote from './assets/tote.png'

/**
 * Demo catalog shipped with the commerce kit. Replace freely.
 *
 * `variants` is optional and per-product on purpose — not every item needs
 * the same picker. A tee needs a size, a cap needs a colour, a tote needs
 * neither: `ProductDetail` only renders a selector when `variants` exists,
 * and the cart keys each line by `productId + variant` so two sizes of the
 * same tee sit as two separate lines.
 */
export const DEMO_PRODUCTS = [
  {
    id: 'p-01',
    name: 'Signal Tee',
    price: 18000,
    currency: 'ARS',
    blurb: 'Heavyweight cotton, one accent stitch.',
    img: tee,
    variants: { label: 'Size', options: ['S', 'M', 'L', 'XL'] },
  },
  {
    id: 'p-02',
    name: 'Archive Cap',
    price: 12000,
    currency: 'ARS',
    blurb: 'Unstructured six-panel, tonal mark.',
    img: cap,
    variants: { label: 'Colour', options: ['Black', 'Stone'] },
  },
  {
    id: 'p-03',
    name: 'Field Tote',
    price: 24000,
    currency: 'ARS',
    blurb: 'Canvas body, reinforced handles. One size.',
    img: tote,
    // No `variants` — one size fits all, no picker renders.
  },
]

export function getProduct(id) {
  return DEMO_PRODUCTS.find((p) => p.id === id) || DEMO_PRODUCTS[0]
}

/** First option of a product's variant picker, or null if it has none. */
export function defaultVariant(product) {
  return product?.variants?.options?.[0] ?? null
}

/** Stable key for a cart line: same product + different variant = different line. */
export function cartLineId(productId, variant) {
  return variant ? `${productId}::${variant}` : productId
}

export function formatShopPrice(amount, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
