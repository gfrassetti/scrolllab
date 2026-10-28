/**
 * Shopify connector for the commerce kit (headless, Storefront API).
 *
 * With a Shopify store connected, Shopify is the source of truth: products,
 * prices, variants (size, colour…), stock and photos are managed in the
 * Shopify admin. This page only *reads* them and, at checkout, hands Shopify
 * a cart made of variant ids + quantities. Shopify prices that cart, adds
 * taxes, shipping and discounts, and takes the payment on its own checkout
 * page (`checkoutUrl`). No price ever travels from the browser, and the money
 * never touches this site.
 *
 * Setup (Shopify admin, free): install the «Headless» sales channel, create a
 * storefront and copy its **public** access token. It is read-only and made to
 * live in browser code. Then pass `{ domain, token, collection? }` — in a
 * builder ZIP that's the `shopify` prop of `<ShopCatalogProvider>` in
 * `src/App.jsx`.
 *
 * `domain: 'mock.shop'` uses Shopify's public demo store (no token): handy to
 * try the flow before connecting yours.
 *
 * Pure module (no React): the catalog provider, the cart and the tests use it.
 */

/** Storefront API version. Shopify serves the oldest supported one if this one retires. */
export const SHOPIFY_API_VERSION = '2026-04'

const MAX_PRODUCTS = 24

/** «my-store.myshopify.com», «https://shop.brand.com/» → the API endpoint. */
export function shopifyEndpoint(domain) {
  const host = String(domain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
  if (!host || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null
  if (host === 'mock.shop') return 'https://mock.shop/api'
  return `https://${host}/api/${SHOPIFY_API_VERSION}/graphql.json`
}

/** The config as the builder / App.jsx passes it, or null if it's incomplete. */
export function normalizeShopifyConfig(config) {
  if (!config || typeof config !== 'object') return null
  const endpoint = shopifyEndpoint(config.domain)
  if (!endpoint) return null
  const token = typeof config.token === 'string' ? config.token.trim() : ''
  // A real store needs its public token; the demo store doesn't.
  if (!token && !endpoint.startsWith('https://mock.shop/')) return null
  const collection = typeof config.collection === 'string' ? config.collection.trim() : ''
  return { endpoint, token, collection }
}

async function storefront(config, query, variables, fetchImpl = globalThis.fetch) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (config.token) headers['X-Shopify-Storefront-Access-Token'] = config.token
  const res = await fetchImpl(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify answered ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message || 'Shopify error')
  return json.data
}

const PRODUCT_FIELDS = `
  id handle title description availableForSale
  featuredImage { url altText }
  images(first: 4) { nodes { url altText } }
  options { name optionValues { name swatch { color } } }
  variants(first: 100) {
    nodes { id title availableForSale price { amount currencyCode } }
  }
`

const PRODUCTS_QUERY = `query Products($first: Int!) {
  products(first: $first) { nodes { ${PRODUCT_FIELDS} } }
}`

const COLLECTION_QUERY = `query Collection($handle: String!, $first: Int!) {
  collection(handle: $handle) { products(first: $first) { nodes { ${PRODUCT_FIELDS} } } }
}`

/** The first sentence (or the first ~140 characters) of the description. */
function blurbOf(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const sentence = /^(.{20,160}?[.!?])(\s|$)/.exec(clean)?.[1]
  if (sentence) return sentence
  return clean.length > 140 ? `${clean.slice(0, 139).trimEnd()}…` : clean
}

/**
 * A Shopify product → the kit's product shape (see products.js), plus what the
 * cart needs to build a Shopify cart: `variantIds` (option → variant id),
 * `variantPrices` and `soldOutOptions`.
 *
 * The kit shows one picker per product. One Shopify option («Size») becomes
 * that picker as is; two or three («Size», «Colour») become one picker with
 * the variant titles («M / Black»). A product with a single «Default Title»
 * variant has no picker.
 */
export function productFromShopify(node) {
  const variants = node?.variants?.nodes || []
  if (!node?.handle || !variants.length) return null
  const amount = (v) => Number(v?.price?.amount)
  const firstAvailable = variants.find((v) => v.availableForSale) || variants[0]
  const options = (node.options || []).filter((o) => o?.name)
  const single = variants.length === 1 && (options.length === 0 || variants[0].title === 'Default Title')

  const photos = [node.featuredImage?.url, ...(node.images?.nodes || []).map((i) => i?.url)]
    .filter(Boolean)
    .filter((src, i, all) => all.indexOf(src) === i)

  const product = {
    id: node.handle,
    name: node.title,
    price: amount(firstAvailable),
    currency: firstAvailable?.price?.currencyCode || 'USD',
    blurb: blurbOf(node.description),
    img: photos[0] || '',
    ...(photos.length > 1 ? { images: photos } : {}),
    ...(node.description ? { details: node.description } : {}),
    ...(node.availableForSale === false ? { soldOut: true } : {}),
    shopifyId: node.id,
  }

  if (single) {
    product.variantIds = { '': variants[0].id }
    return product
  }

  const variantIds = {}
  const variantPrices = {}
  const soldOutOptions = []
  let picker
  if (options.length === 1) {
    const values = options[0].optionValues || []
    const swatches = {}
    for (const v of values) if (v?.swatch?.color) swatches[v.name] = v.swatch.color
    picker = {
      label: options[0].name,
      options: values.map((v) => v.name),
      ...(Object.keys(swatches).length ? { swatches } : {}),
    }
  } else {
    picker = { label: options.map((o) => o.name).join(' / '), options: variants.map((v) => v.title) }
  }
  for (const v of variants) {
    // With one option the variant title is that option's value.
    variantIds[v.title] = v.id
    variantPrices[v.title] = amount(v)
    if (!v.availableForSale) soldOutOptions.push(v.title)
  }
  // Options with no variant behind them (deleted combinations) can't be bought.
  picker.options = picker.options.filter((o) => variantIds[o])
  return {
    ...product,
    variants: picker,
    variantIds,
    variantPrices,
    ...(soldOutOptions.length ? { soldOutOptions } : {}),
  }
}

/**
 * The store's products (or one collection's, by handle) in the kit's shape.
 * Throws on a network / token / unknown collection error: the provider keeps
 * the builder's catalog on screen and logs it.
 */
export async function fetchShopifyProducts(rawConfig, { first = MAX_PRODUCTS, fetchImpl } = {}) {
  const config = normalizeShopifyConfig(rawConfig)
  if (!config) throw new Error('Shopify is not configured')
  const data = config.collection
    ? await storefront(config, COLLECTION_QUERY, { handle: config.collection, first }, fetchImpl)
    : await storefront(config, PRODUCTS_QUERY, { first }, fetchImpl)
  const nodes = config.collection ? data?.collection?.products?.nodes : data?.products?.nodes
  if (config.collection && !data?.collection) {
    throw new Error(`Shopify has no collection «${config.collection}»`)
  }
  return (nodes || []).map(productFromShopify).filter(Boolean)
}

const CART_CREATE = `mutation CartCreate($lines: [CartLineInput!]!) {
  cartCreate(input: { lines: $lines }) {
    cart { id checkoutUrl }
    userErrors { message }
  }
}`

/** Cart lines → Shopify cart lines (variant id + quantity). Lines without a variant id are left out. */
export function shopifyCartLines(lines) {
  return (lines || [])
    .filter((l) => l?.merchandiseId && l.qty > 0)
    .map((l) => ({ merchandiseId: l.merchandiseId, quantity: Math.min(999, Math.floor(l.qty)) }))
}

/**
 * Creates the Shopify cart and returns its checkout URL. Only ids and
 * quantities go to Shopify: the prices on this page are display only.
 */
export async function createShopifyCheckout(rawConfig, lines, { fetchImpl } = {}) {
  const config = normalizeShopifyConfig(rawConfig)
  if (!config) throw new Error('Shopify is not configured')
  const cartLines = shopifyCartLines(lines)
  if (!cartLines.length) throw new Error('Cart is empty')
  const data = await storefront(config, CART_CREATE, { lines: cartLines }, fetchImpl)
  const err = data?.cartCreate?.userErrors?.[0]
  if (err) throw new Error(err.message)
  const url = data?.cartCreate?.cart?.checkoutUrl
  if (!url) throw new Error('Shopify did not return a checkout')
  return url
}
