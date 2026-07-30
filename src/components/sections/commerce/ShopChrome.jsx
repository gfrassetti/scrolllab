import { Link } from 'react-router-dom'
import { useShopCart } from '../../../lib/shop/cartStore'
import CartDrawer from './CartDrawer'

/**
 * Floating cart control + drawer. Mounted on every shop route in packed ZIPs
 * and in the builder preview when the composition includes ProductGrid.
 */
export default function ShopChrome() {
  const count = useShopCart((s) => s.count())
  const openDrawer = useShopCart((s) => s.openDrawer)

  return (
    <>
      <div className="fixed right-5 bottom-5 z-40 flex items-center gap-2">
        <Link
          to="/checkout"
          className="border-2 border-ink bg-bone px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-ink shadow-sm transition-colors hover:bg-ink hover:text-bone"
        >
          Checkout
        </Link>
        <button
          type="button"
          onClick={openDrawer}
          className="border-2 border-ink bg-ink px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-bone shadow-sm"
        >
          Cart{count > 0 ? ` (${count})` : ''}
        </button>
      </div>
      <CartDrawer />
    </>
  )
}
