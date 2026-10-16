import { create } from 'zustand'
import { api } from './api.js'

/**
 * Desde dónde paga el comprador: Argentina (Mercado Pago, ARS) o
 * internacional (Lemon Squeezy, USD). Lo elige él; la detección solo pone el
 * default: la elección guardada, el país que ve el servidor (Vercel /
 * Cloudflare) o, si no hay, la zona horaria del navegador. Ver
 * docs/lemonsqueezy.md. Si el carril internacional está, lo dice el servidor
 * (`providers.lemonsqueezy` de GET /api/checkout/methods).
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
 * El default: sin carril internacional, siempre Argentina; si no, la elección
 * guardada, el país del servidor, la zona horaria y, sin nada de eso, Argentina.
 * @param {{ stored?: string | null, country?: string | null, timeZone?: string | null, intlEnabled?: boolean }} args
 */
export function pickRegion({ stored, country, timeZone, intlEnabled }) {
  if (!intlEnabled) return 'ar'
  if (stored === 'ar' || stored === 'intl') return stored
  return regionFromCountry(country) || regionFromTimeZone(timeZone) || 'ar'
}

/**
 * Moneda en que se muestran (y se cobran) los precios. Solo hay dos, las que
 * cobramos: ARS (Mercado Pago) y USD (Lemon Squeezy, ver docs/lemonsqueezy.md).
 *
 * Con el carril internacional activo la moneda **sigue al medio de pago**
 * elegido o detectado por ubicación, no al idioma: un español que lee el sitio
 * en español puede ver y pagar en dólares, y un argentino con el sitio en
 * inglés ve pesos. Sin él (todavía no hay cómo cobrar en dólares) queda la
 * regla de siempre: EN muestra USD de referencia, ES pesos.
 *
 * @param {{ intlEnabled: boolean, region: 'ar' | 'intl', locale: string }} args
 * @returns {'ARS' | 'USD'}
 */
export function resolveCurrency({ intlEnabled, region, locale }) {
  if (intlEnabled) return region === 'intl' ? 'USD' : 'ARS'
  return locale === 'en' ? 'USD' : 'ARS'
}

/**
 * La pasarela de cada región.
 * @param {'ar' | 'intl'} region
 */
export const providerForRegion = (region) => (region === 'intl' ? 'lemonsqueezy' : 'mercadopago')

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
  intlEnabled: false,
  /** ¿El carril internacional cobra suscripciones (LAB)? */
  labIntlEnabled: false,
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
    const intlEnabled = Boolean(methods?.providers?.lemonsqueezy?.enabled)
    set({
      methods,
      intlEnabled,
      labIntlEnabled: intlEnabled,
      status: 'ready',
      region: pickRegion({
        stored: readStored(),
        country: methods?.country,
        timeZone: browserTimeZone(),
        intlEnabled,
      }),
    })
  },
}))
