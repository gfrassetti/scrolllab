import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { priceCartLines, takeCheckoutIntent, useCart } from '../lib/cart'
import {
  clearCoupon,
  formatCouponDate,
  loadCoupon,
  saveCoupon,
} from '../lib/coupon'
import { startCheckout } from '../lib/startCheckout'
import { cartItemPreviewHref } from '../lib/orderPreview'
import { useFxRate } from '../lib/fx'
import { formatArs, formatUsd } from '../lib/pricing'
import { useI18n } from '../i18n'
import ProductThumbnail from '../components/ProductThumbnail'

/** Status de la API → texto (el servidor habla español; la UI puede estar en inglés). */
const COUPON_ERRORS = {
  404: 'cart.couponErrInvalid',
  409: 'cart.couponErrUsed',
  410: 'cart.couponErrExpired',
  422: 'cart.couponErrFirst',
}

/** El cupón existe pero es de otro mail (el `code` lo manda el servidor). */
const COUPON_OTHER_ACCOUNT = 'coupon_other_account'

function otherAccountMessage(t, err) {
  const email = err.details?.emailHint
  return email ? t('cart.couponErrOtherFor', { email }) : t('cart.couponErrOther')
}

export default function CartPage() {
  const { user, loading: authLoading, hadSession } = useAuth()
  const looksLoggedIn = user ? true : authLoading ? hadSession : false
  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.removeItem)
  const clearCart = useCart((s) => s.clear)
  const [catalog, setCatalog] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { rate } = useFxRate()
  const { t, locale } = useI18n()
  const showUsd = locale === 'en'

  // Cupón de bienvenida: `coupon` es lo que el servidor ya validó.
  const [coupon, setCoupon] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)
  // Con un cupón guardado esperamos su chequeo antes de retomar un pago
  // pendiente: si no, el pago saldría sin descuento.
  const [couponReady, setCouponReady] = useState(() => !loadCoupon())

  useEffect(() => {
    api
      .catalog()
      .then((data) => {
        const map = {}
        for (const p of data.products || []) map[p.sku] = p
        setCatalog(map)
      })
      .catch(() => {})
  }, [])

  const applyCoupon = useCallback(
    async (raw, { silent = false } = {}) => {
      const code = String(raw || '').trim()
      if (!code) return
      setCouponBusy(true)
      setCouponError('')
      try {
        const data = await api.couponCheck(code)
        setCoupon({
          code: data.code,
          percent: data.percent,
          expiresAt: data.expiresAt,
          emailHint: data.emailHint,
        })
        saveCoupon(data)
        setCouponInput('')
      } catch (err) {
        setCoupon(null)
        if (err.code === COUPON_OTHER_ACCOUNT) {
          // Es de otro mail: se avisa con qué cuenta entrar y no se descarta,
          // porque puede cambiar de cuenta.
          setCouponError(otherAccountMessage(t, err))
        } else {
          // Un cupón guardado que ya no sirve se descarta.
          if (COUPON_ERRORS[err.status]) clearCoupon()
          if (!silent) {
            setCouponError(t(COUPON_ERRORS[err.status] || 'cart.couponErrGeneric'))
          }
        }
      } finally {
        setCouponBusy(false)
      }
    },
    [t],
  )

  // Cupón guardado (de la home o del link del mail): se aplica solo, una vez.
  const couponInit = useRef(false)
  useEffect(() => {
    if (couponInit.current) return
    couponInit.current = true
    const saved = loadCoupon()
    if (!saved) return
    applyCoupon(saved.code, { silent: true }).finally(() => setCouponReady(true))
  }, [applyCoupon])

  const removeCoupon = () => {
    setCoupon(null)
    setCouponError('')
    clearCoupon()
  }

  const { lines, total, payable, discount } = priceCartLines({
    items,
    catalog,
    rate,
    showUsd,
    coupon,
  })
  const formatLine = (amount) => {
    if (amount == null) return '—'
    return showUsd ? formatUsd(amount) : formatArs(amount)
  }

  const checkout = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const result = await startCheckout({
        items,
        user,
        navigate,
        couponCode: coupon?.code,
      })
      // redirect a MP: dejamos busy. login: liberamos por si vuelve con atrás.
      if (result !== 'redirect') setBusy(false)
    } catch (err) {
      if (coupon && err.code === COUPON_OTHER_ACCOUNT) {
        setCoupon(null)
        setError(otherAccountMessage(t, err))
      } else if (coupon && COUPON_ERRORS[err.status]) {
        // El cupón dejó de valer entre el chequeo y el pago: se saca y se avisa.
        setCoupon(null)
        clearCoupon()
        setError(t(COUPON_ERRORS[err.status]))
      } else {
        setError(err.message)
      }
      setBusy(false)
    }
  }, [items, navigate, user, coupon, t])

  // Volvió del login con el pago ya pedido: sigue derecho a Mercado Pago.
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current || !user || items.length === 0 || !couponReady) return
    if (!takeCheckoutIntent()) return
    resumed.current = true
    checkout()
  }, [user, items.length, checkout, couponReady])

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="px-5 py-12 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
          {t('cart.eyebrow')}
        </p>
        <h1 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em]">
          {t('cart.title')}
        </h1>

        {error && (
          <p className="mt-6 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className="mt-12 border-2 border-dashed border-ink/20 p-10 text-center">
            <p className="text-sm text-ink/50">{t('common.cartEmpty')}</p>
            <Link
              to="/#templates"
              className="mt-4 inline-block text-xs uppercase tracking-[0.25em] hover:text-accent"
            >
              {t('common.seeTemplates')}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-10 border-t border-ink/15">
              {lines.map((line) => {
                const previewHref = cartItemPreviewHref(line)
                return (
                  <li
                    key={line.sku}
                    className="flex flex-col gap-3 border-b border-ink/15 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <ProductThumbnail
                        sku={line.sku}
                        title={line.title}
                        className="h-16 w-20 sm:h-20 sm:w-24"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{line.title}</p>
                        <p className="truncate text-[11px] uppercase tracking-[0.2em] text-ink/40">
                          {line.sku}
                        </p>
                        {line.unit_price != null && (
                          <p className="mt-1 text-sm text-ink/70">
                            {line.discounted_price != null ? (
                              <>
                                <span className="text-ink/40 line-through">
                                  {formatLine(line.unit_price)}
                                </span>{' '}
                                <span className="text-ink">
                                  {formatLine(line.discounted_price)}
                                </span>
                              </>
                            ) : (
                              formatLine(line.unit_price)
                            )}
                          </p>
                        )}
                        {previewHref && (
                          <Link
                            to={previewHref}
                            className="mt-1 inline-block text-[11px] uppercase tracking-[0.2em] text-accent-ink underline-offset-4 hover:underline"
                          >
                            {t('cart.preview')} ↗
                          </Link>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(line.sku)}
                      className="min-h-10 self-start border border-ink/30 px-4 py-2 text-xs hover:border-accent hover:bg-accent hover:text-bone sm:self-auto"
                    >
                      {t('common.remove')}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-8 border border-ink/15 p-6">
              {coupon ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                      {t('cart.couponLabel')}
                    </span>{' '}
                    <strong data-coupon-applied className="font-mono tracking-[0.1em]">
                      {coupon.code}
                    </strong>{' '}
                    <span className="text-ink/60">
                      · {t('cart.couponAppliedPct', { percent: coupon.percent })}
                      {coupon.expiresAt
                        ? ` · ${t('cart.couponUntil', { date: formatCouponDate(coupon.expiresAt, locale) })}`
                        : ''}
                      {coupon.emailHint
                        ? ` · ${t('cart.couponFor', { email: coupon.emailHint })}`
                        : ''}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    disabled={busy}
                    className="text-[11px] uppercase tracking-[0.2em] text-ink/60 underline underline-offset-4 transition-colors hover:text-accent disabled:opacity-40"
                  >
                    {t('cart.couponRemove')}
                  </button>
                </div>
              ) : (
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault()
                    applyCoupon(couponInput)
                  }}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5"
                >
                  <div className="flex-1">
                    <label
                      htmlFor="cart-coupon"
                      className="text-[11px] uppercase tracking-[0.25em] text-ink/50"
                    >
                      {t('cart.couponLabel')}
                    </label>
                    <input
                      id="cart-coupon"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.slice(0, 40))
                        if (couponError) setCouponError('')
                      }}
                      placeholder={t('cart.couponPlaceholder')}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      disabled={couponBusy}
                      className="mt-1 w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3 font-mono text-base uppercase tracking-[0.1em] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-accent disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={couponBusy || !couponInput.trim()}
                    className="min-h-11 border border-ink/30 px-5 py-3 text-[11px] uppercase tracking-[0.25em] text-ink/70 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                  >
                    {couponBusy ? t('cart.couponApplying') : t('cart.couponApply')}
                  </button>
                </form>
              )}
              {couponError ? (
                <p role="alert" className="mt-3 text-sm text-accent-ink">
                  {couponError}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-4 border border-ink/15 p-6 md:flex-row md:items-center md:justify-between">
              <p className="text-sm">
                {coupon && discount > 0 ? (
                  <>
                    <span className="block text-ink/60">
                      {t('cart.couponSubtotal')}: {formatLine(total)}
                    </span>
                    <span data-coupon-discount className="mb-2 block text-accent-ink">
                      {t('cart.couponDiscount', {
                        code: coupon.code,
                        percent: coupon.percent,
                      })}
                      : −{formatLine(discount)}
                    </span>
                  </>
                ) : null}
                {t('common.estimatedTotal')}:{' '}
                <strong>{formatLine(payable)}</strong>
                <span className="mt-2 block text-xs text-ink/55">
                  {t('cart.trustNote')}
                </span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => clearCart()}
                  className="min-h-11 border border-ink/30 px-5 py-3 text-[11px] uppercase tracking-[0.25em] text-ink/70 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                >
                  {t('cart.clearAll')}
                </button>
                <button
                  type="button"
                  disabled={busy || authLoading}
                  onClick={checkout}
                  className="border-2 border-ink bg-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-bone transition-colors hover:border-accent hover:bg-accent disabled:opacity-40"
                >
                  {looksLoggedIn
                    ? busy
                      ? t('cart.redirecting')
                      : t('cart.payLoggedIn')
                    : t('cart.payLoggedOut')}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
