import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { useT } from '../i18n'

export default function CheckoutSuccessPage() {
  const t = useT()
  const clearCart = useCart((s) => s.clear)
  const { user, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const [confirmState, setConfirmState] = useState('idle')
  const [confirmError, setConfirmError] = useState('')

  const paymentId =
    params.get('payment_id') ||
    params.get('collection_id') ||
    params.get('paymentId')
  const status =
    params.get('status') || params.get('collection_status') || ''
  const orderId = params.get('external_reference') || ''

  // El carrito se vacía recién acá: si el usuario abandona el checkout
  // y vuelve atrás, sus items siguen intactos.
  useEffect(() => {
    clearCart()
  }, [clearCart])

  // MP no manda webhooks con credenciales de prueba: confirmamos al volver.
  useEffect(() => {
    if (authLoading || !user) return undefined
    if (!paymentId || paymentId === 'null') {
      setConfirmState('skipped')
      return undefined
    }
    if (status && status !== 'approved') {
      setConfirmState('not-approved')
      return undefined
    }

    let cancelled = false
    setConfirmState('busy')
    ;(async () => {
      try {
        await api.confirmCheckout({ paymentId, orderId: orderId || undefined })
        if (!cancelled) setConfirmState('done')
      } catch (err) {
        if (!cancelled) {
          setConfirmState('error')
          setConfirmError(err.message)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, user, paymentId, status, orderId])

  const confirming = confirmState === 'busy' || confirmState === 'idle'

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 py-16 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
          {t('checkout.eyebrow')}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-medium tracking-[-0.02em]">
          {confirmState === 'not-approved'
            ? t('checkout.failTitle')
            : t('checkout.successTitle')}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          {confirmState === 'busy' || (confirmState === 'idle' && paymentId)
            ? t('checkout.confirming')
            : confirmState === 'error'
              ? t('checkout.confirmError')
              : confirmState === 'not-approved'
                ? t('checkout.failBody')
                : t('checkout.successBody')}
        </p>
        {confirmError && (
          <p className="mt-4 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {confirmError}
          </p>
        )}
        <Link
          to={confirmState === 'not-approved' ? '/cart' : '/account'}
          className={`mt-8 inline-block border-2 border-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone ${
            confirming ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          {confirmState === 'not-approved'
            ? t('checkout.backCart')
            : t('checkout.goAccount')}
        </Link>
      </main>
    </div>
  )
}

export function CheckoutFailurePage() {
  const t = useT()
  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 py-16 md:px-10">
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-medium tracking-[-0.02em]">
          {t('checkout.failTitle')}
        </h1>
        <p className="mt-4 text-sm text-ink/70">{t('checkout.failBody')}</p>
        <Link
          to="/cart"
          className="mt-8 inline-block border-2 border-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] hover:bg-ink hover:text-bone"
        >
          {t('checkout.backCart')}
        </Link>
      </main>
    </div>
  )
}

/** Mock Mercado Pago page when MP_ACCESS_TOKEN is empty */
export function CheckoutMockPage() {
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  const { user, loading } = useAuth()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const t = useT()
  const clearCart = useCart((s) => s.clear)

  useEffect(() => {
    if (!user || !orderId) return undefined
    let cancelled = false
    ;(async () => {
      try {
        await api.mockPay(orderId)
        if (!cancelled) {
          setDone(true)
          clearCart()
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, orderId, clearCart])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bone text-[11px] uppercase tracking-[0.25em]">
        {t('common.loading')}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-svh bg-bone px-5 py-16 text-ink">
        <p>{t('checkout.mockNeedLogin')}</p>
        <Link to="/login">{t('nav.login')}</Link>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 py-16">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
          {t('checkout.mockEyebrow')}
        </p>
        <h1 className="mt-3 text-3xl font-medium">
          {done ? t('checkout.mockDone') : t('checkout.mockBusy')}
        </h1>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {done && (
          <Link
            to="/account"
            className="mt-8 inline-block border-2 border-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] hover:bg-ink hover:text-bone"
          >
            {t('checkout.mockDownload')}
          </Link>
        )}
      </main>
    </div>
  )
}
