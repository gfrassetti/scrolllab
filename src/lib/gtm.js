/**
 * Google Tag Manager + dataLayer (GA4 ecommerce).
 * Contenedor: GTM-T8CW46DC (snippet en index.html).
 * En GTM: no uses History Change; dispará GA4 con estos custom events.
 */
export const GTM_ID = String(
  (import.meta.env && import.meta.env.VITE_GTM_ID) || 'GTM-T8CW46DC',
).trim()

const PURCHASE_KEY = (id) => `scrolllab-gtm-purchase:${id}`
const seenPurchases = new Set()

function hasWindow() {
  return typeof window !== 'undefined'
}

export function dataLayer() {
  if (!hasWindow()) return []
  window.dataLayer = window.dataLayer || []
  return window.dataLayer
}

export function gtmPush(payload) {
  if (!payload || !hasWindow()) return
  dataLayer().push(payload)
}

function isGtmId(id) {
  return /^GTM-[A-Z0-9]+$/i.test(id)
}

export function bootGtm() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (!isGtmId(GTM_ID)) return
  if (window.__scrolllabGtm) return
  if (document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
    window.__scrolllabGtm = true
    return
  }
  window.__scrolllabGtm = true
  dataLayer().push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`
  document.head.appendChild(script)
}

export function cartItemsToEcommerce(items) {
  return (items || []).map((item, index) => ({
    item_id: String(item?.sku || ''),
    item_name: String(item?.title || item?.sku || ''),
    index,
    quantity: Number(item?.qty) > 0 ? Number(item.qty) : 1,
  }))
}

export function orderItemsToEcommerce(items) {
  return (items || []).map((item, index) => ({
    item_id: String(item?.sku || ''),
    item_name: String(item?.title || item?.sku || ''),
    price: Number(item?.unit_price),
    index,
    quantity: 1,
  }))
}

function pushEcommerce(event, ecommerce) {
  gtmPush({ ecommerce: null })
  gtmPush({ event, ecommerce })
}

export function trackPageView({ path, title }) {
  gtmPush({
    event: 'virtual_page_view',
    page_path: path,
    page_title: title,
  })
}

export function trackAddToCart(item) {
  if (!item?.sku) return
  pushEcommerce('add_to_cart', {
    currency: 'USD',
    items: cartItemsToEcommerce([item]),
  })
}

export function trackBeginCheckout(items) {
  if (!Array.isArray(items) || items.length === 0) return
  pushEcommerce('begin_checkout', {
    currency: 'USD',
    items: cartItemsToEcommerce(items),
  })
}

function purchaseId(order) {
  return String(order?.id || order?.orderId || '').trim()
}

function alreadyTrackedPurchase(id) {
  if (!id) return true
  if (seenPurchases.has(id)) return true
  try {
    if (sessionStorage.getItem(PURCHASE_KEY(id)) === '1') return true
  } catch {
    /* ignore */
  }
  return false
}

function markTrackedPurchase(id) {
  seenPurchases.add(id)
  try {
    sessionStorage.setItem(PURCHASE_KEY(id), '1')
  } catch {
    /* ignore */
  }
}

/** Una sola vez por orden (StrictMode / modal + confirm no duplican). */
export function trackPurchase(order) {
  const id = purchaseId(order)
  if (alreadyTrackedPurchase(id)) return false
  const value = Number(order?.total)
  if (!Number.isFinite(value)) return false
  markTrackedPurchase(id)
  pushEcommerce('purchase', {
    transaction_id: id,
    currency: order?.currency_id || 'ARS',
    value,
    value_usd: Number.isFinite(Number(order?.totalUsd))
      ? Number(order.totalUsd)
      : undefined,
    items: orderItemsToEcommerce(order?.items),
  })
  return true
}
