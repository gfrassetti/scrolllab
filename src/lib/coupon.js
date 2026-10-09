/**
 * Cupón de bienvenida en el navegador: solo cuentas y formato. El cupón lo crea el
 * servidor cuando alguien entra con su cuenta (ver welcomeCoupon.js) y el
 * descuento real lo calcula siempre POST /api/checkout; acá solo se muestra.
 */
import { discountedArsFromUsd, formatPriceFromUsd, formatArs, formatUsd } from './pricing.js'
import { discountedUsdOrNull } from '../domain/catalog.js'

/**
 * Precio de una línea con el cupón: pesos (mismo redondeo que el servidor) o
 * USD (cobro internacional, Paddle). null si falta el precio de lista.
 */
export function couponLinePrice({ usd, rate, percent, currency }) {
  if (usd == null) return null
  if (currency === 'USD') return discountedUsdOrNull(usd, percent)
  return discountedArsFromUsd(usd, rate, percent)
}

/** Vencimiento legible ("2 de octubre") en hora argentina, igual que el mail. */
export function formatCouponDate(iso, locale) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

/**
 * Precio de un «Comprar» rápido con el 10% de primera compra a la vista: lista
 * y precio con descuento ya formateados. Sin cupón vigente (sin sesión, ya
 * compró o lo usó: el servidor no lo devuelve), `price` es null y se muestra
 * solo la lista. El cobro lo recalcula siempre POST /api/checkout.
 * @param {{ usd: number | null | undefined, currency: string, rate?: number | null, coupon?: { percent: number } | null }} args
 */
export function firstPurchaseDeal({ usd, currency, rate, coupon }) {
  if (usd == null || !Number.isFinite(usd)) return null
  const list = formatPriceFromUsd(usd, currency, rate)
  if (!list) return null
  const usdView = currency === 'USD' || currency === 'en'
  const discounted = coupon?.percent
    ? couponLinePrice({ usd, rate, percent: coupon.percent, currency: usdView ? 'USD' : 'ARS' })
    : null
  if (discounted == null) return { list, price: null, percent: null }
  return {
    list,
    price: usdView ? formatUsd(discounted) : formatArs(discounted),
    percent: coupon.percent,
  }
}
