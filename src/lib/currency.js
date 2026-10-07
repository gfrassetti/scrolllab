import { useI18n } from '../i18n'
import { usePayRegion, resolveCurrency } from './payRegion.js'

/**
 * La moneda vigente y cómo cambiarla. `setCurrency('USD')` cambia el medio de
 * pago a tarjeta (Paddle); `'ARS'`, a Mercado Pago: es la misma elección que el
 * selector «Medio de pago» del carrito. `canChoose` es falso sin Paddle (no hay
 * otra moneda en la que cobrar).
 */
export function useCurrency() {
  const { locale } = useI18n()
  const paddleEnabled = usePayRegion((s) => s.paddleEnabled)
  const region = usePayRegion((s) => s.region)
  const setRegion = usePayRegion((s) => s.setRegion)
  const currency = resolveCurrency({ paddleEnabled, region, locale })
  return {
    currency,
    showUsd: currency === 'USD',
    canChoose: paddleEnabled,
    setCurrency: (next) => setRegion(next === 'USD' ? 'intl' : 'ar'),
  }
}
