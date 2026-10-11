import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatShopPrice } from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'

/** Lo que dura la salida del panel (la entrada usa la misma curva). */
const CLOSE_MS = 280

/**
 * CartDrawer — side cart (overlay panel, not a scroll section). Opened from
 * ShopChrome and every time something is added. Slides in from the right,
 * closes with the backdrop, the close button or Escape, and keeps focus
 * inside while open. Every label is a prop (the builder edits them as
 * `cart*` on the ProductGrid). Colors come from the ShopThemeProvider vars.
 */
export default function CartDrawer({
  title = 'Your cart',
  empty = 'Cart is empty. Add something from the grid.',
  checkoutLabel = 'Go to checkout',
  closeLabel = 'Close',
  qtyLabel = 'Qty',
  removeLabel = 'Remove',
  totalLabel = 'Total',
}) {
  const open = useShopCart((s) => s.drawerOpen)
  const closeDrawer = useShopCart((s) => s.closeDrawer)
  const lines = useShopCart((s) => s.lines)
  const setQty = useShopCart((s) => s.setQty)
  const removeItem = useShopCart((s) => s.removeItem)
  const total = useShopCart((s) => s.total())
  const currency = lines[0]?.currency

  // Montado mientras sale: nada desaparece de golpe.
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return undefined
    }
    setShown(false)
    const id = window.setTimeout(() => setMounted(false), CLOSE_MS)
    return () => window.clearTimeout(id)
  }, [open])

  // La entrada: se dibuja cerrado, se fuerza ese cuadro y recién ahí se abre.
  useLayoutEffect(() => {
    if (open && mounted && !shown) {
      panelRef.current?.getBoundingClientRect()
      setShown(true)
    }
  }, [open, mounted, shown])

  // Escape cierra; el foco entra al panel y vuelve a donde estaba al cerrar.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [open, closeDrawer])

  if (!mounted) return null

  const ease = 'cubic-bezier(0.32, 0.72, 0, 1)'
  const stepper =
    'grid size-9 place-items-center text-base leading-none text-[color:var(--shop-fg)] transition-colors hover:bg-[color:var(--shop-fg)] hover:text-[color:var(--shop-bg)] disabled:opacity-30'

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/40 motion-reduce:transition-none"
        style={{ opacity: shown ? 1 : 0, transition: `opacity ${CLOSE_MS}ms ${ease}` }}
      />
      <aside
        ref={panelRef}
        className="relative flex h-full w-full max-w-md flex-col border-l border-[color:var(--shop-border)] bg-[color:var(--shop-bg)] text-[color:var(--shop-fg)] shadow-xl motion-reduce:transition-none"
        style={{ transform: shown ? 'translateX(0)' : 'translateX(100%)', transition: `transform ${CLOSE_MS + 60}ms ${ease}` }}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--shop-border)] px-5 py-4">
          <h2 className="text-lg font-medium tracking-[-0.02em]">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeDrawer}
            className="min-h-11 px-1 text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)] hover:text-[color:var(--shop-fg)]"
          >
            {closeLabel}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {lines.length === 0 ? (
            <p className="max-w-[40ch] text-sm text-[color:var(--shop-muted)]">{empty}</p>
          ) : (
            <ul className="divide-y divide-[color:var(--shop-border)] border-y border-[color:var(--shop-border)]">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center gap-4 py-5">
                  {/* Foto y nombre llevan a la ficha del producto. */}
                  <Link
                    to={`/product/${line.productId}`}
                    onClick={closeDrawer}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <img
                      src={line.img}
                      alt=""
                      className="size-16 border border-[color:var(--shop-border)] object-cover transition-opacity hover:opacity-80"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <Link to={`/product/${line.productId}`} onClick={closeDrawer} className="underline-offset-4 hover:underline">
                        {line.name}
                      </Link>
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
                    <div className="mt-2 flex items-center gap-4">
                      <div
                        role="group"
                        aria-label={`${qtyLabel} — ${line.name}`}
                        className="inline-flex items-center border border-[color:var(--shop-border)]"
                        style={{ borderRadius: 'var(--shop-radius)' }}
                      >
                        <button
                          type="button"
                          aria-label="−1"
                          onClick={() => setQty(line.id, line.qty - 1)}
                          className={stepper}
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="+1"
                          onClick={() => setQty(line.id, line.qty + 1)}
                          disabled={line.qty >= 99}
                          className={stepper}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(line.id)}
                        className="min-h-9 text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)] hover:text-[color:var(--shop-accent)]"
                      >
                        {removeLabel}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[color:var(--shop-border)] px-5 py-5">
          <p className="flex justify-between text-sm text-[color:var(--shop-muted)]">
            <span>{totalLabel}</span>
            <span className="text-lg font-medium tabular-nums text-[color:var(--shop-fg)]">
              {formatShopPrice(total, currency)}
            </span>
          </p>
          {lines.length > 0 && (
            <Link
              to="/checkout"
              onClick={closeDrawer}
              className="mt-4 block border-2 border-[color:var(--shop-fg)] px-6 py-3 text-center text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)]"
              style={{ borderRadius: 'var(--shop-radius)' }}
            >
              {checkoutLabel}
            </Link>
          )}
        </div>
      </aside>
    </div>
  )
}
