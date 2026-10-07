import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { useWelcomeCoupon } from '../lib/welcomeCoupon'
import { outcomeForStatus, shouldClearCart } from '../lib/checkoutOutcome'
import { ensurePaddle } from '../lib/paddleCheckout'
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
  // Paddle: el pago es de otra cuenta (403).
  'wrong-account': {
    title: 'checkout.wrongAccountTitle',
    body: 'checkout.wrongAccountBody',
    to: '/login?next=/account',
    cta: 'checkout.needsLoginCta',
  },
  // Paddle: cobró, pero el servidor no lo pudo asociar a la compra (400/404).
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
 * Vuelta del pago: Mercado Pago pega su `payment_id` en la URL; Paddle (overlay)
 * llega con `provider=paddle&txn=…`. Cada uno confirma contra la API a su modo.
 */
export default function CheckoutSuccessPage() {
  const [params] = useSearchParams()
  return params.get('provider') === 'paddle' ? (
    <PaddleCheckoutSuccess />
  ) : (
    <MercadoPagoCheckoutSuccess />
  )
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

/** Espera entre reintentos mientras Paddle termina de procesar (409). */
const PADDLE_RETRY_MS = 2000
const PADDLE_MAX_TRIES = 6

/**
 * Vuelta del overlay de Paddle. El pago ya está hecho del lado de Paddle: se
 * confirma contra la API (que trae la transacción de Paddle, no confía en la
 * URL) y se manda a Mis compras. Mientras Paddle procesa (409) se reintenta un
 * rato; el webhook cumple la orden igual aunque esto falle. Nunca gira para
 * siempre (15 s) y cada error tiene su panel: otra cuenta (403) o un pago que
 * no se pudo asociar (400/404, el carrito queda como estaba).
 */
function PaddleCheckoutSuccess() {
  const t = useT()
  const navigate = useNavigate()
  const clearCart = useCart((s) => s.clear)
  const dropWelcome = useWelcomeCoupon((s) => s.drop)
  const { user, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const [confirmState, setConfirmState] = useState('idle')
  const [confirmError, setConfirmError] = useState('')
  const [confirmRef, setConfirmRef] = useState('')
  const transactionId = params.get('txn') || ''

  useEffect(() => {
    if (authLoading) return undefined
    if (!user) {
      setConfirmState('needs-login')
      return undefined
    }
    if (!transactionId) {
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
      for (let attempt = 1; attempt <= PADDLE_MAX_TRIES; attempt += 1) {
        try {
          const data = await api.confirmPaddleCheckout(transactionId)
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
          if (err.status === 409 && attempt < PADDLE_MAX_TRIES) {
            await new Promise((r) => setTimeout(r, PADDLE_RETRY_MS))
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
  }, [authLoading, user, transactionId, navigate, clearCart, dropWelcome])

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

/** Si Paddle no avisa que el checkout cargó en este tiempo, se muestra el error con salida. */
const PAY_LINK_TIMEOUT_MS = 20_000

/**
 * Link de pago de Paddle (`/checkout/pay?_ptxn=txn_…`): el «default payment
 * link» del panel de Paddle. Lo usan los mails de Paddle (p. ej. pagar una
 * cuota vencida). Paddle.js abre solo el checkout de `_ptxn` al inicializarse;
 * si ya estaba inicializado (se llegó navegando dentro del sitio) se abre a
 * mano. Al pagar se cierra el overlay y se vuelve al lugar que corresponde:
 * LAB si la transacción es de una suscripción, Mis compras si es de una orden.
 */
export function CheckoutPayPage() {
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [state, setState] = useState('loading')
  const transactionId = params.get('_ptxn') || ''

  useEffect(() => {
    if (!/^txn_[a-z0-9]+$/i.test(transactionId)) {
      setState('invalid')
      return undefined
    }
    let cancelled = false
    let paddleRef = null
    const watchdog = setTimeout(() => {
      if (!cancelled) setState((prev) => (prev === 'loading' ? 'error' : prev))
    }, PAY_LINK_TIMEOUT_MS)
    ;(async () => {
      try {
        const methods = await api.checkoutMethods()
        const paddle = methods?.providers?.paddle
        if (!paddle?.enabled || !paddle.clientToken) throw new Error('Paddle no disponible')
        const { Paddle, fresh } = await ensurePaddle({
          environment: paddle.environment,
          clientToken: paddle.clientToken,
          handler: (event) => {
            if (cancelled) return
            const name = event?.name
            if (name === 'checkout.loaded') {
              clearTimeout(watchdog)
              setState('open')
            } else if (name === 'checkout.completed') {
              clearTimeout(watchdog)
              // Una cuota o un alta de LAB trae su suscripción; una compra, no.
              const lab = Boolean(event.data?.subscription_id) || event.data?.custom_data?.kind === 'lab'
              paddleRef?.Checkout.close()
              navigate(
                lab
                  ? '/lab?suscripcion=volver'
                  : `/checkout/success?provider=paddle&txn=${encodeURIComponent(transactionId)}`,
                { replace: true },
              )
            } else if (name === 'checkout.closed') {
              clearTimeout(watchdog)
              setState('closed')
            } else if (name === 'checkout.error') {
              clearTimeout(watchdog)
              setState('error')
            }
          },
        })
        paddleRef = Paddle
        // Recién inicializado, Paddle abre solo el `_ptxn` de la URL.
        if (!fresh && !cancelled) {
          Paddle.Checkout.open({ transactionId, settings: { showAddDiscounts: false } })
        }
      } catch {
        if (!cancelled) {
          clearTimeout(watchdog)
          setState('error')
        }
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(watchdog)
    }
  }, [transactionId, navigate])

  const message = {
    loading: t('pay.opening'),
    open: t('pay.opening'),
    invalid: t('pay.invalidLink'),
    error: t('pay.openError'),
    closed: t('pay.closed'),
  }[state]

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 py-16 md:px-10">
        <p role="status" className="text-sm leading-relaxed text-ink/70">
          {message}
        </p>
        {state !== 'loading' && state !== 'open' && (
          <div className="mt-8 flex flex-wrap gap-3">
            {(state === 'error' || state === 'closed') && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="border-2 border-ink bg-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-bone transition-colors hover:border-accent hover:bg-accent"
              >
                {t('pay.retry')}
              </button>
            )}
            <Link
              to="/account"
              className="border-2 border-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone"
            >
              {t('checkout.goAccount')}
            </Link>
          </div>
        )}
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
