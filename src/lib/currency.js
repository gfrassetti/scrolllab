import { useI18n } from '../i18n'
import { usePayRegion, resolveCurrency } from './payRegion.js'

/**
 * La moneda vigente y cómo cambiarla. `setCurrency('USD')` cambia el medio de
 * pago a tarjeta (Polar); `'ARS'`, a Mercado Pago: es la misma elección
 * que el selector «Medio de pago» del carrito. `canChoose` es falso sin carril
 * internacional (no hay otra moneda en la que cobrar).
 */
export function useCurrency() {
  const { locale } = useI18n()
  const intlEnabled = usePayRegion((s) => s.intlEnabled)
  const region = usePayRegion((s) => s.region)
  const setRegion = usePayRegion((s) => s.setRegion)
  const currency = resolveCurrency({ intlEnabled, region, locale })
  return {
    currency,
    showUsd: currency === 'USD',
    canChoose: intlEnabled,
    setCurrency: (next) => setRegion(next === 'USD' ? 'intl' : 'ar'),
  }
}
