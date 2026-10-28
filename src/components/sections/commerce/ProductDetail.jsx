import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { defaultVariant, formatShopPrice } from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'
import { useShopCatalog, useShopProduct } from '../../../lib/shop/ShopCatalog'

const LAYOUTS = new Set(['classic', 'gallery', 'centered'])

const btn =
  'border-2 border-[color:var(--shop-fg)] px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)] disabled:pointer-events-none disabled:opacity-40'
const micro = 'text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)]'

/** Abre y cierra con alto + opacidad (nada aparece de golpe). */
function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[color:var(--shop-border)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-4 text-left text-sm font-medium"
      >
        {title}
        <span aria-hidden="true" className={`text-lg leading-none transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <div className="pb-5 text-sm leading-relaxed text-[color:var(--shop-muted)]">{children}</div>
        </div>
      </div>
    </div>
  )
}

/** Foto principal y miniaturas (o todas apiladas en el modelo «gallery»). */
function Gallery({ images, name, stacked }) {
  const [active, setActive] = useState(0)
  useEffect(() => setActive(0), [images])
  const frame = 'overflow-hidden border border-[color:var(--shop-border)]'
  if (stacked) {
    return (
      <div className="grid gap-4">
        {images.map((src, i) => (
          <div key={src + i} className={`aspect-4/5 ${frame}`} style={{ borderRadius: 'var(--shop-radius)' }}>
            <img src={src} alt={i === 0 ? name : ''} className="h-full w-full object-cover" loading={i ? 'lazy' : 'eager'} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div>
      <div className={`aspect-4/5 ${frame}`} style={{ borderRadius: 'var(--shop-radius)' }}>
        <img key={images[active]} src={images[active]} alt={name} className="ui-fade-in h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-3">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={`${name} — ${i + 1}`}
              aria-current={active === i}
              onClick={() => setActive(i)}
              className={`size-16 overflow-hidden border transition-opacity ${
                active === i ? 'border-[color:var(--shop-fg)]' : 'border-[color:var(--shop-border)] opacity-60 hover:opacity-100'
              }`}
              style={{ borderRadius: 'var(--shop-radius)' }}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * ProductDetail — PDP page at /product/:productId (not a scroll section).
 *
 * Three layouts (`layout`): `classic` (photo left, info right), `gallery`
 * (every photo stacked, info sticky on the side) and `centered`. Everything a
 * product can carry is optional and only renders when present: extra photos
 * (gallery), options as buttons or colour swatches, a badge, sold out, a long
 * description and a spec sheet. Shipping / care copy and the related row are
 * store-wide props. Every label is a prop (the builder edits them as
 * `detail*` on the ProductGrid).
 */
export default function ProductDetail({
  layout = 'classic',
  eyebrow = 'Product',
  fallbackTitle = 'Product not found',
  cta = 'Add to cart',
  backLabel = '← Back',
  catalogLabel = 'View catalog',
  qtyLabel = 'Quantity',
  soldOutLabel = 'Sold out',
  descriptionTitle = 'Description',
  specsTitle = 'Details',
  shippingTitle = 'Shipping & returns',
  shippingText = 'Ships within two working days. Free returns within 30 days, unworn and with the tags on.',
  careTitle = 'Care',
  careText = '',
  relatedTitle = 'You may also like',
  showRelated = 'on',
}) {
  const { productId } = useParams()
  const addItem = useShopCart((s) => s.addItem)
  const product = useShopProduct(productId)
  const catalog = useShopCatalog()
  const [variant, setVariant] = useState(() => defaultVariant(product))
  const [qty, setQty] = useState(1)
  const shape = LAYOUTS.has(layout) ? layout : 'classic'

  // React Router reuses this component across /product/:productId — without
  // this, clicking from one product to another keeps the previous product's
  // selected variant (and quantity) instead of resetting.
  useEffect(() => {
    setVariant(defaultVariant(product))
    setQty(1)
  }, [productId, product])

  const related = showRelated !== 'off' && product ? catalog.filter((p) => p.id !== product.id).slice(0, 3) : []
  const images = product ? (product.images?.length ? product.images : [product.img]) : []
  const swatches = product?.variants?.swatches
  const centered = shape === 'centered'
  // Con Shopify: variantes sin stock (no se pueden elegir) y precio por variante.
  const optionOut = (option) => Boolean(product?.soldOutOptions?.includes(option))
  const unavailable = Boolean(product?.soldOut) || optionOut(variant)
  const price = product?.variantPrices?.[variant] ?? product?.price

  const info = product && (
    <div className={centered ? 'mx-auto max-w-xl text-center' : ''}>
      <div className={`flex items-center gap-3 ${centered ? 'justify-center' : ''}`}>
        <p className={micro}>{eyebrow}</p>
        {product.badge ? (
          <span
            className="border border-[color:var(--shop-accent)] px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] text-[color:var(--shop-accent)]"
            style={{ borderRadius: 'var(--shop-radius)' }}
          >
            {product.badge}
          </span>
        ) : null}
      </div>
      <h1 className="mt-3 text-[clamp(2rem,5vw,4rem)] leading-[0.95] font-medium tracking-[-0.03em]">{product.name}</h1>
      <p className="mt-4 text-lg text-[color:var(--shop-muted)]">{formatShopPrice(price, product.currency)}</p>
      <p className={`mt-4 max-w-[40ch] text-sm leading-relaxed text-[color:var(--shop-muted)] md:text-base ${centered ? 'mx-auto' : ''}`}>
        {product.blurb}
      </p>

      {product.variants ? (
        <fieldset className="mt-6">
          <legend className={micro}>
            {product.variants.label}
            {swatches && variant ? <span className="normal-case tracking-normal"> — {variant}</span> : null}
          </legend>
          <div className={`mt-2 flex flex-wrap gap-2 ${centered ? 'justify-center' : ''}`}>
            {product.variants.options.map((option) =>
              swatches?.[option] ? (
                <label
                  key={option}
                  title={option}
                  className="ui-press grid size-10 cursor-pointer place-items-center rounded-full border border-[color:var(--shop-border)] has-[:checked]:border-[color:var(--shop-fg)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-35"
                >
                  <input type="radio" name="variant" value={option} checked={variant === option} onChange={() => setVariant(option)} disabled={optionOut(option)} className="sr-only" aria-label={option} />
                  <span aria-hidden="true" className="size-7 rounded-full" style={{ backgroundColor: swatches[option] }} />
                </label>
              ) : (
                <label
                  key={option}
                  className="ui-press cursor-pointer border border-[color:var(--shop-border)] px-3 py-1.5 text-sm has-[:checked]:border-[color:var(--shop-accent)] has-[:checked]:bg-[color:var(--shop-accent)] has-[:checked]:text-[color:var(--shop-accent-fg)] has-[:disabled]:cursor-not-allowed has-[:disabled]:line-through has-[:disabled]:opacity-40"
                  style={{ borderRadius: 'var(--shop-radius)' }}
                >
                  <input type="radio" name="variant" value={option} checked={variant === option} onChange={() => setVariant(option)} disabled={optionOut(option)} className="sr-only" />
                  {option}
                </label>
              ),
            )}
          </div>
        </fieldset>
      ) : null}

      <div className={`mt-8 flex flex-wrap items-center gap-3 ${centered ? 'justify-center' : ''}`}>
        <div
          role="group"
          aria-label={qtyLabel}
          className="inline-flex items-center border border-[color:var(--shop-border)]"
          style={{ borderRadius: 'var(--shop-radius)' }}
        >
          <button type="button" aria-label="−1" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || unavailable} className="grid size-11 place-items-center text-lg disabled:opacity-30">
            −
          </button>
          <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button type="button" aria-label="+1" onClick={() => setQty((q) => Math.min(99, q + 1))} disabled={unavailable} className="grid size-11 place-items-center text-lg disabled:opacity-30">
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => addItem(product, qty, variant)}
          disabled={unavailable}
          className={btn}
          style={{ borderRadius: 'var(--shop-radius)' }}
        >
          {unavailable ? soldOutLabel : cta}
        </button>
      </div>

      <div className={`mt-10 border-t border-[color:var(--shop-border)] text-left ${centered ? '' : 'max-w-xl'}`}>
        {product.details ? (
          <Accordion title={descriptionTitle} defaultOpen>
            <p className="whitespace-pre-line">{product.details}</p>
          </Accordion>
        ) : null}
        {product.specs?.length ? (
          <Accordion title={specsTitle} defaultOpen={!product.details}>
            <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-6 gap-y-2">
              {product.specs.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-[color:var(--shop-fg)]">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </Accordion>
        ) : null}
        {shippingText ? (
          <Accordion title={shippingTitle}>
            <p className="whitespace-pre-line">{shippingText}</p>
          </Accordion>
        ) : null}
        {careText ? (
          <Accordion title={careTitle}>
            <p className="whitespace-pre-line">{careText}</p>
          </Accordion>
        ) : null}
      </div>
    </div>
  )

  return (
    <section className="bg-[color:var(--shop-bg)] px-5 py-16 text-[color:var(--shop-fg)] md:px-10 md:py-24" data-pdp-layout={shape}>
      <Link to="/" className={`${micro} tpl-hit relative transition-colors hover:text-[color:var(--shop-fg)]`}>
        {backLabel}
      </Link>

      {!product ? (
        <div className="mt-10">
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-medium tracking-[-0.03em]">{fallbackTitle}</h1>
          <Link to="/" className={`${btn} mt-8 inline-block`} style={{ borderRadius: 'var(--shop-radius)' }}>
            {catalogLabel}
          </Link>
        </div>
      ) : shape === 'gallery' ? (
        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-16">
          <Gallery images={images} name={product.name} stacked />
          <div className="md:sticky md:top-24 md:self-start">{info}</div>
        </div>
      ) : centered ? (
        <div className="mt-10">
          <div className="mx-auto max-w-2xl">
            <Gallery images={images} name={product.name} />
          </div>
          <div className="mt-12">{info}</div>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-start md:gap-16">
          <Gallery images={images} name={product.name} />
          {info}
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-24 border-t border-[color:var(--shop-border)] pt-10">
          <h2 className="text-xl font-medium tracking-[-0.02em]">{relatedTitle}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
            {related.map((p) => (
              <li key={p.id}>
                <Link to={`/product/${p.id}`} className="group block">
                  <div className="aspect-4/5 overflow-hidden border border-[color:var(--shop-border)]" style={{ borderRadius: 'var(--shop-radius)' }}>
                    <img src={p.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[color:var(--shop-muted)]">{formatShopPrice(p.price, p.currency)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
