import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { useWelcomeCoupon } from '../lib/welcomeCoupon'
import { outcomeForStatus, shouldClearCart } from '../lib/checkoutOutcome'
import { useT } from '../i18n'

const CONFIRM_TIMEOUT_MS = 15000

/**
 * El webhook de MP ya marcó la orden como paga server-to-server, así que
 * ningún fallo del confirm puede dejar al comprador sin salida.
 */
const RESOLVED_PANELS = {
  'not-approved': {
    title: 'checkout.failTitle',
    body: 'checkout.failBody',
    to: '/cart',
    cta: 'checkout.backCart',
  },
  processing: {
    title: 'checkout.processingTitle',
    body: 'checkout.processingBody',
    to: '/account',
    cta: 'checkout.goAccount',
  },
  error: {
    title: 'checkout.successTitle',
    body: 'checkout.confirmError',
    to: '/account',
    cta: 'checkout.goAccount',
  },
  received: {
    title: 'checkout.successTitle',
    body: 'checkout.confirmSlow',
    to: '/account',
    cta: 'checkout.goAccount',
  },
  'needs-login': {
    title: 'checkout.successTitle',
    body: 'checkout.needsLogin',
    to: '/login?next=/account',
    cta: 'checkout.needsLoginCta',
  },
  // Pago internacional: el pago es de otra cuenta (403).
  'wrong-account': {
    title: 'checkout.wrongAccountTitle',
    body: 'checkout.wrongAccountBody',
    to: '/login?next=/account',
    cta: 'checkout.needsLoginCta',
  },
  // Pago internacional: cobró, pero el servidor no lo pudo asociar a la compra (400/404).
  // Al dueño ya le llegó el aviso para entregar o devolver.
  review: {
    title: 'checkout.reviewTitle',
    body: 'checkout.reviewBody',
    to: '/account',
    cta: 'checkout.goAccount',
  },
}

/** Estados con el mensaje del servidor a la vista (y su referencia para soporte). */
const SHOWS_ERROR = new Set(['error', 'review', 'wrong-account'])

/**
 * Vuelta del pago: Mercado Pago pega su `payment_id` en la URL; Polar llega con
 * `provider=polar&orderId=…`. Cada uno confirma contra la API a su modo.
 */
export default function CheckoutSuccessPage() {
  const [params] = useSearchParams()
  const provider = params.get('provider')
  if (provider === 'polar') return <IntlCheckoutSuccess provider={provider} />
  return <MercadoPagoCheckoutSuccess />
}

/** Panel final (resuelto) de la vuelta del pago, compartido por las dos pasarelas. */
function ResolvedPanel({ panel, confirmState, confirmError, confirmRef }) {
  const t = useT()
  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 py-16 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
          {t('checkout.eyebrow')}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-medium tracking-[-0.02em]">
          {t(panel.title)}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          {t(panel.body)}
        </p>
        {SHOWS_ERROR.has(confirmState) && confirmError && (
          <div role="alert" className="mt-4 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            <p>{confirmError}</p>
            {confirmRef && (
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ink/50">
                {t('checkout.errorRef')}{' '}
                <code className="select-all font-mono normal-case tracking-normal text-ink/70">
                  {confirmRef}
                </code>
              </p>
            )}
          </div>
        )}
        <Link
          to={panel.to}
          className="mt-8 inline-block border-2 border-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone"
        >
          {t(panel.cta)}
        </Link>
      </main>
    </div>
  )
}

/** Espera entre reintentos mientras la pasarela termina de procesar (409). */
const INTL_RETRY_MS = 2000
const INTL_MAX_TRIES = 6

/**
 * Vuelta del pago internacional (Polar): la orden la cumple el webhook y
 * esto solo pregunta cómo va (409 mientras no llegó). Se reintenta un rato y se
 * manda a Mis compras; el webhook cumple la
 * orden igual aunque esto falle. Nunca gira para siempre (15 s) y cada error
 * tiene su panel: otra cuenta (403) o un pago que no se pudo asociar (400/404,
 * el carrito queda como estaba).
 */
function IntlCheckoutSuccess({ provider }) {
  const t = useT()
  const navigate = useNavigate()
  const clearCart = useCart((s) => s.clear)
  const dropWelcome = useWelcomeCoupon((s) => s.drop)
  const { user, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const [confirmState, setConfirmState] = useState('idle')
  const [confirmError, setConfirmError] = useState('')
  const [confirmRef, setConfirmRef] = useState('')
  // Vuelve con nuestra orden (la cumple el webhook y esta pantalla espera a que figure paga).
  const orderId = params.get('orderId') || ''

  useEffect(() => {
    if (authLoading) return undefined
    if (!user) {
      setConfirmState('needs-login')
      return undefined
    }
    if (!orderId) {
      navigate('/account', { replace: true })
      return undefined
    }
    let cancelled = false
    setConfirmState('busy')
    // Si la API se cuelga, el webhook igual cumple la orden: a Mis compras.
    const watchdog = setTimeout(() => {
      if (cancelled) return
      cancelled = true
      clearCart()
      dropWelcome()
      setConfirmState((prev) => (prev === 'busy' ? 'received' : prev))
    }, CONFIRM_TIMEOUT_MS)
    ;(async () => {
      for (let attempt = 1; attempt <= INTL_MAX_TRIES; attempt += 1) {
        try {
          const data = await api.confirmPolarCheckout(orderId)
          if (cancelled) return
          clearTimeout(watchdog)
          clearCart()
          dropWelcome()
          navigate(`/account?purchase=1&orderId=${encodeURIComponent(data.orderId)}`, {
            replace: true,
            state: { purchaseOrder: data.order || null },
          })
          return
        } catch (err) {
          if (cancelled) return
          if (err.status === 409 && attempt < INTL_MAX_TRIES) {
            await new Promise((r) => setTimeout(r, INTL_RETRY_MS))
            continue
          }
          clearTimeout(watchdog)
          setConfirmError(err.message)
          setConfirmRef(err.requestId || '')
          if (err.status === 403) {
            setConfirmState('wrong-account')
            return
          }
          if (err.status === 400 || err.status === 404) {
            // No se asoció a la compra: el carrito queda como estaba.
            setConfirmState('review')
            return
          }
          // 409 que no terminó o una falla nuestra: el pago está hecho, a Mis compras.
          clearCart()
          dropWelcome()
          setConfirmState(err.status === 409 ? 'received' : 'error')
          return
        }
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(watchdog)
    }
  }, [authLoading, user, orderId, provider, navigate, clearCart, dropWelcome])

  const panel = RESOLVED_PANELS[confirmState]
  if (panel) {
    return (
      <ResolvedPanel
        panel={panel}
        confirmState={confirmState}
        confirmError={confirmError}
        confirmRef={confirmRef}
      />
    )
  }
  return (
    <div
      role="status"
      className="flex min-h-svh items-center justify-center bg-bone text-[11px] uppercase tracking-[0.25em] text-ink/50"
    >
      {t('pay.confirming')}
    </div>
  )
}

function MercadoPagoCheckoutSuccess() {
  const t = useT()
  const navigate = useNavigate()
  const clearCart = useCart((s) => s.clear)
  // Ya compró: el cupón de primera compra deja de valer y no debe seguir mostrándose.
  const dropWelcome = useWelcomeCoupon((s) => s.drop)
  const { user, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const [confirmState, setConfirmState] = useState('idle')
  const [confirmError, setConfirmError] = useState('')
  const [confirmRef, setConfirmRef] = useState('')

  const paymentId =
    params.get('payment_id') ||
    params.get('collection_id') ||
    params.get('paymentId')
  const status =
    params.get('status') || params.get('collection_status') || ''
  const orderId = params.get('external_reference') || ''

  // Vaciarlo al llegar acá dejaba al comprador rechazado volviendo a un carrito
  // vacío, con todo para rearmar.
  useEffect(() => {
    if (shouldClearCart(confirmState)) {
      clearCart()
      dropWelcome()
    }
  }, [confirmState, clearCart, dropWelcome])

  // Nunca girar para siempre: si /api/auth/me o el confirm se cuelgan, la orden
  // ya quedó paga por el webhook y el comprador tiene que poder llegar a
  // Mis compras igual.
  useEffect(() => {
    const timer = setTimeout(() => {
      setConfirmState((prev) =>
        prev === 'idle' || prev === 'busy' ? 'received' : prev,
      )
    }, CONFIRM_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  // MP no manda webhooks con credenciales de prueba: confirmamos al volver
  // y redirigimos a Mis compras con el modal de éxito.
  useEffect(() => {
    if (authLoading) return undefined
    // Front y API viven en dominios distintos: la cookie de sesión es
    // third-party y al volver de MP puede no viajar. El pago ya está hecho.
    if (!user) {
      setConfirmState('needs-login')
      return undefined
    }

    if (!paymentId || paymentId === 'null') {
      navigate('/account', { replace: true })
      return undefined
    }
    const outcome = outcomeForStatus(status)
    if (outcome !== 'approved') {
      setConfirmState(outcome)
      return undefined
    }

    let cancelled = false
    setConfirmState((prev) => (prev === 'received' ? prev : 'busy'))
    ;(async () => {
      try {
        const data = await api.confirmCheckout({
          paymentId,
          orderId: orderId || undefined,
        })
        if (cancelled) return
        const confirmedId = data.orderId || orderId
        clearCart()
        dropWelcome()
        navigate(
          `/account?purchase=1&orderId=${encodeURIComponent(confirmedId)}`,
          {
            replace: true,
            state: { purchaseOrder: data.order || null },
          },
        )
      } catch (err) {
        if (cancelled) return
        setConfirmError(err.message)
        setConfirmRef(err.requestId || '')
        setConfirmState((prev) => (prev === 'busy' ? 'error' : prev))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, user, paymentId, status, orderId, navigate, clearCart, dropWelcome])

  const panel = RESOLVED_PANELS[confirmState]
  if (panel) {
    return (
      <ResolvedPanel
        panel={panel}
        confirmState={confirmState}
        confirmError={confirmError}
        confirmRef={confirmRef}
      />
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-bone text-[11px] uppercase tracking-[0.25em] text-ink/50">
      {t('checkout.confirming')}
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
  const navigate = useNavigate()
  const clearCart = useCart((s) => s.clear)
  const dropWelcome = useWelcomeCoupon((s) => s.drop)

  useEffect(() => {
    if (!user || !orderId) return undefined
    let cancelled = false
    ;(async () => {
      try {
        await api.mockPay(orderId)
        if (!cancelled) {
          setDone(true)
          clearCart()
          dropWelcome()
          navigate(
            `/account?purchase=1&orderId=${encodeURIComponent(orderId)}`,
            { replace: true },
          )
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, orderId, clearCart, dropWelcome, navigate])

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
      </main>
    </div>
  )
}
