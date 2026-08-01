import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatShopPrice } from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'
import { createCheckout } from '../../../lib/shop/checkoutAdapter'

/**
 * Checkout — page at /checkout (not a scroll section).
 */
export default function Checkout({
  eyebrow = 'Checkout',
  title = 'Almost there',
  body = 'Payments run through your provider. This kit ships with a mock adapter — swap createCheckout() for Mercado Pago or Stripe.',
  payLabel = 'Pay now',
}) {
  const lines = useShopCart((s) => s.lines)
  const total = useShopCart((s) => s.total())
  const clear = useShopCart((s) => s.clear)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const pay = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await createCheckout({ items: lines })
      setResult(res)
      if (res?.ok) clear()
    } catch (err) {
      setError(err?.message || 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-[color:var(--shop-bg)] px-5 py-16 text-[color:var(--shop-fg)] md:px-10 md:py-24">
      <Link
        to="/"
        className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)] transition-colors hover:text-[color:var(--shop-fg)]"
      >
        ← Back
      </Link>
      <p className="mt-10 text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
        {eyebrow}
      </p>
      <h1 className="mt-3 max-w-[16ch] text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] font-medium tracking-[-0.03em]">
        {title}
      </h1>
      <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-[color:var(--shop-muted)] md:text-base">
        {body}
      </p>

      <div className="mt-10 max-w-md border border-[color:var(--shop-border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
          Order summary
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {lines.length === 0 ? (
            <li className="text-[color:var(--shop-muted)]">No items</li>
          ) : (
            lines.map((line) => (
              <li key={line.productId} className="flex justify-between gap-4">
                <span>
                  {line.name} × {line.qty}
                </span>
                <span>{formatShopPrice(line.price * line.qty, line.currency)}</span>
              </li>
            ))
          )}
        </ul>
        <p className="mt-6 flex justify-between border-t border-[color:var(--shop-border)] pt-4 text-base font-medium">
          <span>Total</span>
          <span>{formatShopPrice(total)}</span>
        </p>
        <button
          type="button"
          disabled={busy || lines.length === 0}
          onClick={pay}
          className="mt-6 w-full border-2 border-[color:var(--shop-fg)] px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition-colors not-disabled:hover:border-[color:var(--shop-accent)] not-disabled:hover:bg-[color:var(--shop-accent)] not-disabled:hover:text-[color:var(--shop-accent-fg)] disabled:opacity-40"
          style={{ borderRadius: 'var(--shop-radius)' }}
        >
          {busy ? '…' : payLabel}
        </button>
        {error && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {result?.ok && (
          <p className="mt-3 text-sm text-[color:var(--shop-muted)]" role="status">
            {result.message} ({result.orderId})
          </p>
        )}
      </div>
    </section>
  )
}
