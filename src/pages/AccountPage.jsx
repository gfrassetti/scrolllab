import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../i18n'

const PAGE_SIZE = 20

function formatTtl(seconds, t) {
  if (seconds >= 86400) {
    const hours = Math.round(seconds / 3600)
    return t('account.linkTtlHours', { hours })
  }
  const minutes = Math.max(1, Math.round(seconds / 60))
  return t('account.linkTtlMinutes', { minutes })
}

export default function AccountPage() {
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [page, setPage] = useState(0)
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'es-AR'

  useEffect(() => {
    if (!user) return
    api
      .orders()
      .then((data) => setOrders(data.orders || []))
      .catch((err) => setError(err.message))
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bone text-[11px] uppercase tracking-[0.25em] text-ink/50">
        {t('common.loading')}
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const download = async (orderId) => {
    setBusy(orderId)
    setError('')
    try {
      const { url } = await api.downloadLink(orderId)
      window.location.href = `${api.base}${url}`
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, downloadCount: (o.downloadCount || 0) + 1 }
            : o,
        ),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const statusLabel = (status) => {
    if (status === 'paid') return t('account.paid')
    if (status === 'pending') return t('account.pending')
    return t('account.failed')
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageOrders = orders.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  )
  const meta = orders[0]

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="px-5 py-12 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
          {t('account.eyebrow')}
        </p>
        <h1 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em]">
          {t('account.hello', { name: user.name || user.email })}
        </h1>
        <p className="mt-2 text-sm text-ink/60">{user.email}</p>
        <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-ink/70">
          {t('account.body', {
            ttl: formatTtl(meta?.downloadTtlSeconds || 900, t),
            max: meta?.maxDownloads || 10,
          })}{' '}
          <Link
            to="/#como-funciona"
            className="underline decoration-ink/30 underline-offset-2 hover:text-accent"
          >
            {t('common.howItWorksLink')}
          </Link>
        </p>

        {error && (
          <p className="mt-6 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {orders.length === 0 ? (
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
            <ul className="mt-10 border-t border-ink/15">
              {pageOrders.map((order) => {
                const used = order.downloadCount || 0
                const max = order.maxDownloads || 10
                const left = Math.max(0, max - used)
                return (
                  <li
                    key={order.id}
                    className="flex flex-col gap-4 border-b border-ink/15 py-6 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                        {t('account.order')} {order.id.slice(-8)} ·{' '}
                        {new Date(order.createdAt).toLocaleDateString(
                          dateLocale,
                        )}
                      </p>
                      <p className="mt-1 font-medium">
                        {order.items.map((i) => i.title).join(', ')}
                      </p>
                      <p className="mt-1 text-sm text-ink/60">
                        {order.total?.toLocaleString(dateLocale)}{' '}
                        {order.currency_id} ·{' '}
                        <span
                          className={
                            order.status === 'paid' ? 'text-ink' : 'text-accent'
                          }
                        >
                          {statusLabel(order.status)}
                        </span>
                      </p>
                      {order.status === 'paid' && (
                        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink/40">
                          {t('account.downloadsLeft', { used, max, left })}
                          {' · '}
                          {formatTtl(order.downloadTtlSeconds || 900, t)}
                        </p>
                      )}
                    </div>
                    {order.status === 'paid' ? (
                      <button
                        type="button"
                        disabled={busy === order.id || left === 0}
                        onClick={() => download(order.id)}
                        className="border-2 border-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone disabled:opacity-40"
                      >
                        {busy === order.id
                          ? t('account.preparing')
                          : left === 0
                            ? t('account.limitReached')
                            : t('account.download')}
                      </button>
                    ) : (
                      <span className="text-[11px] uppercase tracking-[0.25em] text-ink/40">
                        {t('account.waiting')}
                      </span>
                    )}
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
                  className="text-[11px] uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-accent disabled:opacity-30"
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
                  className="text-[11px] uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-accent disabled:opacity-30"
                >
                  {t('account.nextPage')}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
