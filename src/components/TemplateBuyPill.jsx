import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { startCheckout } from '../lib/startCheckout'
import { useFxRate } from '../lib/fx'
import { formatPriceFromUsd, templatePriceUsd } from '../lib/pricing'
import { useI18n } from '../i18n'

const POSTERS = {
  chapters: '/catalog/chapters.jpg',
  nocturne: '/catalog/nocturne.jpg',
  monolith: '/catalog/monolith.jpg',
  velocity: '/catalog/velocity.jpg',
  fizz: '/catalog/fizz.jpg',
  atelier: '/catalog/atelier.jpg',
  comic: '/catalog/comic.jpg',
  unity: '/catalog/unity.jpg',
  ratio: '/catalog/ratio.jpg',
}

/**
 * Pill flotante compacto estilo Orionix.
 * Idle chico; solo crece un poco en hover.
 */
export default function TemplateBuyPill({ sku, name, placement = 'end' }) {
  const { t, locale } = useI18n()
  const { rate } = useFxRate()
  const { user, loading: authLoading } = useAuth()
  const addItem = useCart((s) => s.addItem)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const priceUsd = templatePriceUsd(sku)
  const priceLabel = formatPriceFromUsd(priceUsd, locale, rate)
  const poster = POSTERS[sku]

  const buy = async () => {
    if (busy || authLoading || !priceUsd) return
    const title = t('common.cartItemTitle', { name })
    addItem({ sku, title })
    setBusy(true)
    try {
      const result = await startCheckout({
        items: useCart.getState().items,
        user,
        navigate,
      })
      if (result !== 'redirect') setBusy(false)
    } catch {
      navigate('/cart')
      setBusy(false)
    }
  }

  const place =
    placement === 'center'
      ? 'inset-x-0 justify-center px-4'
      : 'right-4 justify-end sm:right-6 md:right-10'

  return (
    <div
      className={`pointer-events-none fixed bottom-5 z-[60] flex md:bottom-7 ${place}`}
    >
      <button
        type="button"
        disabled={busy || authLoading}
        onClick={buy}
        aria-label={t('demoBuy.aria', { name })}
        className="group pointer-events-auto relative flex origin-bottom-right scale-100 items-center gap-2 rounded-full border border-white/10 bg-[#0a0a0a] py-1.5 pr-3.5 pl-1.5 text-left text-white shadow-[0_10px_28px_rgba(0,0,0,0.32)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(0,0,0,0.42)] active:scale-[0.98] disabled:opacity-60"
      >
        <span className="relative h-8 w-11 shrink-0 overflow-hidden rounded-[10px] border border-white bg-white/10 sm:h-9 sm:w-12">
          {poster ? (
            <img
              src={poster}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105"
              draggable={false}
            />
          ) : null}
        </span>

        <span className="relative min-h-8 min-w-[5.75rem] overflow-hidden pr-0.5 sm:min-w-[6.25rem]">
          <span className="flex h-full flex-col justify-center leading-tight transition-all duration-300 ease-[var(--ease-drawer)] group-hover:-translate-y-1 group-hover:opacity-0 group-focus-visible:-translate-y-1 group-focus-visible:opacity-0">
            <span className="truncate text-[11px] font-semibold tracking-tight">
              {name}
            </span>
            <span className="truncate text-[10px] text-white/55">
              {t('demoBuy.only')}{' '}
              <span className="text-white">{priceLabel || '—'}</span>
            </span>
          </span>

          <span className="pointer-events-none absolute inset-0 flex items-center gap-1 text-[11px] font-semibold tracking-tight opacity-0 transition-all duration-300 ease-[var(--ease-drawer)] translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            {busy ? t('cart.redirecting') : t('demoBuy.getTemplate')}
            {!busy && <span aria-hidden="true">→</span>}
          </span>
        </span>
      </button>
    </div>
  )
}
