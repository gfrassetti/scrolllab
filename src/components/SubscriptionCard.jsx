import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { usePlan } from '../lib/plan'
import { formatArs } from '../lib/pricing'
import { useI18n } from '../i18n'

/**
 * Detalle de la suscripción de LAB en /account. Lee del contexto compartido
 * (`usePlan`) y busca el precio en el listado público de planes.
 * La acción de cancelar vive acá y en LAB — mismo endpoint.
 */
export default function SubscriptionCard() {
  const {
    plan,
    cycle,
    quota,
    used,
    subscriptionStatus,
    canceledAt,
    createdAt,
    currentPeriodEnd,
    trialing,
    trialEndsAt,
    pastDue,
    graceEndsAt,
    paymentFailed,
    lapsedPlan,
    provider,
    currency_id: currency,
    qa,
    loading,
    refresh,
  } = usePlan()
  // Los textos nombran la pasarela de ESTA suscripción (Paddle o Mercado Pago).
  const paddle = provider === 'paddle'
  const tk = (key) => (paddle ? `account.paddle.${key}` : `account.${key}`)
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'es-AR'

  const [plans, setPlans] = useState([])
  const [mock, setMock] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api
      .subscriptionPlans({ qa: !!qa })
      .then((d) => {
        setPlans(d.plans || [])
        setMock(!!d.mock)
      })
      .catch(() => {})
  }, [qa])

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString(dateLocale, { dateStyle: 'long' }) : null
  // «US$ 79» en español (un «$» solo se lee como pesos), «$79» en inglés.
  const fmtUsd = (n) =>
    new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2,
    }).format(n)
  const tierName = (planId) => t(`lab.tier.${String(planId).replace('hosted_', '')}`)

  // Paddle: el link firmado para cambiar la tarjeta (cuota rechazada o tarjeta vieja).
  const updateCard = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const { url } = await api.subscriptionPaymentMethod()
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api.subscriptionCancel()
      await refresh()
      setConfirming(false)
      setNotice(t('account.subCancelDone'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const sync = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api.subscriptionSync()
      await refresh()
      setNotice(t('account.subSyncDone'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const CardButton = () => (
    <button
      type="button"
      onClick={updateCard}
      disabled={busy}
      className="text-[11px] uppercase tracking-[0.2em] text-ink/45 transition-colors hover:text-accent disabled:opacity-40"
    >
      {t('lab.paddle.updateCard')}
    </button>
  )

  const SyncButton = () =>
    mock ? null : (
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="text-[11px] uppercase tracking-[0.2em] text-ink/45 hover:text-accent disabled:opacity-40"
      >
        {t(tk('subSync'))}
      </button>
    )

  // Con días pagos por delante, la confirmación dice hasta cuándo sigue; en
  // gracia o suspendida no hay nada pago que prometer.
  const keepsAccess = !pastDue && !lapsedPlan && !!currentPeriodEnd
  const cancelControl = confirming ? (
    <span className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
      <span className="text-sm normal-case tracking-normal text-ink/70">
        {keepsAccess
          ? t('account.subCancelConfirmUntil', { date: fmtDate(currentPeriodEnd) })
          : t('account.subCancelConfirm')}
      </span>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="text-danger underline underline-offset-2 disabled:opacity-40"
      >
        {t('account.subCancelYes')}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-ink/50 hover:text-ink"
      >
        {t('common.close')}
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-[11px] uppercase tracking-[0.2em] text-ink/45 hover:text-danger"
    >
      {t('account.subCancel')}
    </button>
  )

  const messages = (
    <>
      {error && (
        <p className="mt-4 border border-danger/40 bg-danger/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-success">
          {notice}
        </p>
      )}
    </>
  )

  if (loading) return null

  const paymentAlert = pastDue && paymentFailed && !canceledAt
  const statusLine = canceledAt
    ? t('account.subCanceled', { date: fmtDate(currentPeriodEnd) })
    : subscriptionStatus === 'paused'
      ? t(tk('subPaused'), { date: fmtDate(currentPeriodEnd) })
      : pastDue
        ? t(tk(paymentFailed ? 'subPaymentFailed' : 'subRenewing'), {
            date: fmtDate(graceEndsAt),
          })
        : trialing
          ? t('account.subTrial', { date: fmtDate(trialEndsAt) })
          : t('account.subActive', { date: fmtDate(currentPeriodEnd) })

  return (
    <section
      id="suscripcion"
      className="mt-8 scroll-mt-24 border border-ink/15 p-6 md:p-8"
    >
      <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
        {t('account.subTitle')}
      </p>

      {plan === 'free' && lapsedPlan ? (
        <>
          {/* Se cayó por falta de cobro (o pausa vencida): ya es free, pero
              sigue abierta en MP. Cancelar corta los reintentos. */}
          <p className="mt-3 border border-danger/40 bg-danger/10 px-3 py-2 text-sm">
            {t(tk(subscriptionStatus === 'paused' ? 'subLapsedPaused' : 'subLapsed'), {
              plan: tierName(lapsedPlan),
            })}
          </p>
          {messages}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              to="/lab#planes"
              className="text-[11px] uppercase tracking-[0.2em] text-ink/45 hover:text-accent"
            >
              {t('account.subSeePlans')}
            </Link>
            <SyncButton />
            {paddle && <CardButton />}
            {cancelControl}
          </div>
        </>
      ) : plan === 'free' ? (
        <>
          <p className="mt-3 text-sm text-ink/65">
            {t('account.subNone')}{' '}
            <Link
              to="/lab#planes"
              className="underline decoration-ink/30 underline-offset-2 hover:text-accent"
            >
              {t('account.subSeePlans')}
            </Link>
          </p>
          {!mock && (
            <p className="mt-3 text-xs text-ink/45">
              {t('account.subSyncHint')} <SyncButton />
            </p>
          )}
          {messages}
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl font-medium tracking-[-0.02em]">
              {tierName(plan)}
            </span>
            {(() => {
              const p = plans.find((x) => x.id === plan)
              if (!p) return null
              // En la moneda en que se cobra: USD con Paddle, pesos con MP.
              const usd = currency === 'USD'
              const price = usd
                ? cycle === 'yearly' ? p.priceYearlyUsd : p.priceMonthlyUsd
                : cycle === 'yearly' ? p.priceYearly : p.priceMonthly
              if (price == null) return null
              return (
                <span className="text-sm text-ink/55">
                  {usd ? fmtUsd(price) : formatArs(price)}{' '}
                  {t(cycle === 'yearly' ? 'lab.perYear' : 'lab.perMonth')}
                </span>
              )
            })()}
          </div>

          <p
            className={
              paymentAlert
                ? 'mt-3 border border-danger/40 bg-danger/10 px-3 py-2 text-sm'
                : 'mt-2 text-sm text-ink/70'
            }
          >
            {statusLine}
          </p>

          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between border-b border-ink/10 pb-2">
              <dt className="text-ink/50">{t('account.subSince')}</dt>
              <dd>{fmtDate(createdAt) || '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-ink/10 pb-2">
              <dt className="text-ink/50">{t('account.subActiveUntil')}</dt>
              <dd className="font-medium">
                {fmtDate(pastDue ? graceEndsAt : currentPeriodEnd) || '—'}
              </dd>
            </div>
            <div className="flex justify-between border-b border-ink/10 pb-2">
              <dt className="text-ink/50">{t('account.subUsage')}</dt>
              <dd className="tabular-nums">
                {used} / {quota == null ? t('account.subUnlimited') : quota}
              </dd>
            </div>
          </dl>

          {messages}

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              to="/lab#planes"
              className="text-[11px] uppercase tracking-[0.2em] text-ink/45 hover:text-accent"
            >
              {t('account.subSeePlans')}
            </Link>

            <SyncButton />

            {paddle && <CardButton />}

            {!canceledAt && cancelControl}
          </div>
        </>
      )}
    </section>
  )
}
