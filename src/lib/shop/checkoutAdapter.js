/**
 * Checkout adapter — the ONLY file you need to touch to accept real payments.
 *
 * This kit ships frontend-only on purpose: a payment backend has to run
 * somewhere you control (it holds your secret API key and is the one place
 * that can be trusted to verify the cart total — never the browser). We don't
 * bundle one because a template can't know your hosting, your provider, or
 * your business rules, and a generic one would just be dead weight nobody
 * reviewed for your case.
 *
 * The fast way to get one: open this file (and Checkout.jsx) in Claude Code,
 * Cursor, or ChatGPT, paste the Mercado Pago Checkout Pro or Stripe Checkout
 * docs, and ask it to implement `createCheckout` for you plus a matching
 * backend endpoint. That's a 10–15 minute job today, not a hiring problem.
 *
 * Keep the same signature (`{ items } => { ok, mode, orderId, message }` or
 * a redirect) so `Checkout.jsx` keeps working without further changes.
 *
 * Example shape once wired (Mercado Pago Checkout Pro):
 *   POST your-backend /create-preference with { items }
 *   then window.location = preference.init_point
 */

export async function createCheckout({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty')
  }

  // ——— STUB: no payment provider connected yet. Replace this block — see
  // the file header for the fastest way to do that. ———
  await new Promise((r) => setTimeout(r, 400))
  const orderId = `demo-${Date.now().toString(36)}`
  console.info('[checkoutAdapter] no payment provider wired yet', { orderId, items })
  return {
    ok: true,
    mode: 'demo',
    orderId,
    message: 'Demo checkout — no payment provider connected. See checkoutAdapter.js.',
  }
}
