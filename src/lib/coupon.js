/**
 * Cupón de bienvenida en el navegador: solo cuentas y formato. El cupón lo crea el
 * servidor cuando alguien entra con su cuenta (ver welcomeCoupon.js) y el
 * descuento real lo calcula siempre POST /api/checkout; acá solo se muestra.
 */
import { discountedArsFromUsd } from './pricing.js'

/**
 * Precio de una línea con el cupón: pesos (mismo redondeo que el servidor) o
 * USD en la UI en inglés. null si falta el precio de lista.
 */
export function couponLinePrice({ usd, rate, percent, currency }) {
  if (usd == null) return null
  if (currency === 'USD') return Math.round(usd * (100 - percent)) / 100
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
