import { db } from '../db.js'
import { validateCheckoutItems } from '../validation.js'
import { pendingExpiresAt } from '../orderRetention.js'
import { createCheckoutPreference } from './mercadoPago.js'
import { discountedArsFromUsd } from '../catalog.js'
import { getUsdArsRate } from '../fx.js'
import { resolveCouponForCheckout } from './coupons.js'

/**
 * Caso de uso: crear la orden de una compra (templates o composición del
 * builder) con los precios del servidor, el cupón de bienvenida si viene, y
 * la preferencia de Checkout Pro (o la URL del pago mock). Nada sale de montos
 * del cliente: `items` se valida contra el catálogo y la receta contra la
 * allowlist, y el descuento se recalcula sobre el precio de lista.
 *
 * Devuelve lo que responde POST /api/checkout: `{ init_point, orderId }`
 * (+ `mock: true` en modo mock).
 */
export async function createCheckoutOrder({ user, items, couponCode, config }) {
  const fx = await getUsdArsRate()
  const resolved = validateCheckoutItems(items, {
    maxCartItems: config.maxCartItems,
    maxRecipeSections: config.maxRecipeSections,
    rate: fx.rate,
  })

  // Cupón de bienvenida: el cliente manda solo el código; el descuento lo
  // calcula el servidor sobre el precio de lista, nunca sale de un monto suyo.
  const coupon = couponCode
    ? await resolveCouponForCheckout({
        code: couponCode,
        userId: db.uid(user),
        userEmail: user.email,
      })
    : null
  const lines = coupon
    ? resolved.map((i) => ({
        ...i,
        unit_price: discountedArsFromUsd(i.unit_price_usd, fx.rate, coupon.percent),
      }))
    : resolved

  const total = lines.reduce((sum, i) => sum + i.unit_price, 0)
  const order = await db.createOrder({
    userId: db.uid(user),
    status: 'pending',
    items: lines.map((i) => ({
      sku: i.sku,
      title: i.title,
      unit_price: i.unit_price,
      unit_price_usd: i.unit_price_usd,
      currency_id: i.currency_id,
      recipe: i.recipe || undefined,
    })),
    total,
    totalUsd: resolved.reduce((sum, i) => sum + i.unit_price_usd, 0),
    fxRate: fx.rate,
    couponCode: coupon?.code,
    discountPct: coupon?.percent,
    currency_id: 'ARS',
    expiresAt: pendingExpiresAt(),
  })

  const orderId = db.uid(order) || order.id

  if (config.mpMock) {
    return {
      init_point: `${config.clientUrl}/checkout/mock?orderId=${orderId}`,
      orderId,
      mock: true,
    }
  }

  const result = await createCheckoutPreference({
    accessToken: config.mpAccessToken,
    items: lines,
    orderId,
    userId: db.uid(user),
    clientUrl: config.clientUrl,
    apiPublicUrl: config.apiPublicUrl,
    payer: { email: user.email, name: user.name },
  })

  order.mpPreferenceId = result.id
  await order.save()

  // sandbox_init_point está deprecado por MP: con credenciales de Prueba,
  // init_point ya abre el entorno de test.
  return {
    init_point: result.init_point,
    orderId,
  }
}
