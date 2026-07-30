/**
 * Checkout adapter for sold commerce templates.
 *
 * Swap `createCheckout` with your Mercado Pago / Stripe call.
 * Keep the same signature so Checkout keeps working.
 *
 * Example (Mercado Pago Checkout Pro):
 *   POST your-backend /create-preference with { items }
 *   then window.location = preference.init_point
 */

export async function createCheckout({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty')
  }

  // ——— MOCK: no real payment. Replace this block. ———
  await new Promise((r) => setTimeout(r, 400))
  const orderId = `mock-${Date.now().toString(36)}`
  console.info('[checkoutAdapter] mock checkout', { orderId, items })
  return {
    ok: true,
    mode: 'mock',
    orderId,
    message: 'Mock checkout OK. Wire createCheckout() to your payment provider.',
  }
}
