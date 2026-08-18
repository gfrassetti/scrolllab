import { api } from './api.js'
import { markCheckoutIntent } from './cart.js'
import { trackBeginCheckout } from './gtm.js'

/**
 * Arma el payload que acepta POST /api/checkout (sin precios del cliente).
 * @param {Array<{ sku: string, title?: string, recipe?: string[] }>} items
 */
export function checkoutPayloadFromItems(items) {
  return (items || []).map((i) => ({
    sku: i.sku,
    title: i.title,
    recipe: i.recipe,
  }))
}

/**
 * Inicia el pago en Mercado Pago (o mock).
 * Sin sesión: marca intención y manda a login; al volver a /cart el carrito retoma solo.
 *
 * @param {{
 *   items: Array<{ sku: string, title?: string, recipe?: string[] }>,
 *   user: unknown,
 *   navigate: (to: string) => void,
 *   loginNext?: string,
 * }} opts
 * @returns {Promise<'login' | 'redirect'>}
 */
export async function startCheckout({
  items,
  user,
  navigate,
  loginNext = '/cart',
}) {
  const payload = checkoutPayloadFromItems(items)
  if (payload.length === 0) {
    throw new Error('Carrito vacío')
  }

  trackBeginCheckout(items)

  if (!user) {
    markCheckoutIntent()
    navigate(`/login?next=${encodeURIComponent(loginNext)}`)
    return 'login'
  }

  const data = await api.checkout(payload)
  if (!data?.init_point) {
    throw new Error('Checkout sin init_point')
  }
  window.location.href = data.init_point
  return 'redirect'
}
