import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePlan } from '../lib/plan'
import { useI18n } from '../i18n'
import { gsap, useGSAP } from '../lib/gsap'

const TIER_ORDER = ['starter', 'pro', 'studio']

function fmtArs(n, locale) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

// El server manda `null` para "sin tope" (Infinity no es JSON) — ver
// `quotaForWire` en server/app.js.
const displayQuota = (n) => (Number.isFinite(n) ? n : '∞')

export default function HostedPlans() {
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
    trialAvailable,
    trialDays,
    subscriptionStatus,
    pastDue,
    graceEndsAt,
    paymentFailed,
    lapsedPlan,
    refresh: refreshPlan,
  } = usePlan()
  const { t, locale } = useI18n()
  const root = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const [plans, setPlans] = useState([])
  const [freeQuota, setFreeQuota] = useState(0)
  const [cycle, setCycle] = useState('monthly')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmingCancel, setConfirmingCancel] = useState(false)

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
      const p = await api.subscriptionPlans()
      setPlans(
        [...(p.plans || [])].sort(
          (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
        ),
      )
      setFreeQuota(Number(p.freeQuota) || 0)
    } catch (err) {
      setError(err.message)
    }
  }, [])

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
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
  // el estado real sin esperar al webhook. Una sola vez; se limpia la URL.
  const returnedFromMp = !!user && searchParams.get('suscripcion') === 'volver'
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

  const subscribe = async (planId, planCycle = cycle) => {
    if (busy) return
    setBusy(planId)
    setError('')
    setNotice('')
    try {
      const res = await api.subscribe(planId, planCycle)
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

  // Cambio de plan en el acto (mismo ciclo, sin dar de baja). La cuota sube
  // ya; el precio nuevo lo cobra MP en el próximo ciclo.
  const changePlan = async (planId) => {
    if (busy) return
    setBusy(planId)
    setError('')
    setNotice('')
    try {
      await api.subscriptionChange(planId)
      await refreshPlan()
      setNotice(t('lab.planChanged'))
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

  useGSAP(
    () => {
      if (!plans.length) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
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
                  {fmtArs(
                    billingCycle === 'yearly'
                      ? currentPlanMeta.priceYearly
                      : currentPlanMeta.priceMonthly,
                    locale,
                  )}
                  {' '}
                  {t(billingCycle === 'yearly' ? 'lab.perYear' : 'lab.perMonth')}
                </>
              )}
            </p>
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
                {t(paymentFailed ? 'lab.planPaymentFailed' : 'lab.planPastDue', {
                  date: fmtDate(graceEndsAt),
                })}
              </p>
            )}
            {subscriptionStatus === 'paused' && !canceledAt && (
              <p className="mt-1 text-body-sm text-ink/50">
                {t('lab.planPausedUntil', { date: fmtDate(currentPeriodEnd) })}
              </p>
            )}
            {canceledAt ? (
              <div className="mt-1">
                <p className="text-body-sm text-ink/50">
                  {t('lab.planCanceledUntil', { date: fmtDate(currentPeriodEnd) })}
                </p>
                <button
                  type="button"
                  onClick={() => subscribe(plan, billingCycle)}
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
                {t(
                  subscriptionStatus === 'paused'
                    ? 'lab.planLapsedPaused'
                    : 'lab.planLapsed',
                  { plan: tierName(lapsedPlan) },
                )}
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
                {t('lab.planChangeHint')}
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

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const price = cycle === 'yearly' ? p.priceYearly : p.priceMonthly
              const saving = Math.round(
                100 - (p.priceYearly / (p.priceMonthly * 12)) * 100,
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
                    {fmtArs(price, locale)}
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
                      onClick={() => subscribe(p.id)}
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
        </>
      )}
    </section>
  )
}
