import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createShopifyCheckout,
  fetchShopifyProducts,
  normalizeShopifyConfig,
  productFromShopify,
  shopifyCartLines,
  shopifyEndpoint,
} from '../shop/shopify.js'
import { shopifyConfigFromItems } from '../../domain/checkoutProps.js'

const money = (amount, currencyCode = 'USD') => ({ amount: String(amount), currencyCode })

const SLIDES = {
  id: 'gid://shopify/Product/1',
  handle: 'slides',
  title: 'Slides',
  description: 'Simple, minimal and comfortable. They go with everything.',
  availableForSale: true,
  featuredImage: { url: 'https://cdn.shopify.com/a.jpg' },
  images: { nodes: [{ url: 'https://cdn.shopify.com/a.jpg' }, { url: 'https://cdn.shopify.com/b.jpg' }] },
  options: [{ name: 'Size', optionValues: [{ name: 'Small' }, { name: 'Large' }] }],
  variants: {
    nodes: [
      { id: 'gid://shopify/ProductVariant/11', title: 'Small', availableForSale: false, price: money(25) },
      { id: 'gid://shopify/ProductVariant/12', title: 'Large', availableForSale: true, price: money(27.5) },
    ],
  },
}

const GIFT = {
  id: 'gid://shopify/Product/2',
  handle: 'gift-card',
  title: 'Gift card',
  description: '',
  availableForSale: true,
  featuredImage: null,
  images: { nodes: [] },
  options: [{ name: 'Title', optionValues: [{ name: 'Default Title' }] }],
  variants: { nodes: [{ id: 'gid://shopify/ProductVariant/21', title: 'Default Title', availableForSale: true, price: money(10) }] },
}

const HOODIE = {
  id: 'gid://shopify/Product/3',
  handle: 'hoodie',
  title: 'Hoodie',
  description: 'Heavy fleece.',
  availableForSale: true,
  featuredImage: { url: 'https://cdn.shopify.com/h.jpg' },
  images: { nodes: [] },
  options: [
    { name: 'Size', optionValues: [{ name: 'M' }] },
    { name: 'Color', optionValues: [{ name: 'Black', swatch: { color: '#111111' } }, { name: 'Green' }] },
  ],
  variants: {
    nodes: [
      { id: 'gid://shopify/ProductVariant/31', title: 'M / Black', availableForSale: true, price: money(80) },
      { id: 'gid://shopify/ProductVariant/32', title: 'M / Green', availableForSale: true, price: money(80) },
    ],
  },
}

/** fetch falso: guarda lo que se mandó y responde `data`. */
function fakeFetch(data, { status = 200, errors } = {}) {
  const calls = []
  const impl = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) })
    return { ok: status < 400, status, json: async () => ({ data, ...(errors ? { errors } : {}) }) }
  }
  return { impl, calls }
}

describe('shopify: configuración', () => {
  it('arma el endpoint desde el dominio, con o sin https y barra', () => {
    assert.match(shopifyEndpoint('Brand.myshopify.com'), /^https:\/\/brand\.myshopify\.com\/api\/\d{4}-\d{2}\/graphql\.json$/)
    assert.equal(shopifyEndpoint('https://shop.brand.com/'), shopifyEndpoint('shop.brand.com'))
    assert.equal(shopifyEndpoint('mock.shop'), 'https://mock.shop/api')
    assert.equal(shopifyEndpoint(''), null)
    assert.equal(shopifyEndpoint('not a domain'), null)
  })

  it('una tienda real necesita token; la de prueba no', () => {
    assert.equal(normalizeShopifyConfig({ domain: 'brand.myshopify.com' }), null)
    assert.ok(normalizeShopifyConfig({ domain: 'brand.myshopify.com', token: 'abc' }))
    assert.ok(normalizeShopifyConfig({ domain: 'mock.shop' }))
    assert.equal(normalizeShopifyConfig(null), null)
  })

  it('el builder la guarda en el ProductGrid', () => {
    const items = [
      { id: 'chapters/HeroKinetic', props: {} },
      { id: 'commerce/ProductGrid', props: { shopifyDomain: ' brand.myshopify.com ', shopifyToken: 'abc' } },
    ]
    assert.deepEqual(shopifyConfigFromItems(items), { domain: 'brand.myshopify.com', token: 'abc', collection: '' })
    assert.equal(shopifyConfigFromItems([{ id: 'commerce/ProductGrid', props: { shopifyToken: 'abc' } }]), null)
  })
})

describe('shopify: productos', () => {
  it('una opción es el selector, con precio, stock e id por variante', () => {
    const p = productFromShopify(SLIDES)
    assert.equal(p.id, 'slides')
    assert.equal(p.price, 27.5, 'el precio es el de la primera variante con stock')
    assert.equal(p.currency, 'USD')
    assert.deepEqual(p.variants, { label: 'Size', options: ['Small', 'Large'] })
    assert.deepEqual(p.variantIds, { Small: 'gid://shopify/ProductVariant/11', Large: 'gid://shopify/ProductVariant/12' })
    assert.deepEqual(p.variantPrices, { Small: 25, Large: 27.5 })
    assert.deepEqual(p.soldOutOptions, ['Small'])
    assert.deepEqual(p.images, ['https://cdn.shopify.com/a.jpg', 'https://cdn.shopify.com/b.jpg'])
    assert.equal(p.blurb, 'Simple, minimal and comfortable.')
  })

  it('«Default Title» no tiene selector', () => {
    const p = productFromShopify(GIFT)
    assert.equal(p.variants, undefined)
    assert.deepEqual(p.variantIds, { '': 'gid://shopify/ProductVariant/21' })
  })

  it('varias opciones se eligen por el título de la variante', () => {
    const p = productFromShopify(HOODIE)
    assert.deepEqual(p.variants, { label: 'Size / Color', options: ['M / Black', 'M / Green'] })
    assert.equal(p.variantIds['M / Green'], 'gid://shopify/ProductVariant/32')
  })

  it('pide los productos con el token y, si hay, de una colección', async () => {
    const { impl, calls } = fakeFetch({ collection: { products: { nodes: [SLIDES, GIFT] } } })
    const list = await fetchShopifyProducts(
      { domain: 'brand.myshopify.com', token: 'tok', collection: 'boards' },
      { fetchImpl: impl },
    )
    assert.deepEqual(list.map((p) => p.id), ['slides', 'gift-card'])
    assert.equal(calls[0].headers['X-Shopify-Storefront-Access-Token'], 'tok')
    assert.equal(calls[0].body.variables.handle, 'boards')
  })

  it('una colección que no existe es un error (queda el catálogo del builder)', async () => {
    const { impl } = fakeFetch({ collection: null })
    await assert.rejects(
      fetchShopifyProducts({ domain: 'mock.shop', collection: 'nope' }, { fetchImpl: impl }),
      /no collection «nope»/,
    )
  })

  it('un token inválido es un error', async () => {
    const { impl } = fakeFetch(null, { status: 401 })
    await assert.rejects(fetchShopifyProducts({ domain: 'brand.myshopify.com', token: 'bad' }, { fetchImpl: impl }), /401/)
  })
})

describe('shopify: checkout', () => {
  const lines = [
    { id: 'slides::Large', merchandiseId: 'gid://shopify/ProductVariant/12', qty: 2, price: 1 },
    { id: 'p-01', qty: 1, price: 18000 },
  ]

  it('a Shopify solo viajan ids de variante y cantidades, nunca precios', async () => {
    assert.deepEqual(shopifyCartLines(lines), [{ merchandiseId: 'gid://shopify/ProductVariant/12', quantity: 2 }])
    const { impl, calls } = fakeFetch({ cartCreate: { cart: { id: 'c1', checkoutUrl: 'https://brand.com/cart/c/1' }, userErrors: [] } })
    const url = await createShopifyCheckout({ domain: 'mock.shop' }, lines, { fetchImpl: impl })
    assert.equal(url, 'https://brand.com/cart/c/1')
    assert.doesNotMatch(JSON.stringify(calls[0].body.variables), /price|18000/)
  })

  it('los errores de Shopify llegan al comprador', async () => {
    const { impl } = fakeFetch({ cartCreate: { cart: null, userErrors: [{ message: 'Variant is sold out' }] } })
    await assert.rejects(createShopifyCheckout({ domain: 'mock.shop' }, lines, { fetchImpl: impl }), /sold out/)
    await assert.rejects(createShopifyCheckout({ domain: 'mock.shop' }, [{ id: 'x', qty: 1 }]), /empty/)
  })
})
