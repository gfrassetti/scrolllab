import { Link, useParams } from 'react-router-dom'
import { getProduct, formatShopPrice } from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'

/**
 * ProductDetail — PDP page at /product/:productId (not a scroll section).
 */
export default function ProductDetail({
  eyebrow = 'Product',
  fallbackTitle = 'Product not found',
  cta = 'Add to cart',
}) {
  const { productId } = useParams()
  const addItem = useShopCart((s) => s.addItem)
  const product = getProduct(productId)

  return (
    <section className="bg-[color:var(--shop-bg)] px-5 py-16 text-[color:var(--shop-fg)] md:px-10 md:py-24">
      <Link
        to="/"
        className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)] transition-colors hover:text-[color:var(--shop-fg)]"
      >
        ← Back
      </Link>

      {!product ? (
        <div className="mt-10">
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-medium tracking-[-0.03em]">
            {fallbackTitle}
          </h1>
          <Link
            to="/"
            className="mt-8 inline-block border-2 border-[color:var(--shop-fg)] px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)]"
            style={{ borderRadius: 'var(--shop-radius)' }}
          >
            View catalog
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div className="aspect-4/5 overflow-hidden border border-[color:var(--shop-border)]">
            <img
              src={product.img}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[clamp(2rem,5vw,4rem)] leading-[0.95] font-medium tracking-[-0.03em]">
              {product.name}
            </h1>
            <p className="mt-4 text-lg text-[color:var(--shop-muted)]">
              {formatShopPrice(product.price, product.currency)}
            </p>
            <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-[color:var(--shop-muted)] md:text-base">
              {product.blurb}
            </p>
            <button
              type="button"
              onClick={() => addItem(product.id)}
              className="mt-8 border-2 border-[color:var(--shop-fg)] px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)]"
              style={{ borderRadius: 'var(--shop-radius)' }}
            >
              {cta}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
