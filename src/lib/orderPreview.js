import { isComingSoonSku, TEMPLATE_PRICES_USD } from './pricing.js'

const FIXED_TEMPLATE_SKUS = new Set(Object.keys(TEMPLATE_PRICES_USD))

export function isCustomSku(sku) {
  const value = String(sku || '')
  return value === 'custom' || value.startsWith('custom:')
}

/**
 * Preview de un ítem del carrito (todavía no hay orden). Los templates fijos
 * van a su demo; la composición del builder, a /preview?cart=1.
 */
export function cartItemPreviewHref(item) {
  const sku = String(item?.sku || '')
  if (isComingSoonSku(sku)) return null
  if (FIXED_TEMPLATE_SKUS.has(sku)) return `/templates/${sku}`
  if (sku === 'bundle') return '/#templates'
  if (!isCustomSku(sku)) return null
  if (!Array.isArray(item?.recipe) || item.recipe.length === 0) return null
  return '/preview?cart=1'
}

/**
 * Adónde lleva el preview de un ítem comprado, o null si no hay una página que
 * muestre exactamente eso. Preferimos no ofrecer preview antes que mandar al
 * comprador a algo distinto de lo que compró.
 *
 * El bundle son los modelos del catálogo en un ZIP: no hay una demo única, así que va al
 * índice de templates, donde están las demos en venta.
 */
export function itemPreviewHref(order, item, index) {
  const sku = String(item?.sku || '')
  if (isComingSoonSku(sku)) return null
  if (FIXED_TEMPLATE_SKUS.has(sku)) return `/templates/${sku}`
  if (sku === 'bundle') return '/#templates'
  if (!isCustomSku(sku)) return null

  const orderId = order?.id
  if (!orderId) return null
  if (!Array.isArray(item?.recipe) || item.recipe.length === 0) return null
  return `/preview?order=${encodeURIComponent(orderId)}&item=${index}`
}

/** Nombre corto para distinguir previews cuando la orden trae varios ítems. */
export function previewName(item) {
  const sku = String(item?.sku || '')
  if (FIXED_TEMPLATE_SKUS.has(sku) || sku === 'bundle') return sku.toUpperCase()
  return null
}

export function orderPreviews(order) {
  return (order?.items || [])
    .map((item, index) => ({
      item,
      index,
      href: itemPreviewHref(order, item, index),
    }))
    .filter((entry) => entry.href)
}
