import { isQaBuyer } from '../qa.js'

/**
 * El carril internacional (USD, merchant of record): Polar. Para el comprador es uno
 * solo; el servidor decide si se le puede cobrar.
 *
 * - En modo prueba (`POLAR_ENV=sandbox`) no cobra plata real: existe solo para las
 *   cuentas de QA (QA_BUYER_EMAILS).
 */
export const INTL_GATEWAYS = Object.freeze(['polar'])

const confOf = (config, gateway) => (gateway === 'polar' ? config.polar : null)

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
  return INTL_GATEWAYS.find((g) => gatewayUsable(config, g, user)) || null
}
