import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatShopPrice } from '../../../lib/shop/products'
import { useShopCart } from '../../../lib/shop/cartStore'
import { createCheckout } from '../../../lib/shop/checkoutAdapter'

const num = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const lines2 = (value) =>
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

function Field({ id, label, children }) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)]">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'mt-2 w-full border border-[color:var(--shop-border)] bg-transparent px-3 py-2.5 text-sm text-[color:var(--shop-fg)] outline-none transition-colors placeholder:text-[color:var(--shop-muted)] focus-visible:border-[color:var(--shop-accent)]'

function RadioCard({ name, value, checked, onChange, title, note, price }) {
  return (
    <label
      className="ui-press flex cursor-pointer items-start gap-3 border border-[color:var(--shop-border)] p-4 has-[:checked]:border-[color:var(--shop-accent)] has-[:focus-visible]:border-[color:var(--shop-accent)]"
      style={{ borderRadius: 'var(--shop-radius)' }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 accent-[color:var(--shop-accent)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {note && (
          <span className="mt-0.5 block text-xs text-[color:var(--shop-muted)]">
            {note}
          </span>
        )}
      </span>
      {price != null && (
        <span className="shrink-0 text-sm text-[color:var(--shop-muted)]">
          {price}
        </span>
      )}
    </label>
  )
}

/**
 * Checkout — page at /checkout (not a scroll section).
 * Left: contact / shipping / delivery / payment. Right: sticky order summary
 * with thumbnails. Every label is a prop so the builder can rewrite the screen.
 */
export default function Checkout({
  backLabel = 'Back to shop',
  stepsText = 'Cart\nInformation\nPayment',
  eyebrow = 'Checkout',
  title = 'Almost there',
  body = 'Placeholder checkout. Payments run through your provider — this kit ships with a mock adapter, so swap createCheckout() for Mercado Pago or Stripe.',
  contactTitle = 'Contact',
  emailLabel = 'Email',
  emailPlaceholder = 'you@example.com',
  phoneLabel = 'Phone (optional)',
  shippingTitle = 'Shipping address',
  firstNameLabel = 'First name',
  lastNameLabel = 'Last name',
  addressLabel = 'Address',
  cityLabel = 'City',
  zipLabel = 'Postal code',
  countryLabel = 'Country',
  countryOptionsText = 'Argentina\nChile\nUruguay\nMexico\nSpain',
  notesLabel = 'Order notes (optional)',
  deliveryTitle = 'Delivery',
  standardLabel = 'Standard',
  standardNote = '3 – 5 business days',
  expressLabel = 'Express',
  expressNote = '24 – 48 hs',
  paymentTitle = 'Payment',
  payCardLabel = 'Card',
  payCardNote = 'Demo only — no card data is collected.',
  payWalletLabel = 'Wallet / Mercado Pago',
  payWalletNote = 'Redirects to your provider once wired.',
  payTransferLabel = 'Bank transfer',
  payTransferNote = 'Instructions sent by email.',
  summaryTitle = 'Order summary',
  emptyLabel = 'Your cart is empty.',
  emptyCta = 'Back to the shop',
  qtyLabel = 'Quantity',
  removeLabel = 'Remove',
  promoLabel = 'Discount code',
  promoPlaceholder = 'CODE',
  promoApplyLabel = 'Apply',
  promoCode = 'DEMO10',
  promoOff = '10',
  promoOkText = 'Code applied.',
  promoErrorText = 'That code is not valid.',
  subtotalLabel = 'Subtotal',
  shippingLabel = 'Shipping',
  discountLabel = 'Discount',
  totalLabel = 'Total',
  freeLabel = 'Free',
  shippingFlat = '4500',
  expressPrice = '9900',
  freeShippingOver = '60000',
  payLabel = 'Pay now',
  payingLabel = 'Processing…',
  trustText = 'Encrypted checkout\n30-day returns\nSupport in 24 hs',
  successTitle = 'Order received',
  successBody = 'This is the mock adapter response. Wire createCheckout() to your provider to charge for real.',
  successCta = 'Keep shopping',
}) {
  const uid = useId()
  const lines = useShopCart((s) => s.lines)
  const setQty = useShopCart((s) => s.setQty)
  const removeItem = useShopCart((s) => s.removeItem)
  const clear = useShopCart((s) => s.clear)

  const [delivery, setDelivery] = useState('standard')
  const [payment, setPayment] = useState('card')
  const [promoInput, setPromoInput] = useState('')
  const [promoState, setPromoState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const currency = lines[0]?.currency || 'ARS'
  const steps = lines2(stepsText)
  const countries = lines2(countryOptionsText)
  const trust = lines2(trustText)

  const totals = useMemo(() => {
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0)
    const off = promoState === 'ok' ? Math.round((subtotal * num(promoOff)) / 100) : 0
    const net = subtotal - off
    const freeOver = num(freeShippingOver)
    const flat = num(shippingFlat)
    const shipping =
      lines.length === 0
        ? 0
        : delivery === 'express'
          ? num(expressPrice)
          : freeOver > 0 && net >= freeOver
            ? 0
            : flat
    return { subtotal, off, shipping, total: Math.max(0, net + shipping) }
  }, [
    lines,
    promoState,
    promoOff,
    delivery,
    expressPrice,
    shippingFlat,
    freeShippingOver,
  ])

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoState(code === String(promoCode).trim().toUpperCase() ? 'ok' : 'error')
  }

  const pay = async (event) => {
    event.preventDefault()
    if (lines.length === 0) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await createCheckout({
        items: lines,
        delivery,
        payment,
        total: totals.total,
      })
      setResult(res)
      if (res?.ok) clear()
    } catch (err) {
      setError(err?.message || 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  const money = (value) => formatShopPrice(value, currency)

  return (
    <section className="min-h-svh bg-[color:var(--shop-bg)] px-5 pt-10 pb-28 text-[color:var(--shop-fg)] md:px-10 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--shop-border)] pb-5">
          <Link
            to="/"
            className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)] transition-colors hover:text-[color:var(--shop-fg)]"
          >
            ← {backLabel}
          </Link>
          <ol className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[color:var(--shop-muted)]">
            {steps.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden="true">/</span>}
                <span
                  className={
                    i === steps.length - 1
                      ? 'text-[color:var(--shop-fg)]'
                      : undefined
                  }
                  aria-current={i === steps.length - 1 ? 'step' : undefined}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <header className="mt-10 max-w-[52ch]">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] font-medium tracking-[-0.03em]">
            {result?.ok ? successTitle : title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[color:var(--shop-muted)] md:text-base">
            {result?.ok ? successBody : body}
          </p>
        </header>

        {result?.ok ? (
          <div
            role="status"
            className="mt-10 max-w-lg border border-[color:var(--shop-border)] p-6"
            style={{ borderRadius: 'var(--shop-radius)' }}
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
              {result.orderId}
            </p>
            <p className="mt-3 text-sm leading-relaxed">{result.message}</p>
            <Link
              to="/"
              className="ui-press mt-6 inline-block border-2 border-[color:var(--shop-fg)] px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)]"
              style={{ borderRadius: 'var(--shop-radius)' }}
            >
              {successCta}
            </Link>
          </div>
        ) : (
          <form
            onSubmit={pay}
            className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16"
          >
            <div className="min-w-0 space-y-12">
              <fieldset className="space-y-5">
                <legend className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
                  {contactTitle}
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id={`${uid}-email`} label={emailLabel}>
                    <input
                      id={`${uid}-email`}
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={emailPlaceholder}
                      className={inputClass}
                      style={{ borderRadius: 'var(--shop-radius)' }}
                    />
                  </Field>
                  <Field id={`${uid}-phone`} label={phoneLabel}>
                    <input
                      id={`${uid}-phone`}
                      type="tel"
                      autoComplete="tel"
                      className={inputClass}
                      style={{ borderRadius: 'var(--shop-radius)' }}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="space-y-5">
                <legend className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
                  {shippingTitle}
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id={`${uid}-first`} label={firstNameLabel}>
                    <input
                      id={`${uid}-first`}
                      required
                      autoComplete="given-name"
                      className={inputClass}
                      style={{ borderRadius: 'var(--shop-radius)' }}
                    />
                  </Field>
                  <Field id={`${uid}-last`} label={lastNameLabel}>
                    <input
                      id={`${uid}-last`}
                      required
                      autoComplete="family-name"
                      className={inputClass}
                      style={{ borderRadius: 'var(--shop-radius)' }}
                    />
                  </Field>
                </div>
                <Field id={`${uid}-address`} label={addressLabel}>
                  <input
                    id={`${uid}-address`}
                    required
                    autoComplete="street-address"
                    className={inputClass}
                    style={{ borderRadius: 'var(--shop-radius)' }}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field id={`${uid}-city`} label={cityLabel}>
                    <input
                      id={`${uid}-city`}
                      required
                      autoComplete="address-level2"
                      className={inputClass}
                      style={{ borderRadius: 'var(--shop-radius)' }}
                    />
                  </Field>
                  <Field id={`${uid}-zip`} label={zipLabel}>
                    <input
                      id={`${uid}-zip`}
                      required
                      autoComplete="postal-code"
                      className={inputClass}
                      style={{ borderRadius: 'var(--shop-radius)' }}
                    />
                  </Field>
                  <Field id={`${uid}-country`} label={countryLabel}>
                    <select
                      id={`${uid}-country`}
                      autoComplete="country-name"
                      className={inputClass}
                      // El popup nativo no hereda las CSS vars del tema: sobre
                      // paletas oscuras quedaría texto claro sobre blanco.
                      style={{
                        borderRadius: 'var(--shop-radius)',
                        backgroundColor: 'var(--shop-bg)',
                        color: 'var(--shop-fg)',
                      }}
                    >
                      {countries.map((country) => (
                        <option
                          key={country}
                          value={country}
                          style={{
                            backgroundColor: 'var(--shop-bg)',
                            color: 'var(--shop-fg)',
                          }}
                        >
                          {country}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field id={`${uid}-notes`} label={notesLabel}>
                  <textarea
                    id={`${uid}-notes`}
                    rows={3}
                    className={`${inputClass} resize-y`}
                    style={{ borderRadius: 'var(--shop-radius)' }}
                  />
                </Field>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
                  {deliveryTitle}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <RadioCard
                    name={`${uid}-delivery`}
                    value="standard"
                    checked={delivery === 'standard'}
                    onChange={setDelivery}
                    title={standardLabel}
                    note={standardNote}
                    price={
                      num(shippingFlat) === 0 ? freeLabel : money(num(shippingFlat))
                    }
                  />
                  <RadioCard
                    name={`${uid}-delivery`}
                    value="express"
                    checked={delivery === 'express'}
                    onChange={setDelivery}
                    title={expressLabel}
                    note={expressNote}
                    price={money(num(expressPrice))}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
                  {paymentTitle}
                </legend>
                <div className="space-y-3">
                  <RadioCard
                    name={`${uid}-payment`}
                    value="card"
                    checked={payment === 'card'}
                    onChange={setPayment}
                    title={payCardLabel}
                    note={payCardNote}
                  />
                  <RadioCard
                    name={`${uid}-payment`}
                    value="wallet"
                    checked={payment === 'wallet'}
                    onChange={setPayment}
                    title={payWalletLabel}
                    note={payWalletNote}
                  />
                  <RadioCard
                    name={`${uid}-payment`}
                    value="transfer"
                    checked={payment === 'transfer'}
                    onChange={setPayment}
                    title={payTransferLabel}
                    note={payTransferNote}
                  />
                </div>
              </fieldset>
            </div>

            <aside className="lg:sticky lg:top-8">
              <div
                className="border border-[color:var(--shop-border)] p-6"
                style={{ borderRadius: 'var(--shop-radius)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--shop-muted)]">
                  {summaryTitle}
                </p>

                {lines.length === 0 ? (
                  <div className="mt-5">
                    <p className="text-sm text-[color:var(--shop-muted)]">
                      {emptyLabel}
                    </p>
                    <Link
                      to="/"
                      className="mt-3 inline-block text-[11px] uppercase tracking-[0.2em] underline underline-offset-4 hover:text-[color:var(--shop-accent)]"
                    >
                      {emptyCta}
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-5 divide-y divide-[color:var(--shop-border)] border-y border-[color:var(--shop-border)]">
                    {lines.map((line) => (
                      <li key={line.productId} className="flex gap-4 py-4">
                        <img
                          src={line.img}
                          alt=""
                          loading="lazy"
                          className="size-16 shrink-0 border border-[color:var(--shop-border)] object-cover"
                          style={{ borderRadius: 'var(--shop-radius)' }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate text-sm font-medium">
                              {line.name}
                            </p>
                            <p className="shrink-0 text-sm">
                              {money(line.price * line.qty)}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div
                              className="flex items-center border border-[color:var(--shop-border)]"
                              style={{ borderRadius: 'var(--shop-radius)' }}
                            >
                              <button
                                type="button"
                                aria-label={`${qtyLabel} −`}
                                onClick={() => setQty(line.productId, line.qty - 1)}
                                className="ui-press px-2.5 py-1 text-sm hover:text-[color:var(--shop-accent)]"
                              >
                                −
                              </button>
                              <span className="min-w-6 text-center text-sm tabular-nums">
                                {line.qty}
                              </span>
                              <button
                                type="button"
                                aria-label={`${qtyLabel} +`}
                                onClick={() => setQty(line.productId, line.qty + 1)}
                                className="ui-press px-2.5 py-1 text-sm hover:text-[color:var(--shop-accent)]"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(line.productId)}
                              className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)] hover:text-[color:var(--shop-accent)]"
                            >
                              {removeLabel}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5">
                  <label
                    htmlFor={`${uid}-promo`}
                    className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--shop-muted)]"
                  >
                    {promoLabel}
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id={`${uid}-promo`}
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value)
                        setPromoState(null)
                      }}
                      placeholder={promoPlaceholder}
                      className={`${inputClass} mt-0 flex-1 uppercase`}
                      style={{ borderRadius: 'var(--shop-radius)' }}
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      className="ui-press border border-[color:var(--shop-border)] px-4 text-[11px] uppercase tracking-[0.2em] hover:border-[color:var(--shop-accent)] hover:bg-[color:var(--shop-accent)] hover:text-[color:var(--shop-accent-fg)]"
                      style={{ borderRadius: 'var(--shop-radius)' }}
                    >
                      {promoApplyLabel}
                    </button>
                  </div>
                  {promoState && (
                    <p
                      role="status"
                      className="mt-2 text-xs text-[color:var(--shop-muted)]"
                    >
                      {promoState === 'ok' ? promoOkText : promoErrorText}
                    </p>
                  )}
                </div>

                <dl className="mt-6 space-y-2 border-t border-[color:var(--shop-border)] pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--shop-muted)]">
                      {subtotalLabel}
                    </dt>
                    <dd className="tabular-nums">{money(totals.subtotal)}</dd>
                  </div>
                  {totals.off > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[color:var(--shop-muted)]">
                        {discountLabel}
                      </dt>
                      <dd className="tabular-nums text-[color:var(--shop-accent)]">
                        −{money(totals.off)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--shop-muted)]">
                      {shippingLabel}
                    </dt>
                    <dd className="tabular-nums">
                      {totals.shipping === 0 ? freeLabel : money(totals.shipping)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[color:var(--shop-border)] pt-3 text-base font-medium">
                    <dt>{totalLabel}</dt>
                    <dd className="tabular-nums">{money(totals.total)}</dd>
                  </div>
                </dl>

                <button
                  type="submit"
                  disabled={busy || lines.length === 0}
                  className="ui-press mt-6 w-full border-2 border-[color:var(--shop-fg)] px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] not-disabled:hover:border-[color:var(--shop-accent)] not-disabled:hover:bg-[color:var(--shop-accent)] not-disabled:hover:text-[color:var(--shop-accent-fg)] disabled:opacity-40"
                  style={{ borderRadius: 'var(--shop-radius)' }}
                >
                  {busy ? payingLabel : payLabel}
                </button>

                {error && (
                  <p className="mt-3 text-sm text-[color:var(--shop-accent)]" role="alert">
                    {error}
                  </p>
                )}

                {trust.length > 0 && (
                  <ul className="mt-5 space-y-1.5 text-[11px] text-[color:var(--shop-muted)]">
                    {trust.map((item) => (
                      <li key={item}>— {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </form>
        )}
      </div>
    </section>
  )
}
