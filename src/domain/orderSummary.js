import { arsFromUsdOrNull } from './catalog.js'

/**
 * El detalle de precios de una orden, igual en todos lados (recibo, Mis
 * compras, modal de compra): cada ítem a precio de lista, el descuento de
 * primera compra y el total cobrado. La orden guarda el precio ya descontado
 * por ítem (`unit_price`) y el de lista en USD (`unit_price_usd`); en pesos el
 * de lista sale de la cotización guardada (`fxRate`), con el mismo redondeo que
 * se usó al cobrar. Sin descuento, el subtotal es el total.
 * @param {any} order
 * @returns {{ currency: string, items: Array<{ sku?: string, title: string, list: number, paid: number }>, subtotal: number, discount: number, discountPct: number, total: number }}
 */
export function orderPriceSummary(order) {
  const currency = order?.currency_id || 'ARS'
  const usd = currency === 'USD'
  const total = Number(order?.total) || 0
  const pct = Number(order?.discountPct) || 0
  const round = (n) => (usd ? Math.round(n * 100) / 100 : Math.round(n))
  const items = (order?.items || []).map((i) => {
    const paid = Number(i.unit_price) || 0
    let list = paid
    // Producto de prueba: lista fija en pesos (src/domain/qa.js).
    if (pct > 0 && Number.isFinite(Number(i.list_ars)) && Number(i.list_ars) >= paid) {
      list = Number(i.list_ars)
    } else if (pct > 0 && Number.isFinite(Number(i.unit_price_usd)) && Number(i.unit_price_usd) > 0) {
      const fromUsd = usd ? Number(i.unit_price_usd) : arsFromUsdOrNull(Number(i.unit_price_usd), Number(order.fxRate))
      if (fromUsd != null && fromUsd >= paid) list = fromUsd
    }
    return { sku: i.sku, title: i.title || i.sku, list, paid }
  })
  const subtotal = round(items.reduce((sum, i) => sum + i.list, 0))
  const discount = pct > 0 ? round(subtotal - total) : 0
  return {
    currency,
    items,
    subtotal: discount > 0 ? subtotal : total,
    discount: discount > 0 ? discount : 0,
    discountPct: discount > 0 ? pct : 0,
    total,
  }
}
