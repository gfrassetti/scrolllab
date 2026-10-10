/**
 * Productos de prueba (QA) para probar en producción, con plata real, todo el
 * circuito: compra, recibo, descarga, arrepentimiento con devolución, LAB (alta,
 * cobro, cambio de plan, baja) y cada mail. Solo existen para las cuentas de
 * `QA_BUYER_EMAILS`: para cualquier otra, el servidor los rechaza y las rutas
 * (/test, /builder-test, /lab-test) dan 404. Precios fijos en pesos, los más
 * bajos que acepta Mercado Pago; solo se cobran con Mercado Pago. Las órdenes y
 * suscripciones quedan marcadas `qa` y fuera de las métricas.
 */
import { recipeHasCommerce, CUSTOM_BASE_SECTIONS } from './catalog.js'

/** SKU del template de prueba en el pedido. Entrega el ZIP de `QA_TEMPLATE_MODEL`. */
export const QA_TEMPLATE_SKU = 'qa-template'
/** El modelo que se empaqueta para el template de prueba. */
export const QA_TEMPLATE_MODEL = 'chapters'
export const QA_TEMPLATE_ARS = 100

/** SKU de la composición del builder de prueba en el pedido. */
export const QA_CUSTOM_SKU = 'qa-custom'
export const QA_BUILDER_BASE_ARS = 200
export const QA_BUILDER_EXTRA_SECTION_ARS = 10
export const QA_BUILDER_COMMERCE_ARS = 50

/** Los tres planes de LAB de prueba cuestan lo mismo, por mes o por año, y sin prueba gratis. */
export const QA_LAB_PRICE_ARS = 1000

/** @param {string} sku */
export function isQaSku(sku) {
  return sku === QA_TEMPLATE_SKU || sku === QA_CUSTOM_SKU
}

/**
 * Precio en pesos de una composición del builder de prueba: misma forma que el
 * real (base con secciones incluidas, extra por sección, recargo de commerce).
 * @param {Array<string | { id: string, props?: Record<string, unknown> }>} recipe
 */
export function qaCustomPriceArs(recipe) {
  const count = Array.isArray(recipe) ? recipe.length : 0
  const extra = Math.max(0, count - CUSTOM_BASE_SECTIONS) * QA_BUILDER_EXTRA_SECTION_ARS
  const commerce = recipeHasCommerce(recipe || []) ? QA_BUILDER_COMMERCE_ARS : 0
  return QA_BUILDER_BASE_ARS + extra + commerce
}

/**
 * Precio en pesos con el 10% de primera compra (redondeo a peso).
 * @param {number} ars
 * @param {number} percent
 */
export function qaDiscountedArs(ars, percent) {
  return Math.round((ars * (100 - percent)) / 100)
}

/**
 * Lista de mails autorizados (`QA_BUYER_EMAILS`, separados por coma).
 * @param {string | undefined} raw
 * @returns {string[]}
 */
export function parseQaEmails(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes('@'))
}
