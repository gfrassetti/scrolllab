import { Link } from 'react-router-dom'
import { DEMO_PRODUCTS, formatShopPrice } from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'

/**
 * ProductGrid — catalog strip for the scroll story.
 * PDP / cart / checkout live on separate routes (see ShopChrome + packaging).
 */
export default function ProductGrid({
  eyebrow = 'Shop',
  title = 'The drop',
  body = 'Placeholder products. Replace names, prices and images with yours.',
}) {
  const addItem = useShopCart((s) => s.addItem)

  return (
    <section className="px-5 py-16 md:px-10 md:py-24">
      <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
        {eyebrow}
      </p>
      <h2 className="mt-3 max-w-[16ch] text-[clamp(2rem,5vw,4rem)] leading-[0.95] font-medium tracking-[-0.03em]">
        {title}
      </h2>
      <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-ink/65 md:text-base">
        {body}
      </p>

      <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_PRODUCTS.map((product) => (
          <li key={product.id}>
            <Link
              to={`/product/${product.id}`}
              className="group block w-full text-left transition-opacity hover:opacity-100"
            >
              <div className="aspect-4/5 overflow-hidden border border-ink/15">
                <img
                  src={product.img}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <p className="text-base font-medium tracking-[-0.01em]">
                  {product.name}
                </p>
                <p className="text-sm text-ink/60">
                  {formatShopPrice(product.price, product.currency)}
                </p>
              </div>
              <p className="mt-1 text-sm text-ink/55">{product.blurb}</p>
            </Link>
            <button
              type="button"
              onClick={() => addItem(product.id)}
              className="mt-4 border border-ink/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] transition-colors hover:border-ink hover:bg-ink hover:text-bone"
            >
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
