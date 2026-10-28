import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import Skeleton from '../components/Skeleton'
import Spinner from '../components/Spinner'
import Collapse from '../components/Collapse'
import ClearCartControl from '../components/ClearCartControl'
import { useExitingRemoval } from '../hooks/useExitingRemoval'
import { cartItemKey, cartLineTitle, isCustomSku, priceCartLines, takeCheckoutIntent, useCart } from '../lib/cart'
import { useWelcomeCoupon } from '../lib/welcomeCoupon'
import { startCheckout } from '../lib/startCheckout'
import { cartItemPreviewHref } from '../lib/orderPreview'
import { useFxRate } from '../lib/fx'
import { formatArs, formatUsd } from '../lib/pricing'
import { useI18n } from '../i18n'
import ProductThumbnail from '../components/ProductThumbnail'
import PaymentMethodPicker from '../components/PaymentMethodPicker'
import { usePayRegion, providerForRegion } from '../lib/payRegion'
import { useCurrency } from '../lib/currency'
import { REFUND_DAYS } from '../lib/site'

/**
 * Cuando el servidor rechaza el cupón al pagar: status de la API → texto (el
 * servidor habla español; la UI puede estar en inglés). Lo demás cae en el genérico.
 */
const COUPON_ERRORS = {
  409: 'cart.couponErrUsed',
  410: 'cart.couponErrExpired',
  422: 'cart.couponErrFirst',
}

/** El cupón existe pero es de otro mail (el `code` lo manda el servidor). */
const COUPON_OTHER_ACCOUNT = 'coupon_other_account'

export default function CartPage() {
  const { user, loading: authLoading, hadSession } = useAuth()
  const looksLoggedIn = user ? true : authLoading ? hadSession : false
  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.removeItem)
  const clearCart = useCart((s) => s.clear)
  const [catalog, setCatalog] = useState({})
  // Hasta la primera respuesta del catálogo: skeleton en los montos, no «—».
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { rate } = useFxRate()
  const { t, locale } = useI18n()
  // Con el carril internacional, la moneda la decide desde dónde paga (Argentina
  // → pesos con MP; otro país → USD con Polar). Sin él, como siempre:
  // USD de referencia en inglés y el cobro en pesos.
  const region = usePayRegion((s) => s.region)
  const setRegion = usePayRegion((s) => s.setRegion)
  const intlEnabled = usePayRegion((s) => s.intlEnabled)
  const intlGateway = usePayRegion((s) => s.intl)
  const regionStatus = usePayRegion((s) => s.status)
  const loadRegion = usePayRegion((s) => s.load)
  useEffect(() => {
    loadRegion()
  }, [loadRegion])
  const intl = intlEnabled && region === 'intl'
  const { showUsd } = useCurrency()

  // Cupón de bienvenida: se aplica solo si hay sesión (lo pide WelcomeCouponSync al
  // entrar). Antes de retomar un pago pendiente esperamos su respuesta: si no, el
  // pago saldría sin descuento.
  const welcome = useWelcomeCoupon((s) => s.coupon)
  const welcomeStatus = useWelcomeCoupon((s) => s.status)
  const dropWelcome = useWelcomeCoupon((s) => s.drop)
  const coupon = user ? welcome : null
  const couponReady = !looksLoggedIn || welcomeStatus === 'ready'

  useEffect(() => {
    api
      .catalog()
      .then((data) => {
        const map = {}
        for (const p of data.products || []) map[p.sku] = p
        setCatalog(map)
      })
      .catch(() => {})
      .finally(() => setCatalogLoaded(true))
  }, [])

  // Una fila que se está quitando se cierra con animación: sus montos ya no
  // cuentan en el resumen (el total acompaña al cierre, no llega después).
  const { leaving, remove: removeLine } = useExitingRemoval(removeItem)
  const { lines } = priceCartLines({ items, catalog, rate, showUsd, coupon })
  const live = lines.filter((line) => !leaving.has(cartItemKey(line)))
  const total = live.reduce((sum, l) => sum + (l.unit_price || 0), 0)
  const payable = live.reduce((sum, l) => sum + ((l.discounted_price ?? l.unit_price) || 0), 0)
  const discount = total - payable
  const formatLine = (amount) => {
    // Mientras llegan los precios del servidor: skeleton, no un guion.
    if (amount == null) {
      return catalogLoaded ? '—' : <Skeleton className="inline-block h-[0.9em] w-16 align-middle" />
    }
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
        provider: intlEnabled ? providerForRegion(region, intlGateway) : 'mercadopago',
        locale,
      })
      // redirect a la pasarela: dejamos busy. login: liberamos para que pueda reintentar.
      if (result !== 'redirect') setBusy(false)
    } catch (err) {
      if (coupon && (COUPON_ERRORS[err.status] || err.code === COUPON_OTHER_ACCOUNT || err.status === 404)) {
        // El cupón dejó de valer (lo usó en otra pestaña, venció…): se saca y se avisa.
        dropWelcome()
        setError(t(COUPON_ERRORS[err.status] || 'cart.couponErrGeneric'))
      } else {
        setError(err.message)
      }
      setBusy(false)
    }
  }, [items, navigate, user, coupon, dropWelcome, t, intlEnabled, region, intlGateway, locale])

  // Volvió del login con el pago ya pedido: sigue derecho al pago (cuando ya se
  // sabe por dónde paga, para no abrir Mercado Pago a quien eligió USD).
  const resumed = useRef(false)
  const regionReady = regionStatus === 'ready'
  useEffect(() => {
    if (resumed.current || !user || items.length === 0 || !couponReady || !regionReady) return
    if (!takeCheckoutIntent()) return
    resumed.current = true
    checkout()
  }, [user, items.length, checkout, couponReady, regionReady])

  const payLabel = !looksLoggedIn
    ? t('cart.payLoggedOut')
    : busy
      ? t('cart.redirecting')
      : !intlEnabled
        ? t('cart.payLoggedIn')
        : intl
          ? t('pay.payIntl')
          : t('pay.payAr')

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="px-5 py-12 md:px-10">
        <p className="text-eyebrow uppercase text-ink/50">{t('cart.eyebrow')}</p>
        <h1 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em]">
          {t('cart.title')}
        </h1>

        {error && (
          <p role="alert" className="ui-fade-in mt-6 border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className="ui-fade-in mt-12 border border-ink/15 px-6 py-14 text-center md:py-20">
            <p className="text-title-sm font-medium tracking-[-0.01em]">{t('common.cartEmpty')}</p>
            <p className="mx-auto mt-2 max-w-[44ch] text-body-sm text-ink/60">{t('cart.emptyHint')}</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/#templates" className="btn btn-primary">
                {t('cart.emptyTemplates')}
              </Link>
              <Link to="/builder" className="btn btn-ghost">
                {t('cart.emptyBuilder')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-14">
            <section aria-label={t('cart.title')} className="min-w-0">
              <ul className="border-t border-ink/15">
                {lines.map((line) => {
                  const key = cartItemKey(line)
                  const previewHref = cartItemPreviewHref(line)
                  const title = cartLineTitle(line, items, t)
                  return (
                    <li key={key}>
                      <Collapse open={!leaving.has(key)}>
                        <div className="flex gap-4 border-b border-ink/15 py-5">
                          <ProductThumbnail
                            sku={line.sku}
                            title={line.title}
                            className="h-16 w-20 shrink-0 sm:h-20 sm:w-24"
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{title}</p>
                              {!isCustomSku(line.sku) && (
                                <p className="truncate text-body-sm text-ink/55">{line.sku}</p>
                              )}
                              <p className="mt-2 text-body-sm tabular-nums sm:hidden">
                                {line.discounted_price != null ? (
                                  <>
                                    <span className="text-ink/45 line-through">{formatLine(line.unit_price)}</span>{' '}
                                    <span className="font-medium">{formatLine(line.discounted_price)}</span>
                                  </>
                                ) : (
                                  formatLine(line.unit_price)
                                )}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-5">
                                {previewHref && (
                                  <Link to={previewHref} className="action">
                                    {t('cart.preview')} ↗
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeLine(key)}
                                  aria-label={`${t('common.remove')} ${title}`}
                                  className="action action-danger"
                                >
                                  {t('common.remove')}
                                </button>
                              </div>
                            </div>
                            <p className="hidden shrink-0 text-right tabular-nums sm:block">
                              {line.discounted_price != null ? (
                                <>
                                  <span className="block text-body-sm text-ink/45 line-through">
                                    {formatLine(line.unit_price)}
                                  </span>
                                  <span className="block font-medium">{formatLine(line.discounted_price)}</span>
                                </>
                              ) : (
                                <span className="font-medium">{formatLine(line.unit_price)}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </Collapse>
                    </li>
                  )
                })}
              </ul>
              <ClearCartControl className="mt-3" disabled={busy} onClear={() => clearCart()} />
            </section>

            {/* Resumen: medio de pago, recibo y el botón de pagar. En escritorio
                queda a la vista mientras se recorre la lista. */}
            <aside
              aria-label={t('cart.summary')}
              className="mt-10 border border-ink/15 p-6 lg:sticky lg:top-24 lg:mt-0"
            >
              {intlEnabled && (
                <PaymentMethodPicker
                  region={region}
                  onChange={setRegion}
                  disabled={busy}
                  className="mb-6"
                />
              )}
              {/* Como un recibo: subtotal a precio de lista, el 10% de la primera
                  compra con nombre y el total que se cobra. */}
              <dl className="text-body-sm tabular-nums" data-cart-summary>
                {coupon && discount > 0 ? (
                  <>
                    <div className="flex items-baseline justify-between gap-6 py-1 text-ink/60">
                      <dt>{t('cart.couponSubtotal')}</dt>
                      <dd className="whitespace-nowrap">{formatLine(catalogLoaded ? total : null)}</dd>
                    </div>
                    <div data-coupon-discount className="flex items-baseline justify-between gap-6 py-1 text-accent-ink">
                      <dt>{t('cart.couponDiscount', { percent: coupon.percent })}</dt>
                      <dd className="whitespace-nowrap">−{formatLine(catalogLoaded ? discount : null)}</dd>
                    </div>
                  </>
                ) : null}
                <div
                  className={`flex items-baseline justify-between gap-6 py-1 ${
                    coupon && discount > 0 ? 'mt-1 border-t border-ink/15 pt-3' : ''
                  }`}
                >
                  <dt className="font-medium">{t('common.estimatedTotal')}</dt>
                  <dd className="whitespace-nowrap text-title-sm font-semibold">{formatLine(catalogLoaded ? payable : null)}</dd>
                </div>
              </dl>
              {coupon && discount > 0 ? (
                <p className="mt-2 text-body-sm text-accent-ink">{t('cart.couponNote', { percent: coupon.percent })}</p>
              ) : null}

              <button
                type="button"
                disabled={busy || authLoading || live.length === 0}
                onClick={checkout}
                className="btn btn-primary mt-6 w-full disabled:opacity-40"
              >
                {busy && <Spinner />}
                {payLabel}
              </button>

              <div className="mt-5 space-y-1.5 text-body-sm text-ink/60">
                <p>{intl ? t('pay.trustIntl') : t('cart.trustNote')}</p>
                {intl && <p>{t('pay.intlTaxNote')}</p>}
                <p>
                  {t('cart.refundNote', { days: REFUND_DAYS })}{' '}
                  <Link
                    to="/legal/refunds"
                    className="underline underline-offset-2 transition-colors hover:text-ink"
                  >
                    {t('cart.refundLink')}
                  </Link>
                  {' · '}
                  <Link
                    to="/arrepentimiento"
                    className="underline underline-offset-2 transition-colors hover:text-ink"
                  >
                    {t('cart.withdrawalLink')}
                  </Link>
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
