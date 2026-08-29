import { Link } from 'react-router-dom'
import {
  DEMO_PRODUCTS,
  defaultVariant,
  formatShopPrice,
} from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'
import { shopThemeVars } from '../../../lib/shop/theme'

/**
 * ProductGrid — catalog strip for the scroll story.
 * PDP / cart / checkout live on separate routes (see ShopChrome + packaging).
 *
 * `theme` picks a template palette (or `auto` = neighbour / market tokens).
 */
export default function ProductGrid({
  theme = 'auto',
  eyebrow = 'Shop',
  title = 'The drop',
  body = 'Placeholder products. Replace names, prices and images with yours.',
}) {
  const addItem = useShopCart((s) => s.addItem)

  return (
    <section
      className="bg-[color:var(--shop-bg)] px-5 py-16 text-[color:var(--shop-fg)] md:px-10 md:py-24"
      style={shopThemeVars(theme)}
      data-shop-theme={theme}
    >
      <p className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 max-w-[16ch] text-[clamp(2rem,5vw,4rem)] leading-[0.95] font-medium tracking-[-0.03em] text-[color:var(--shop-fg)]">
        {title}
      </h2>
      <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-[color:var(--shop-muted)] md:text-base">
        {body}
      </p>

      <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_PRODUCTS.map((product) => (
          <li key={product.id}>
            <Link
              to={`/product/${product.id}`}
              className="group block w-full text-left transition-opacity hover:opacity-100"
            >
              <div className="aspect-4/5 overflow-hidden border border-[color:var(--shop-border)] bg-[color:var(--shop-bg)]">
                <img
                  src={product.img}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <p className="text-base font-medium tracking-[-0.01em] text-[color:var(--shop-fg)]">
                  {product.name}
                </p>
                <p className="text-sm text-[color:var(--shop-muted)]">
                  {formatShopPrice(product.price, product.currency)}
                </p>
              </div>
              <p className="mt-1 text-sm text-[color:var(--shop-muted)]">
                {product.blurb}
              </p>
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => addItem(product.id, 1, defaultVariant(product))}
                className="border border-[color:var(--shop-border)] px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-fg)] transition-colors hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)]"
                style={{ borderRadius: 'var(--shop-radius)' }}
              >
                Add
              </button>
              {/* Quick-add takes the first option; the full picker lives on
                  the product page (not every product has one — see PDP). */}
              {product.variants ? (
                <span className="text-[11px] text-[color:var(--shop-muted)]">
                  {defaultVariant(product)} · pick {product.variants.label.toLowerCase()} on the page
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
