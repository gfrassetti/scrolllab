import { Link } from 'react-router-dom'
import { formatShopPrice } from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'

/**
 * CartDrawer — overlay panel (not a scroll section). Opened from ShopChrome.
 * Colores vía CSS vars del ShopThemeProvider.
 */
export default function CartDrawer({
  title = 'Your cart',
  empty = 'Cart is empty. Add something from the grid.',
  checkoutLabel = 'Go to checkout',
}) {
  const open = useShopCart((s) => s.drawerOpen)
  const closeDrawer = useShopCart((s) => s.closeDrawer)
  const lines = useShopCart((s) => s.lines)
  const setQty = useShopCart((s) => s.setQty)
  const removeItem = useShopCart((s) => s.removeItem)
  const total = useShopCart((s) => s.total())

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/40"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[color:var(--shop-border)] bg-[color:var(--shop-bg)] text-[color:var(--shop-fg)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[color:var(--shop-border)] px-5 py-4">
          <h2 className="text-lg font-medium tracking-[-0.02em]">{title}</h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)] hover:text-[color:var(--shop-fg)]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {lines.length === 0 ? (
            <p className="max-w-[40ch] text-sm text-[color:var(--shop-muted)]">
              {empty}
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--shop-border)] border-y border-[color:var(--shop-border)]">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center gap-4 py-5"
                >
                  <img
                    src={line.img}
                    alt=""
                    className="size-16 border border-[color:var(--shop-border)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {line.name}
                      {line.variant ? (
                        <span className="text-[color:var(--shop-muted)]">
                          {' '}
                          — {line.variantLabel ? `${line.variantLabel} ` : ''}
                          {line.variant}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-[color:var(--shop-muted)]">
                      {formatShopPrice(line.price, line.currency)}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)]">
                    Qty
                    <input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => setQty(line.id, e.target.value)}
                      className="w-14 border border-[color:var(--shop-border)] bg-transparent px-2 py-1 text-sm text-[color:var(--shop-fg)]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(line.id)}
                    className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)] hover:text-[color:var(--shop-accent)]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[color:var(--shop-border)] px-5 py-5">
          <p className="flex justify-between text-sm text-[color:var(--shop-muted)]">
            <span>Total</span>
            <span className="text-lg font-medium text-[color:var(--shop-fg)]">
              {formatShopPrice(total)}
            </span>
          </p>
          <Link
            to="/checkout"
            onClick={closeDrawer}
            className="mt-4 block border-2 border-[color:var(--shop-fg)] px-6 py-3 text-center text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)]"
            style={{ borderRadius: 'var(--shop-radius)' }}
          >
            {checkoutLabel}
          </Link>
        </div>
      </aside>
    </div>
  )
}
