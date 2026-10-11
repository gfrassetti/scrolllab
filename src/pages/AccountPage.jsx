import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import SubscriptionCard from '../components/SubscriptionCard'
import PurchaseSuccessModal from '../components/PurchaseSuccessModal'
import OrderStatus from '../components/OrderStatus'
import AccountProjects from '../features/builder/AccountProjects.jsx'
import Tabs, { TabPanel } from '../components/Tabs'
import Spinner from '../components/Spinner'
import { SkeletonRows } from '../components/Skeleton'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatAmount } from '../lib/pricing'
import { orderItemTitle, orderPreviews, previewName } from '../lib/orderPreview'
import { trackPurchase } from '../lib/gtm'
import { useWelcomeCoupon } from '../lib/welcomeCoupon'
import { useI18n } from '../i18n'

const PAGE_SIZE = 20

export default function AccountPage() {
  const { user, loading } = useAuth()
  const welcome = useWelcomeCoupon((s) => s.coupon)
  const [orders, setOrders] = useState([])
  // Hasta la primera respuesta: skeleton, no «todavía no compraste nada».
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(null)
  const [page, setPage] = useState(0)
  const [successOrder, setSuccessOrder] = useState(null)
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'es-AR'
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  // Mi cuenta en tres pestañas: Compras · Proyectos · Plan LAB (en la URL).
  const HASH_TAB = { '#compras': 'compras', '#proyectos': 'proyectos', '#suscripcion': 'plan' }
  const tabParam = params.get('tab')
  const tab = ['proyectos', 'plan'].includes(tabParam) ? tabParam : HASH_TAB[location.hash] || 'compras'
  const setTab = (next) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'compras') p.delete('tab')
        else p.set('tab', next)
        return p
      },
      { replace: true },
    )

  useEffect(() => {
    if (!user) return
    api
      .orders()
      .then((data) => setOrders(data.orders || []))
      .catch((err) => setError(err.message))
      .finally(() => setOrdersLoaded(true))
  }, [user])

  // `ScrollToTop` (App.jsx) fuerza scroll(0,0) en cada cambio de pathname —
  // así que "Mis compras" (#compras) y "Plan" (#suscripcion) terminaban en
  // el mismo lugar (el tope). Reenganchamos el scroll acá después de ese
  // reset. #compras vive en un <ul> que solo existe una vez que llegan las
  // órdenes, por eso depende de `orders`.
  // Los links viejos (#compras, #suscripcion) eligen su pestaña; arriba de todo.
  useEffect(() => {
    if (!location.hash) return undefined
    const raf = requestAnimationFrame(() => window.scrollTo({ top: 0 }))
    return () => cancelAnimationFrame(raf)
  }, [location.hash])

  // Modal post-compra: ?purchase=1&orderId=… (state opcional desde confirm)
  useEffect(() => {
    if (!user || params.get('purchase') !== '1') return undefined
    const orderId = params.get('orderId')
    const fromState = location.state?.purchaseOrder
    if (fromState?.id) {
      setSuccessOrder(fromState)
    }

    let cancelled = false
    ;(async () => {
      try {
        const data = await api.orders()
        if (cancelled) return
        const list = data.orders || []
        setOrders(list)
        if (orderId) {
          const found = list.find((o) => o.id === orderId)
          if (found) setSuccessOrder(found)
        } else if (list[0]?.status === 'paid') {
          setSuccessOrder(list[0])
        }
      } catch {
        /* ignore */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, params, location.state])

  useEffect(() => {
    if (successOrder?.status === 'paid') trackPurchase(successOrder)
  }, [successOrder])

  // El API manda acá al comprador cuando el link firmado ya venció.
  useEffect(() => {
    if (params.get('download') !== 'expired') return
    setNotice(t('account.linkExpired'))
    navigate('/account', { replace: true })
  }, [params, navigate, t])

  const closeSuccessModal = () => {
    setSuccessOrder(null)
    navigate('/account', { replace: true, state: {} })
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bone text-[11px] uppercase tracking-[0.25em] text-ink/50">
        {t('common.loading')}
      </div>
    )
  }

  if (!user) return <Navigate to="/login?next=/account" replace />

  // El link dura minutos: se pide recién acá, nunca al montar la lista.
  // `item`: el ZIP de un ítem solo (varias composiciones en la misma compra).
  const download = async (orderId, item) => {
    setBusy(Number.isInteger(item) ? `${orderId}:${item}` : orderId)
    setError('')
    setNotice('')
    try {
      const { url } = await api.downloadLink(orderId, item)
      window.location.href = `${api.base}${url}`
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageOrders = orders.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  )
  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      {successOrder && (
        <PurchaseSuccessModal
          order={successOrder}
          onClose={closeSuccessModal}
          onDownload={download}
          downloading={busy === successOrder?.id}
        />
      )}
      <main className="px-5 py-12 md:px-10">
        <p className="text-eyebrow uppercase text-ink/45">{t('account.eyebrow')}</p>
        <h1 className="mt-2 break-words text-title font-medium">
          {t('account.hello', { name: user.name || user.email })}
        </h1>
        <p className="mt-1 text-body-sm text-ink/55">{user.email}</p>

        <Tabs
          idBase="account"
          label={t('account.eyebrow')}
          value={tab}
          onChange={setTab}
          className="mt-8"
          tabs={[
            { id: 'compras', label: t('account.tabs.orders'), count: orders.length },
            { id: 'proyectos', label: t('account.tabs.projects') },
            { id: 'plan', label: t('account.tabs.plan') },
          ]}
        />

        <TabPanel idBase="account" id="plan" value={tab} className="pt-2">
          <SubscriptionCard />
          <p className="mt-4 text-body-sm text-ink/60">
            <Link to="/lab" className="underline decoration-ink/30 underline-offset-2 hover:text-accent">
              {t('account.goToLab')}
            </Link>
          </p>
        </TabPanel>

        <TabPanel idBase="account" id="proyectos" value={tab} className="pt-6">
          <AccountProjects t={t} locale={locale} showEmpty />
        </TabPanel>

        <TabPanel idBase="account" id="compras" value={tab} className="pt-6">
        <p className="max-w-[60ch] text-body-sm text-ink/60">
          {t('account.body')}{' '}
          <Link
            to="/#como-funciona"
            className="underline decoration-ink/30 underline-offset-2 hover:text-accent"
          >
            {t('common.howItWorksLink')}
          </Link>
        </p>

        {welcome && !orders.some((o) => o.status === 'paid' || o.status === 'refunded') ? (
          <p
            data-welcome-coupon
            className="mt-4 max-w-[52ch] text-sm leading-relaxed text-accent-ink"
          >
            {t('account.welcomeCoupon', { percent: welcome.percent })}{' '}
            <Link
              to="/#templates"
              className="underline decoration-current/40 underline-offset-2 hover:text-accent"
            >
              {t('common.seeTemplates')}
            </Link>
          </p>
        ) : null}

        {error && (
          <p className="mt-6 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {notice && (
          <p className="mt-6 border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
            {notice}
          </p>
        )}

        {!ordersLoaded ? (
          <SkeletonRows rows={3} label={t('common.loading')} className="mt-6" />
        ) : orders.length === 0 ? (
          <div className="mt-12 border-2 border-dashed border-ink/20 p-10 text-center">
            <p className="text-sm text-ink/50">{t('account.empty')}</p>
            <Link
              to="/#templates"
              className="mt-4 inline-block text-xs uppercase tracking-[0.25em] hover:text-accent"
            >
              {t('common.seeTemplates')}
            </Link>
          </div>
        ) : (
          <>
            <ul id="compras" className="mt-6 scroll-mt-24 border-t border-ink/15">
              {pageOrders.map((order) => {
                const previews = orderPreviews(order)
                // Pendiente con el pago rechazado: no está «confirmando».
                const rejected = order.status === 'pending' && order.paymentFailed
                return (
                  <li
                    key={order.id}
                    className="flex flex-col gap-4 border-b border-ink/15 py-6 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                        <span className="text-accent-ink">
                          {t('account.order')} {order.id.slice(-8)}
                        </span>{' '}
                        ·{' '}
                        {new Date(order.createdAt).toLocaleDateString(
                          dateLocale,
                        )}
                      </p>
                      <p className="mt-1 font-medium">
                        {order.items.map((i) => orderItemTitle(order.items, i, t)).join(', ')}
                      </p>
                      <p className="mt-1 text-sm text-ink/60">
                        {order.total != null && formatAmount(order.total, dateLocale)}{' '}
                        {order.currency_id} · <OrderStatus status={rejected ? 'rejected' : order.status} />
                      </p>
                      {order.summary?.discount > 0 && (
                        <p className="mt-1 text-xs text-accent-ink">
                          {t('account.discountApplied', {
                            percent: order.summary.discountPct,
                            amount: `${formatAmount(order.summary.discount, dateLocale)} ${order.currency_id}`,
                          })}
                        </p>
                      )}
                      {order.status === 'pending' && (
                        <p className="mt-2 max-w-[40ch] text-xs leading-relaxed text-ink/55">
                          {t(rejected ? 'account.rejectedHint' : 'account.pendingHint')}
                        </p>
                      )}
                      {order.status === 'refunded' && (
                        <p className="mt-2 max-w-[40ch] text-xs leading-relaxed text-ink/55">
                          {t('account.refundedHint')}
                        </p>
                      )}
                      {order.status === 'paid' && (
                        <p className="mt-2 text-[11px] tracking-[0.08em] text-ink/40">
                          {t('account.license')}:{' '}
                          <span className="font-mono text-ink/55">
                            {order.purchaseCode || order.id}
                          </span>{' '}
                          · {t('account.downloadsCount', { count: order.downloadCount || 0 })}
                        </p>
                      )}
                      {/* Descargar cierra el reembolso por arrepentimiento: se avisa antes,
                          con la fecha límite que calcula el servidor. */}
                      {order.refund?.eligible && (
                        <p className="mt-2 max-w-[48ch] text-xs leading-relaxed text-ink/55">
                          {t('account.refundUntil', {
                            date: new Date(order.refund.deadline).toLocaleDateString(dateLocale),
                          })}{' '}
                          {t('account.downloadRefundNote')}{' '}
                          <Link
                            to={`/arrepentimiento?order=${String(order.id).slice(-8).toUpperCase()}`}
                            className="underline underline-offset-2 transition-colors hover:text-ink"
                          >
                            {t('account.requestRefund')}
                          </Link>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {previews.map(({ item, index, href }) => (
                        <a
                          key={`${item.sku}-${index}`}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action"
                        >
                          {previews.length === 1
                            ? t('account.preview')
                            : t('account.previewOf', {
                                name:
                                  previewName(item) ||
                                  (order.items.filter((i) => String(i.sku).startsWith('custom')).length > 1
                                    ? orderItemTitle(order.items, item, t)
                                    : t('account.previewCustom')),
                              })}
                        </a>
                      ))}
                      {order.status === 'paid' && order.items.length > 1
                        ? order.items.map((item, index) => {
                            // Cada composición (o template) de la compra, en su ZIP.
                            const customs = order.items.filter((i) => String(i.sku).startsWith('custom'))
                            const isCustom = String(item.sku).startsWith('custom')
                            const label = isCustom
                              ? t('account.downloadComposition', {
                                  n: customs.indexOf(item) + 1,
                                  count: item.recipe?.length || 0,
                                })
                              : item.title
                            const key = `${order.id}:${index}`
                            return (
                              <button
                                key={key}
                                type="button"
                                disabled={busy === key}
                                onClick={() => download(order.id, index)}
                                className="btn btn-sm btn-ghost disabled:opacity-40"
                              >
                                {busy === key ? (
                                  <>
                                    <Spinner /> {t('account.preparing')}
                                  </>
                                ) : (
                                  `${t('account.download')} · ${label}`
                                )}
                              </button>
                            )
                          })
                        : null}
                      {order.status === 'paid' ? (
                        <button
                          type="button"
                          disabled={busy === order.id}
                          onClick={() => download(order.id)}
                          className="btn btn-sm btn-primary disabled:opacity-40"
                        >
                          {busy === order.id ? (
                            <>
                              <Spinner /> {t('account.preparing')}
                            </>
                          ) : order.items.length > 1
                              ? t('account.downloadAll')
                              : t('account.download')}
                        </button>
                      ) : order.status === 'pending' && !rejected ? (
                        <span className="text-[11px] uppercase tracking-[0.25em] text-warning">
                          {t('account.waiting')}
                        </span>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>

            {orders.length > PAGE_SIZE && (
              <div className="mt-8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="min-h-11 px-2 text-[11px] uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-accent disabled:opacity-30"
                >
                  {t('account.prevPage')}
                </button>
                <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40">
                  {t('account.pageOf', {
                    page: safePage + 1,
                    total: totalPages,
                  })}
                </p>
                <button
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  className="min-h-11 px-2 text-[11px] uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-accent disabled:opacity-30"
                >
                  {t('account.nextPage')}
                </button>
              </div>
            )}
          </>
        )}

        </TabPanel>
      </main>
    </div>
  )
}
