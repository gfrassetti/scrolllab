import { api } from './api.js'
import { markCheckoutIntent } from './cart.js'
import { trackBeginCheckout } from './gtm.js'
import { openPaddleCheckout } from './paddleCheckout.js'
import { usePayRegion, providerForRegion } from './payRegion.js'

/**
 * Medio de pago vigente (el detectado por ubicación o el que eligió el
 * comprador en el carrito). Los botones de «Comprar» rápido (ficha del
 * template, home, builder) saltan el carrito y no tienen selector: heredan
 * esto. Sin cargar todavía, Mercado Pago (el comportamiento de siempre).
 */
function currentProvider() {
  const { paddleEnabled, region } = usePayRegion.getState()
  return paddleEnabled ? providerForRegion(region) : 'mercadopago'
}

/** Idioma del sitio (para los mails de la orden), sin depender del contexto de React. */
function currentLocale() {
  if (typeof document === 'undefined') return undefined
  return document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'es'
}

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
 * Inicia el pago: Mercado Pago (redirect a Checkout Pro, o mock) o Paddle
 * (overlay sobre la transacción que armó el servidor; al completarse va a
 * /checkout/success, que confirma contra la API).
 * Sin sesión: marca intención y manda a login; al volver a /cart el carrito retoma solo.
 *
 * @param {{
 *   items: Array<{ sku: string, title?: string, recipe?: string[] }>,
 *   user: unknown,
 *   navigate: (to: string) => void,
 *   loginNext?: string,
 *   couponCode?: string,
 *   provider?: 'mercadopago' | 'paddle',
 *   locale?: string,
 * }} opts
 * @returns {Promise<'login' | 'redirect' | 'paid' | 'closed'>}
 */
export async function startCheckout({
  items,
  user,
  navigate,
  loginNext = '/cart',
  couponCode,
  provider = currentProvider(),
  locale = currentLocale(),
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

  // Mercado Pago es el default del servidor: solo Paddle viaja explícito.
  const data = await api.checkout(payload, couponCode, {
    provider: provider === 'paddle' ? 'paddle' : undefined,
    locale,
  })
  if (data?.provider === 'paddle' && data.transactionId) {
    const result = await openPaddleCheckout({
      environment: data.paddle?.environment,
      clientToken: data.paddle?.clientToken,
      transactionId: data.transactionId,
      email: data.customerEmail,
      locale,
    })
    if (result.status !== 'completed') return 'closed'
    navigate(
      `/checkout/success?provider=paddle&txn=${encodeURIComponent(result.transactionId)}`,
    )
    return 'paid'
  }
  if (!data?.init_point) {
    throw new Error('Checkout sin init_point')
  }
  window.location.href = data.init_point
  return 'redirect'
}
