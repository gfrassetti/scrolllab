import { isQaBuyer } from '../qa.js'

/**
 * El carril internacional (USD, merchant of record): Lemon Squeezy o Polar. Para el
 * comprador es uno solo; cuál cobra lo decide el servidor.
 *
 * - Una pasarela en modo prueba (Lemon `LEMONSQUEEZY_TEST_MODE`, Polar `POLAR_ENV=sandbox`)
 *   no cobra plata real: existe solo para las cuentas de QA (QA_BUYER_EMAILS).
 * - Con las dos usables, manda `INTL_GATEWAY` (`polar` | `lemonsqueezy`); sin él, Polar.
 */
export const INTL_GATEWAYS = Object.freeze(['polar', 'lemonsqueezy'])

const confOf = (config, gateway) => (gateway === 'polar' ? config.polar : gateway === 'lemonsqueezy' ? config.lemon : null)

/** ¿Esta pasarela puede cobrarle a este usuario? */
export function gatewayUsable(config, gateway, user) {
  const c = confOf(config, gateway)
  return Boolean(c?.enabled) && (!c.testMode || isQaBuyer(user, config))
}

/** ¿Está en modo prueba (no cobra plata real)? */
export function gatewayTestMode(config, gateway) {
  return Boolean(confOf(config, gateway)?.testMode)
}

/** La pasarela internacional para este usuario, o null si no hay ninguna. */
export function intlGatewayFor(config, user) {
  const preferred = String(process.env.INTL_GATEWAY || '').trim()
  const order = INTL_GATEWAYS.includes(preferred)
    ? [preferred, ...INTL_GATEWAYS.filter((g) => g !== preferred)]
    : INTL_GATEWAYS
  return order.find((g) => gatewayUsable(config, g, user)) || null
}
