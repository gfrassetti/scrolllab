/**
 * Cupón de bienvenida en el navegador: se guarda el código para autocompletar
 * el carrito. El descuento real lo calcula siempre el servidor (POST
 * /api/checkout); acá solo se muestra.
 */
import { discountedArsFromUsd } from './pricing.js'

const KEY = 'scrolllab-coupon'

/**
 * Guarda el cupón. El servidor lo revalida, así que alcanza con el código;
 * `emailHint` (a***@gmail.com) sirve para decir con qué cuenta hay que entrar.
 */
export function saveCoupon({ code, percent, expiresAt, emailHint } = {}) {
  if (!code) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, percent, expiresAt, emailHint }))
  } catch {
    /* sin storage: el cupón igual se muestra en pantalla */
  }
}

export function loadCoupon() {
  try {
    const raw = localStorage.getItem(KEY)
    const saved = raw ? JSON.parse(raw) : null
    return saved?.code ? saved : null
  } catch {
    return null
  }
}

export function clearCoupon() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/**
 * `?cupon=SL-XXXXXX` (el botón del mail): guarda el código y lo saca de la URL.
 * Devuelve el código o null.
 */
export function captureCouponFromUrl(
  loc = globalThis.location,
  hist = globalThis.history,
) {
  try {
    const params = new URLSearchParams(loc?.search || '')
    const code = (params.get('cupon') || '').trim().slice(0, 40)
    if (!code) return null
    saveCoupon({ code })
    params.delete('cupon')
    const query = params.toString()
    hist?.replaceState?.(
      hist.state,
      '',
      `${loc.pathname}${query ? `?${query}` : ''}${loc.hash || ''}`,
    )
    return code
  } catch {
    return null
  }
}

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
