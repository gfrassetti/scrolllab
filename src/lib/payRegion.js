import { create } from 'zustand'
import { api } from './api.js'

/**
 * Desde dónde paga el comprador: Argentina (Mercado Pago, ARS) o
 * internacional (Paddle, USD). Lo elige él; la detección solo pone el default:
 * la elección guardada, el país que ve el servidor (Vercel / Cloudflare) o, si
 * no hay, la zona horaria del navegador. Ver docs/paddle.md.
 */

export const PAY_REGIONS = Object.freeze(['ar', 'intl'])
const KEY = 'scrolllab-pay-region'

/** Zona horaria argentina → 'ar'; otra → 'intl'; sin dato → null. */
export function regionFromTimeZone(timeZone) {
  if (!timeZone) return null
  return /^America\/(Argentina\/|Buenos_Aires$|Cordoba$|Catamarca$|Jujuy$|Mendoza$|Rosario$)/.test(
    String(timeZone),
  )
    ? 'ar'
    : 'intl'
}

/** País ISO → 'ar' | 'intl' (null sin país). */
export function regionFromCountry(country) {
  if (!country) return null
  return String(country).toUpperCase() === 'AR' ? 'ar' : 'intl'
}

/**
 * El default: sin Paddle, siempre Argentina; si no, la elección guardada, el
 * país del servidor, la zona horaria y, sin nada de eso, Argentina.
 * @param {{ stored?: string | null, country?: string | null, timeZone?: string | null, paddleEnabled?: boolean }} args
 */
export function pickRegion({ stored, country, timeZone, paddleEnabled }) {
  if (!paddleEnabled) return 'ar'
  if (stored === 'ar' || stored === 'intl') return stored
  return regionFromCountry(country) || regionFromTimeZone(timeZone) || 'ar'
}

/**
 * Moneda en que se muestran (y se cobran) los precios. Solo hay dos, las que
 * cobramos: ARS (Mercado Pago) y USD (Paddle, ver docs/paddle.md).
 *
 * Con Paddle activo la moneda **sigue al medio de pago** elegido o detectado
 * por ubicación, no al idioma: un español que lee el sitio en español puede ver
 * y pagar en dólares, y un argentino con el sitio en inglés ve pesos. Sin
 * Paddle (todavía no hay cómo cobrar en dólares) queda la regla de siempre: EN
 * muestra USD de referencia, ES pesos.
 *
 * @param {{ paddleEnabled: boolean, region: 'ar' | 'intl', locale: string }} args
 * @returns {'ARS' | 'USD'}
 */
export function resolveCurrency({ paddleEnabled, region, locale }) {
  if (paddleEnabled) return region === 'intl' ? 'USD' : 'ARS'
  return locale === 'en' ? 'USD' : 'ARS'
}

export const providerForRegion = (region) =>
  region === 'intl' ? 'paddle' : 'mercadopago'

function readStored() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/**
 * `methods` es la respuesta de GET /api/checkout/methods (null hasta que
 * llega o si falla: en ese caso todo sigue por Mercado Pago, como siempre).
 */
export const usePayRegion = create((set, get) => ({
  region: 'ar',
  status: 'idle',
  methods: null,
  paddleEnabled: false,
  setRegion(region) {
    if (!PAY_REGIONS.includes(region)) return
    try {
      localStorage.setItem(KEY, region)
    } catch {
      /* ignore */
    }
    set({ region })
  },
  async load() {
    if (get().status !== 'idle') return
    set({ status: 'loading' })
    let methods = null
    try {
      methods = await api.checkoutMethods()
    } catch {
      methods = null
    }
    const paddleEnabled = Boolean(methods?.providers?.paddle?.enabled)
    set({
      methods,
      paddleEnabled,
      status: 'ready',
      region: pickRegion({
        stored: readStored(),
        country: methods?.country,
        timeZone: browserTimeZone(),
        paddleEnabled,
      }),
    })
  },
}))
