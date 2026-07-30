import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { useI18n } from '../i18n'
import ProductThumbnail from '../components/ProductThumbnail'

export default function CartPage() {
  const { user, loading: authLoading, hadSession } = useAuth()
  const looksLoggedIn = user ? true : authLoading ? hadSession : false
  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.removeItem)
  const [catalog, setCatalog] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const numberLocale = locale === 'en' ? 'en-US' : 'es-AR'

  useEffect(() => {
    api
      .catalog()
      .then((data) => {
        const map = {}
        for (const p of data.products || []) map[p.sku] = p
        setCatalog(map)
      })
      .catch(() => {})
  }, [])

  const lines = items.map((item) => {
    const base =
      item.sku === 'custom' || String(item.sku).startsWith('custom:')
        ? catalog.custom
        : catalog[item.sku]
    return {
      ...item,
      unit_price: base?.unit_price,
      currency_id: base?.currency_id || 'ARS',
    }
  })

  const total = lines.reduce((s, l) => s + (l.unit_price || 0), 0)

  const checkout = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = items.map((i) => ({
        sku: i.sku,
        title: i.title,
        recipe: i.recipe,
      }))
      const data = await api.checkout(payload)
      window.location.href = data.init_point
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="px-5 py-12 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
          {t('cart.eyebrow')}
        </p>
        <h1 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em]">
          {t('cart.title')}
        </h1>

        {error && (
          <p className="mt-6 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className="mt-12 border-2 border-dashed border-ink/20 p-10 text-center">
            <p className="text-sm text-ink/50">{t('common.cartEmpty')}</p>
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
              {lines.map((line) => (
                <li
                  key={line.sku}
                  className="flex flex-col gap-3 border-b border-ink/15 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <ProductThumbnail
                      sku={line.sku}
                      title={line.title}
                      className="h-16 w-20 sm:h-20 sm:w-24"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{line.title}</p>
                      <p className="truncate text-[11px] uppercase tracking-[0.2em] text-ink/40">
                        {line.sku}
                      </p>
                      {line.unit_price != null && (
                        <p className="mt-1 text-sm text-ink/70">
                          {line.unit_price.toLocaleString(numberLocale)}{' '}
                          {line.currency_id}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(line.sku)}
                    className="min-h-10 self-start border border-ink/30 px-4 py-2 text-xs hover:border-accent hover:bg-accent hover:text-bone sm:self-auto"
                  >
                    {t('common.remove')}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-4 border border-ink/15 p-6 md:flex-row md:items-center md:justify-between">
              <p className="text-sm">
                {t('common.estimatedTotal')}:{' '}
                <strong>{total.toLocaleString(numberLocale)} ARS</strong>
                <span className="mt-1 block text-[11px] uppercase tracking-[0.2em] text-ink/40">
                  {t('cart.priceNote')}
                </span>
                <span className="mt-2 block text-xs text-ink/55">
                  {t('cart.trustNote')}
                </span>
              </p>
              <button
                type="button"
                disabled={busy || authLoading}
                onClick={checkout}
                className="border-2 border-ink bg-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-bone transition-colors hover:border-accent hover:bg-accent disabled:opacity-40"
              >
                {looksLoggedIn
                  ? busy
                    ? t('cart.redirecting')
                    : t('cart.payLoggedIn')
                  : t('cart.payLoggedOut')}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
