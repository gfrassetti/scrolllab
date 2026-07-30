import { Link } from 'react-router-dom'
import { formatShopPrice } from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'

/**
 * CartDrawer — overlay panel (not a scroll section). Opened from ShopChrome.
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeDrawer}
        className="absolute inset-0 bg-ink/40"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-ink/20 bg-bone text-ink shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/15 px-5 py-4">
          <h2 className="text-lg font-medium tracking-[-0.02em]">{title}</h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="text-[11px] uppercase tracking-[0.2em] text-ink/50 hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {lines.length === 0 ? (
            <p className="max-w-[40ch] text-sm text-ink/55">{empty}</p>
          ) : (
            <ul className="divide-y divide-ink/15 border-y border-ink/15">
              {lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex flex-wrap items-center gap-4 py-5"
                >
                  <img
                    src={line.img}
                    alt=""
                    className="size-16 border border-ink/15 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{line.name}</p>
                    <p className="text-sm text-ink/55">
                      {formatShopPrice(line.price, line.currency)}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink/50">
                    Qty
                    <input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => setQty(line.productId, e.target.value)}
                      className="w-14 border border-ink/20 bg-transparent px-2 py-1 text-sm text-ink"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(line.productId)}
                    className="text-[11px] uppercase tracking-[0.2em] text-ink/50 hover:text-accent"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-ink/15 px-5 py-5">
          <p className="flex justify-between text-sm text-ink/60">
            <span>Total</span>
            <span className="text-lg font-medium text-ink">
              {formatShopPrice(total)}
            </span>
          </p>
          <Link
            to="/checkout"
            onClick={closeDrawer}
            className="mt-4 block border-2 border-ink px-6 py-3 text-center text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone"
          >
            {checkoutLabel}
          </Link>
        </div>
      </aside>
    </div>
  )
}
