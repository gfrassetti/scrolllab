import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePlan } from '../lib/plan'
import { useI18n } from '../i18n'
import { gsap, useGSAP } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion'
import { usePayRegion, providerForRegion } from '../lib/payRegion'
import { REFUND_DAYS } from '../lib/site'
import { WELCOME_COUPON_PERCENT } from '../domain/catalog'
import { openPaddleCheckout } from '../lib/paddleCheckout'
import PaymentMethodPicker from './PaymentMethodPicker'

const TIER_ORDER = ['starter', 'pro', 'studio']
const tierIndex = (planId) => TIER_ORDER.indexOf(String(planId).replace('hosted_', ''))

// Lo que Checkout Pro agrega a la back_url; se limpia al volver.
const MP_RETURN_PARAMS = [
  'upgrade',
  'payment_id',
  'collection_id',
  'collection_status',
  'status',
  'external_reference',
  'payment_type',
  'merchant_order_id',
  'preference_id',
  'site_id',
  'processing_mode',
  'merchant_account_id',
]

function fmtArs(n, locale) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

/** Precio en la moneda de la pasarela: ARS (MP) o USD con centavos si los hay (Paddle). */
function fmtMoney(n, currency, locale) {
  if (currency !== 'USD') return fmtArs(n, locale)
  const cents = !Number.isInteger(Number(n))
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n)
}

/** Precio de un plan en una moneda (los planes traen ARS y USD). */
const planPrice = (p, cycle, currency) =>
  currency === 'USD'
    ? cycle === 'yearly'
      ? p.priceYearlyUsd
      : p.priceMonthlyUsd
    : cycle === 'yearly'
      ? p.priceYearly
      : p.priceMonthly

// Paddle tarda en crear la suscripción después del pago (unos segundos, a veces
// más): el sync se reintenta ~30 s antes de decir «todavía no la vemos». Aunque
// se agote, el webhook la activa igual.
const PADDLE_SYNC_TRIES = 12
const PADDLE_SYNC_WAIT_MS = 2500

// El server manda `null` para "sin tope" (Infinity no es JSON) — ver
// `quotaForWire` en server/app.js.
const displayQuota = (n) => (Number.isFinite(n) ? n : '∞')

/**
 * `qa`: los planes de prueba de /lab-test (src/domain/qa.js) — precio de prueba,
 * sin prueba gratis y solo Mercado Pago.
 */
export default function HostedPlans({ qa: qaPage = false }) {
  const { user } = useAuth()
  const {
    plan,
    quota,
    used,
    canceledAt,
    currentPeriodEnd,
    cycle: billingCycle,
    trialing,
    trialEndsAt,
    trialAvailable: trialAvailableForPlan,
    trialDays,
    subscriptionStatus,
    pastDue,
    graceEndsAt,
    paymentFailed,
    lapsedPlan,
    paidPlan,
    provider: planProvider,
    currency_id: planCurrency,
    qa: planIsQa,
    refresh: refreshPlan,
  } = usePlan()
  // Modo prueba: en /lab-test, o con una suscripción de prueba en cualquier
  // pantalla (sus precios son los de prueba; si no, /lab mostraba los reales).
  const qa = qaPage || !!planIsQa
  const { t, locale } = useI18n()
  // Desde dónde paga (Argentina → MP en pesos; otro país → Paddle en USD).
  const region = usePayRegion((s) => s.region)
  const setRegion = usePayRegion((s) => s.setRegion)
  const paddleForRegion = usePayRegion((s) => s.paddleEnabled)
  // Prueba: sin prueba gratis y solo Mercado Pago.
  const paddleEnabled = !qa && paddleForRegion
  // Prueba: la prueba gratis se pide a mano (para probar la baja en la prueba).
  const [qaTrial, setQaTrial] = useState(false)
  const trialAvailable = qa ? qaTrial : trialAvailableForPlan
  const loadRegion = usePayRegion((s) => s.load)
  useEffect(() => {
    loadRegion()
  }, [loadRegion])
  const intl = paddleEnabled && region === 'intl'
  const paddleSub = planProvider === 'paddle'
  // Textos que nombran a la pasarela: con una suscripción de Paddle, su variante.
  const tp = (key, vars) => t(paddleSub ? `lab.paddle.${key}` : `lab.${key}`, vars)
  const root = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const [plans, setPlans] = useState([])
  const [freeQuota, setFreeQuota] = useState(0)
  const [cycle, setCycle] = useState('monthly')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  // Cambio de plan a confirmar: la cotización del server (monto a pagar ya,
  // precio desde el próximo cobro). Se muestra en la card del plan destino.
  const [changeQuote, setChangeQuote] = useState(null)

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')
      : ''
  const tierName = (planId) => t(`lab.tier.${String(planId).replace('hosted_', '')}`)
  // Con un plan pago activo, la grilla de 3 arranca colapsada: la acción
  // principal es "ver mi plan", no comparar. Queda a un click de distancia.
  const [showComparison, setShowComparison] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const p = await api.subscriptionPlans({ qa })
      setPlans(
        [...(p.plans || [])].sort(
          (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
        ),
      )
      setFreeQuota(Number(p.freeQuota) || 0)
    } catch (err) {
      setError(err.message)
    }
  }, [qa])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Llegar con /lab#planes (desde /account o "Ver planes") es intención
  // explícita de comparar: abre la grilla. El scroll orgánico de /lab no
  // trae hash, así que con plan pago la card sigue colapsada ahí.
  const [hashIntent, setHashIntent] = useState(
    () => typeof window !== 'undefined' && window.location.hash === '#planes',
  )
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const sync = () => {
      if (window.location.hash === '#planes') {
        setShowComparison(true)
        setHashIntent(true)
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // El scroll espera a que la grilla exista: /lab monta detrás de un splash
  // y del gate de auth, así que en mount la sección todavía no tiene alto.
  // `ScrollToTop` (useLayoutEffect en App) ya corrió para entonces.
  useEffect(() => {
    if (!hashIntent || !plans.length || !root.current) return
    const reduce = prefersReducedMotion()
    const id = requestAnimationFrame(() => {
      root.current?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      })
      setHashIntent(false)
    })
    return () => cancelAnimationFrame(id)
  }, [hashIntent, plans.length])

  // Volver del checkout de MP (`back_url` = /lab?suscripcion=volver): bajamos
  // el estado real sin esperar al webhook. Una sola vez; se limpia la URL. MP
  // le pega `?preapproval_id=…` con un segundo «?» (visto en producción), así
  // que el valor llega como `volver?preapproval_id=…`.
  const returnedFromMp =
    !!user && String(searchParams.get('suscripcion') || '').startsWith('volver')
  const returnSynced = useRef(false)
  useEffect(() => {
    if (!returnedFromMp || returnSynced.current) return
    returnSynced.current = true
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('suscripcion')
        return next
      },
      { replace: true },
    )
    api
      .subscriptionSync()
      .then((out) =>
        setNotice(
          t(out?.status === 'authorized' ? 'lab.returnSynced' : 'lab.returnPending'),
        ),
      )
      .catch(() => setNotice(t('lab.returnPending')))
      .finally(() => refreshPlan())
  }, [returnedFromMp, setSearchParams, refreshPlan, t])

  // Volver del checkout de la diferencia (`/lab?upgrade=volver&payment_id=…`):
  // se confirma el pago acá, sin esperar al webhook. Una sola vez.
  const upgradeReturn = !!user && searchParams.get('upgrade') === 'volver'
  const upgradeHandled = useRef(false)
  useEffect(() => {
    if (!upgradeReturn || upgradeHandled.current) return
    upgradeHandled.current = true
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
    const status = searchParams.get('status') || searchParams.get('collection_status')
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        MP_RETURN_PARAMS.forEach((k) => next.delete(k))
        return next
      },
      { replace: true },
    )
    if (status !== 'approved' || !paymentId || paymentId === 'null') {
      setNotice(
        t(status === 'pending' || status === 'in_process' ? 'lab.upgradePending' : 'lab.upgradeNotPaid'),
      )
      return
    }
    api
      .subscriptionUpgradeConfirm(paymentId)
      .then((out) =>
        setNotice(
          t('lab.upgradeApplied', {
            plan: t(`lab.tier.${String(out.plan).replace('hosted_', '')}`),
          }),
        ),
      )
      .catch((err) =>
        err.status === 409 && /procesando/.test(err.message)
          ? setNotice(t('lab.upgradePending'))
          : setError(err.message),
      )
      .finally(() => refreshPlan())
  }, [upgradeReturn, searchParams, setSearchParams, refreshPlan, t])

  /** Después del overlay de Paddle: baja el estado sin esperar al webhook. */
  const syncAfterPaddle = async () => {
    for (let i = 0; i < PADDLE_SYNC_TRIES; i += 1) {
      try {
        const out = await api.subscriptionSync()
        if (out?.status === 'authorized') {
          setNotice(t('lab.returnSynced'))
          return
        }
      } catch {
        /* reintenta */
      }
      await new Promise((r) => setTimeout(r, PADDLE_SYNC_WAIT_MS))
    }
    setNotice(t('lab.paddle.returnPending'))
  }

  // `via`: la pasarela del alta. Reactivar mantiene la de la suscripción; un
  // alta nueva usa la región elegida.
  const subscribe = async (planId, planCycle = cycle, via) => {
    if (busy) return
    setBusy(planId)
    setError('')
    setNotice('')
    const provider = via || (paddleEnabled ? providerForRegion(region) : 'mercadopago')
    try {
      const res = await api.subscribe(planId, planCycle, { provider, locale, qa, qaTrial })
      if (res.provider === 'paddle' && res.transactionId) {
        const result = await openPaddleCheckout({
          environment: res.paddle?.environment,
          clientToken: res.paddle?.clientToken,
          transactionId: res.transactionId,
          email: res.customerEmail,
          locale,
        })
        if (result.status === 'completed') {
          await syncAfterPaddle()
          await refreshPlan()
        }
        return
      }
      if (res.init_point) {
        window.location.href = res.init_point
        return
      }
      if (res.mock && res.activateUrl) {
        await api.subscriptionMockActivate(res.activateUrl)
        await refreshPlan()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  // Cuota rechazada en Paddle: el link firmado para cambiar la tarjeta.
  const updateCard = async () => {
    if (busy) return
    setBusy('card')
    setError('')
    try {
      const { url } = await api.subscriptionPaymentMethod()
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  const cancel = async () => {
    if (busy) return
    setBusy('cancel')
    setError('')
    try {
      await api.subscriptionCancel()
      setConfirmingCancel(false)
      await refreshPlan()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  // Cambio de plan (mismo ciclo, sin dar de baja). Primero la cotización: se
  // confirma viendo cuánto se paga ya (la diferencia, si sube con días pagos)
  // y cuánto desde el próximo cobro.
  const changePlan = async (planId) => {
    if (busy) return
    setBusy(planId)
    setError('')
    setNotice('')
    try {
      setChangeQuote(await api.subscriptionChangeQuote(planId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const confirmChange = async () => {
    if (busy || !changeQuote) return
    const planId = changeQuote.plan
    setBusy(planId)
    setError('')
    try {
      const res = await api.subscriptionChange(planId)
      if (res.requiresPayment && res.init_point) {
        window.location.href = res.init_point
        return
      }
      if (res.requiresPayment && res.mock && res.payUrl) {
        await api.subscriptionUpgradeMockPay(res.payUrl)
      }
      setChangeQuote(null)
      await refreshPlan()
      setNotice(t('lab.upgradeApplied', { plan: tierName(planId) }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const features = t('lab.planFeatures')
  const activePlan = user && plan !== 'free' ? plan : null
  // Cancelada con días pagos: puede re-suscribirse a cualquier plan o ciclo
  // (el primer cobro nuevo es cuando termina lo pagado → no paga dos veces).
  const canResubscribe = !!activePlan && !!canceledAt
  // Hasta cuándo tiene acceso hoy: lo pagado, o el fin de la gracia si hay un
  // cobro pendiente.
  const activeUntil = activePlan ? (pastDue ? graceEndsAt : currentPeriodEnd) : null

  // Con plan pago vigente el ciclo queda fijado al suyo: MP no deja pasar un
  // preapproval de mensual a anual, así que mostrar precios del otro ciclo
  // sería ofrecer un cambio que este flujo no hace (ese va por cancelar).
  useEffect(() => {
    if (activePlan && billingCycle) setCycle(billingCycle)
  }, [activePlan, billingCycle])
  // Free/sin plan: siempre se ve la comparación completa, es la única acción
  // posible. Con plan pago: colapsada por default, el toggle la despliega.
  const comparisonVisible = !activePlan || showComparison
  const currentPlanMeta = plans.find((p) => p.id === activePlan)
  // Moneda de la suscripción vigente, y la de la grilla: cambiar de plan sigue
  // en la moneda de la suscripción; un alta nueva, en la de la región elegida.
  const subCurrency = planCurrency || 'ARS'
  const choosing = !activePlan || canResubscribe
  const gridCurrency = choosing ? (intl ? 'USD' : 'ARS') : subCurrency
  const reactivateVia = planProvider || undefined

  useGSAP(
    () => {
      if (!plans.length) return
      if (prefersReducedMotion()) return
      gsap.from('[data-plan-card]', {
        y: 24,
        opacity: 0,
        duration: 0.55,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 80%',
          once: true,
        },
      })
    },
    { scope: root, dependencies: [plans.length] },
  )

  return (
    <section
      ref={root}
      id="planes"
      className="mt-14 scroll-mt-24 border border-accent/45 bg-accent/[0.04] p-6 md:p-8 md:shadow-[0_24px_60px_-28px_rgba(255,75,0,0.45)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-eyebrow font-semibold uppercase text-accent">
          {t('lab.plansTitle')}
        </h2>
        {comparisonVisible && (!activePlan || canResubscribe) && (
          <div className="inline-flex border border-ink/20 text-eyebrow uppercase">
            {['monthly', 'yearly'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={`px-3 py-1.5 transition-colors ${
                  cycle === c
                    ? 'bg-accent text-ink'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                {t(`lab.cycle.${c}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 border border-success/40 bg-success/10 px-4 py-3 text-body-sm">
          {notice}
        </p>
      )}

      {/* Con plan pago, lo que el suscriptor necesita ver por default es SU
          plan (estado de cobro, baja, reactivar). La comparación queda a un
          click ("Ver otros planes"), no escondida del todo. */}
      {activePlan ? (
        <div className="mt-4 flex flex-col gap-4 border border-ink/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-eyebrow uppercase text-accent">
              {t(`lab.tier.${plan.replace('hosted_', '')}`)}
            </p>
            <p className="mt-2 text-body-sm text-ink/70">
              {t('lab.planActiveState', {
                plan: t(`lab.tier.${plan.replace('hosted_', '')}`),
                used,
                quota: displayQuota(quota),
              })}
              {currentPlanMeta && (
                <>
                  {' · '}
                  {fmtMoney(planPrice(currentPlanMeta, billingCycle, subCurrency), subCurrency, locale)}
                  {' '}
                  {t(billingCycle === 'yearly' ? 'lab.perYear' : 'lab.perMonth')}
                </>
              )}
            </p>
            {activeUntil && (
              <p className="mt-1 text-body-sm font-medium text-ink/80">
                {t('lab.planActiveUntil', { date: fmtDate(activeUntil) })}
              </p>
            )}
            {trialing && !canceledAt && (
              <p className="mt-1 text-body-sm text-accent">
                {t('lab.planTrialActive', { date: fmtDate(trialEndsAt) })}
              </p>
            )}
            {pastDue && !canceledAt && (
              <p
                className={`mt-3 border px-3 py-2 text-body-sm ${
                  paymentFailed
                    ? 'border-danger/40 bg-danger/10'
                    : 'border-accent/40 bg-accent/10'
                }`}
              >
                {tp(paymentFailed ? 'planPaymentFailed' : 'planPastDue', {
                  date: fmtDate(graceEndsAt),
                })}
              </p>
            )}
            {paymentFailed && paddleSub && !canceledAt && (
              <button
                type="button"
                onClick={updateCard}
                disabled={!!busy}
                className="btn mt-3 border-ink bg-ink text-bone hover:opacity-90 disabled:opacity-40"
              >
                {busy === 'card' ? '…' : t('lab.paddle.updateCard')}
              </button>
            )}
            {subscriptionStatus === 'paused' && !canceledAt && (
              <p className="mt-1 text-body-sm text-ink/50">
                {tp('planPausedNote')}
              </p>
            )}
            {canceledAt ? (
              <div className="mt-1">
                <p className="text-body-sm text-ink/50">
                  {t('lab.planCanceledNote')}
                </p>
                <button
                  type="button"
                  onClick={() => subscribe(plan, billingCycle, reactivateVia)}
                  disabled={!!busy}
                  className="btn mt-3 border-accent bg-accent text-ink hover:opacity-85 disabled:opacity-40"
                >
                  {busy === plan ? '…' : t('lab.planReactivate')}
                </button>
                <p className="mt-2 text-body-sm text-ink/50">
                  {t('lab.planReactivateNote', { date: fmtDate(currentPeriodEnd) })}
                </p>
              </div>
            ) : confirmingCancel ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-ink/70">
                <span>
                  {pastDue
                    ? t('lab.planCancelConfirmNow')
                    : t('lab.planCancelConfirm', { date: fmtDate(currentPeriodEnd) })}
                </span>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy === 'cancel'}
                  className="text-danger underline underline-offset-2 disabled:opacity-40"
                >
                  {busy === 'cancel' ? '…' : t('lab.planCancelYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={busy === 'cancel'}
                  className="text-ink/55 hover:text-ink disabled:opacity-40"
                >
                  {t('lab.planCancelKeep')}
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="mt-1 text-body-sm text-ink/55 underline decoration-ink/30 underline-offset-2 hover:text-danger"
              >
                {t('lab.planCancel')}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowComparison((v) => !v)}
            className="btn btn-ghost shrink-0"
          >
            {showComparison ? t('lab.hideOtherPlans') : t('lab.viewOtherPlans')}
          </button>
        </div>
      ) : (
        user && (
          <>
            {lapsedPlan && (
              <p className="mt-4 border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm">
                {subscriptionStatus === 'paused'
                  ? t('lab.planLapsedPaused', { plan: tierName(lapsedPlan) })
                  : tp('planLapsed', { plan: tierName(lapsedPlan) })}
              </p>
            )}
            <p className="mt-4 text-body-sm text-ink/55">
              {t('lab.planFreeState', { used, quota: displayQuota(quota) })}
            </p>
          </>
        )
      )}

      {comparisonVisible && (
        <>
          {!activePlan && freeQuota > 0 && (
            <p className="mt-6 border border-ink/15 bg-ink/[0.02] px-4 py-3 text-body-sm text-ink/65">
              {t('lab.freeTierNote', { n: freeQuota })}
            </p>
          )}
          {canResubscribe && (
            <p className="mt-6 text-body-sm text-ink/55">
              {t('lab.planResubscribeHint', { date: fmtDate(currentPeriodEnd) })}
            </p>
          )}
          {activePlan && !canResubscribe && (
            <>
              <p className="mt-6 text-body-sm text-ink/55">
                {trialing ? t('lab.planChangeHintTrial') : tp('planChangeHint')}
              </p>
              <p className="mt-2 text-body-sm text-ink/50">
                {t('lab.planCycleHint')}
              </p>
            </>
          )}
          {/* Compartidas por los 3 planes — una sola vez, no repetidas card
              por card. Ninguna se gatea por tier del lado del backend, así
              que listarlas 3 veces solo se veía como relleno. */}
          <div className="mt-6 border border-accent/20 bg-bone p-4">
            <p className="text-eyebrow uppercase text-ink/45">
              {t('lab.planFeaturesTitle')}
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-body-sm text-ink/70">
              {(Array.isArray(features) ? features : []).map((f, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-accent">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {paddleEnabled && choosing && (
            <PaymentMethodPicker
              region={region}
              onChange={setRegion}
              disabled={!!busy}
              name="lab-pay-method"
              className="mt-6"
            />
          )}

          {qa && choosing && (
            <label className="mt-6 flex min-h-11 items-center gap-3 text-body-sm text-ink/75">
              <input
                type="checkbox"
                checked={qaTrial}
                onChange={(e) => setQaTrial(e.target.checked)}
                disabled={!!busy}
                className="size-4 accent-accent"
              />
              Prueba: alta con {trialDays || 7} días de prueba gratis (sin cobro hasta que termina)
            </label>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const price = planPrice(p, cycle, gridCurrency)
              const saving = Math.round(
                100 -
                  (planPrice(p, 'yearly', gridCurrency) /
                    (planPrice(p, 'monthly', gridCurrency) * 12)) *
                    100,
              )
              // Cancelada: el mismo plan en otro ciclo es una suscripción nueva.
              const isCurrent =
                activePlan === p.id && (!canResubscribe || cycle === billingCycle)
              const featured = p.tier === 'pro'
              return (
                <div
                  key={p.id}
                  data-plan-card
                  className={`relative flex flex-col border p-5 ${
                    featured
                      ? 'border-accent bg-accent/[0.04] md:shadow-[0_20px_45px_-16px_rgba(255,75,0,0.4)]'
                      : 'border-ink/15'
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-5 border border-accent bg-bone px-2 py-0.5 text-eyebrow uppercase text-accent">
                      {t('lab.planRecommended')}
                    </span>
                  )}
                  <p
                    className={`text-eyebrow uppercase ${
                      featured ? 'text-accent' : 'text-ink/50'
                    }`}
                  >
                    {t(`lab.tier.${p.tier}`)}
                  </p>
                  <p className="mt-3 text-title-sm font-medium tracking-[-0.02em]">
                    {fmtMoney(price, gridCurrency, locale)}
                    <span className="ml-1 text-body-sm font-normal text-ink/50">
                      {t(cycle === 'yearly' ? 'lab.perYear' : 'lab.perMonth')}
                    </span>
                  </p>
                  {cycle === 'yearly' && saving > 0 && (
                    <p className="mt-1 text-eyebrow uppercase text-success">
                      {t('lab.save', { pct: saving })}
                    </p>
                  )}
                  <p className="mt-4 text-body-sm text-ink/70">
                    {t('lab.planQuota', { n: displayQuota(p.instanceQuota) })}
                  </p>
                  <p className="mt-1 flex-1 text-body-sm text-ink/50">
                    {user && !activePlan && trialAvailable && trialDays > 0
                      ? t('lab.planTrialNote', { n: trialDays })
                      : ' '}
                  </p>
                  {!user ? (
                    <Link
                      to="/login?next=/lab"
                      className={`btn mt-5 w-full ${
                        featured
                          ? 'border-accent bg-accent text-ink hover:opacity-85'
                          : 'btn-ghost'
                      }`}
                    >
                      {t('nav.login')}
                    </Link>
                  ) : isCurrent && canResubscribe ? (
                    <button
                      type="button"
                      onClick={() => subscribe(p.id, cycle, reactivateVia)}
                      disabled={!!busy}
                      className={`btn mt-5 w-full disabled:opacity-40 ${
                        featured
                          ? 'border-accent bg-accent text-ink hover:opacity-85'
                          : 'border-ink bg-ink text-bone hover:opacity-90'
                      }`}
                    >
                      {busy === p.id ? '…' : t('lab.planReactivate')}
                    </button>
                  ) : isCurrent ? (
                    <span className="btn mt-5 w-full border-ink/20 text-ink/40">
                      {t('lab.planCurrent')}
                    </span>
                  ) : activePlan && !canResubscribe && changeQuote?.plan === p.id ? (
                    <div className="mt-5 border-t border-ink/15 pt-4" role="group" aria-live="polite">
                      <p className="text-body-sm text-ink/75">
                        {(() => {
                          const qc = changeQuote.currency_id || subCurrency
                          const vars = {
                            plan: tierName(p.id),
                            amount: fmtMoney(changeQuote.amount, qc, locale),
                            days:
                              changeQuote.days === 1
                                ? t('lab.daysOne')
                                : t('lab.daysMany', { n: changeQuote.days }),
                            price: fmtMoney(changeQuote.newPrice, qc, locale),
                            per: t(cycle === 'yearly' ? 'lab.perYear' : 'lab.perMonth'),
                            date: fmtDate(changeQuote.priceEffectiveAt),
                          }
                          return changeQuote.amount > 0
                            ? tp('changeConfirmPaid', vars)
                            : changeQuote.trialing
                              ? t('lab.changeConfirmTrial', vars)
                              : tp('changeConfirmFree', vars)
                        })()}
                      </p>
                      <button
                        type="button"
                        onClick={confirmChange}
                        disabled={!!busy}
                        className="btn mt-3 w-full border-accent bg-accent text-ink hover:opacity-85 disabled:opacity-40"
                      >
                        {busy === p.id
                          ? '…'
                          : changeQuote.amount > 0
                            ? tp('changePay', {
                                amount: fmtMoney(
                                  changeQuote.amount,
                                  changeQuote.currency_id || subCurrency,
                                  locale,
                                ),
                              })
                            : t('lab.changeYes', { plan: tierName(p.id) })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setChangeQuote(null)}
                        disabled={!!busy}
                        className="mt-2 w-full text-body-sm text-ink/55 hover:text-ink disabled:opacity-40"
                      >
                        {t('lab.changeKeep')}
                      </button>
                    </div>
                  ) : activePlan && !canResubscribe ? (
                    <button
                      type="button"
                      onClick={() => changePlan(p.id)}
                      disabled={!!busy}
                      className={`btn mt-5 w-full disabled:opacity-40 ${
                        featured
                          ? 'border-accent bg-accent text-ink hover:opacity-85'
                          : 'border-ink bg-ink text-bone hover:opacity-90'
                      }`}
                    >
                      {busy === p.id ? '…' : t('lab.planChangeTo')}
                    </button>
                  ) : canResubscribe && paidPlan && tierIndex(p.id) > tierIndex(paidPlan) ? (
                    // Días pagos con un plan más barato: re-suscribirse más
                    // arriba sería la cuota nueva sin pagar la diferencia.
                    <p className="mt-5 text-body-sm text-ink/55">
                      {t('lab.planUpgradeAfterReactivate', { plan: tierName(paidPlan) })}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => subscribe(p.id)}
                      disabled={!!busy}
                      className={`btn mt-5 w-full disabled:opacity-40 ${
                        featured
                          ? 'border-accent bg-accent text-ink hover:opacity-85'
                          : 'border-ink bg-ink text-bone hover:opacity-90'
                      }`}
                    >
                      {busy === p.id
                        ? '…'
                        : trialAvailable && trialDays > 0
                          ? t('lab.planTrialCta', { n: trialDays })
                          : t('lab.planSubscribe')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-body-sm text-ink/55">
            {t('lab.refundNote', { days: REFUND_DAYS })}{' '}
            <Link
              to="/legal/refunds"
              className="underline underline-offset-2 transition-colors hover:text-ink"
            >
              {t('lab.refundLink')}
            </Link>
          </p>
          <p className="mt-1 text-body-sm text-ink/55">{t('lab.couponNote', { percent: WELCOME_COUPON_PERCENT })}</p>
        </>
      )}
    </section>
  )
}
