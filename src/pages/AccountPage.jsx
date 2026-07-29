import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../i18n'

export default function AccountPage() {
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
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
          {t('account.body')}{' '}
          <Link
            to="/#como-funciona"
            className="underline decoration-ink/30 underline-offset-2 hover:text-accent"
          >
            {t('common.howItWorksLink')}
          </Link>
        </p>

        {error && (
          <p className="mt-6 border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
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
          <ul className="mt-10 border-t border-ink/15">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-col gap-4 border-b border-ink/15 py-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                    {t('account.order')} {order.id.slice(-8)} ·{' '}
                    {new Date(order.createdAt).toLocaleDateString(dateLocale)}
                  </p>
                  <p className="mt-1 font-medium">
                    {order.items.map((i) => i.title).join(', ')}
                  </p>
                  <p className="mt-1 text-sm text-ink/60">
                    {order.total?.toLocaleString(dateLocale)} {order.currency_id} ·{' '}
                    <span
                      className={
                        order.status === 'paid' ? 'text-ink' : 'text-accent'
                      }
                    >
                      {statusLabel(order.status)}
                    </span>
                  </p>
                </div>
                {order.status === 'paid' ? (
                  <button
                    type="button"
                    disabled={busy === order.id}
                    onClick={() => download(order.id)}
                    className="border-2 border-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone disabled:opacity-40"
                  >
                    {busy === order.id
                      ? t('account.preparing')
                      : t('account.download')}
                  </button>
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.25em] text-ink/40">
                    {t('account.waiting')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
