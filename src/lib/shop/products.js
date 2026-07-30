/** Demo catalog shipped with the commerce kit. Replace freely. */
export const DEMO_PRODUCTS = [
  {
    id: 'p-01',
    name: 'Signal Tee',
    price: 18000,
    currency: 'ARS',
    blurb: 'Heavyweight cotton, one accent stitch.',
    img: 'https://picsum.photos/seed/scrolllab-p1/900/1100',
  },
  {
    id: 'p-02',
    name: 'Archive Cap',
    price: 12000,
    currency: 'ARS',
    blurb: 'Unstructured six-panel, tonal mark.',
    img: 'https://picsum.photos/seed/scrolllab-p2/900/1100',
  },
  {
    id: 'p-03',
    name: 'Field Tote',
    price: 24000,
    currency: 'ARS',
    blurb: 'Canvas body, reinforced handles.',
    img: 'https://picsum.photos/seed/scrolllab-p3/900/1100',
  },
]

export function getProduct(id) {
  return DEMO_PRODUCTS.find((p) => p.id === id) || DEMO_PRODUCTS[0]
}

export function formatShopPrice(amount, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
