import { Link } from 'react-router-dom'
import { useShopCart } from '../../../lib/shop/cartStore'
import CartDrawer from './CartDrawer'

/**
 * Floating cart control + drawer. Mounted on every shop route in packed ZIPs
 * and in the builder preview when the composition includes ProductGrid. The
 * two button labels are props; the rest go to the drawer.
 */
export default function ShopChrome({ buttonLabel = 'Cart', checkoutLinkLabel = 'Checkout', ...drawer }) {
  const count = useShopCart((s) => s.count())
  const openDrawer = useShopCart((s) => s.openDrawer)

  return (
    <>
      {/* `--builder-panel`: en el builder, el ancho del panel de edición abierto. */}
      <div
        className="fixed right-5 bottom-5 z-40 flex items-center gap-2"
        style={{ right: 'calc(1.25rem + var(--builder-panel, 0px))' }}
      >
        {count > 0 && (
          <Link
            to="/checkout"
            className="border-2 border-[color:var(--shop-fg)] bg-[color:var(--shop-bg)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--shop-fg)] shadow-sm transition-colors hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)]"
            style={{ borderRadius: 'var(--shop-radius)' }}
          >
            {checkoutLinkLabel}
          </Link>
        )}
        <button
          type="button"
          onClick={openDrawer}
          aria-haspopup="dialog"
          className="ui-press border-2 border-[color:var(--shop-accent)] bg-[color:var(--shop-accent)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--shop-accent-fg)] shadow-sm"
          style={{ borderRadius: 'var(--shop-radius)' }}
        >
          {buttonLabel}
          {count > 0 ? ` (${count})` : ''}
        </button>
      </div>
      <CartDrawer {...drawer} />
    </>
  )
}
