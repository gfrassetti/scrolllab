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
    <section className="px-5 py-16 md:px-10 md:py-24">
      <Link
        to="/"
        className="text-[11px] uppercase tracking-[0.25em] text-ink/50 transition-colors hover:text-ink"
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
            className="mt-8 inline-block border-2 border-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone"
          >
            View catalog
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div className="aspect-4/5 overflow-hidden border border-ink/15">
            <img
              src={product.img}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[clamp(2rem,5vw,4rem)] leading-[0.95] font-medium tracking-[-0.03em]">
              {product.name}
            </h1>
            <p className="mt-4 text-lg text-ink/70">
              {formatShopPrice(product.price, product.currency)}
            </p>
            <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-ink/65 md:text-base">
              {product.blurb}
            </p>
            <button
              type="button"
              onClick={() => addItem(product.id)}
              className="mt-8 border-2 border-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone"
            >
              {cta}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
