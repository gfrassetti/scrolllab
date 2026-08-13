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
}

/**
 * Pill flotante estilo Orionix: thumb + precio → hover “Get Template”.
 * Solo homepage del marketplace; no va en los ZIP vendidos.
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
        className="group pointer-events-auto relative flex max-w-full items-center gap-3 rounded-full border-2 border-white bg-[#0a0a0a] py-2 pr-5 pl-2 text-left text-white shadow-[0_12px_40px_rgba(0,0,0,0.28)] ring-1 ring-black/10 transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:scale-[1.02] hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)] active:scale-[0.98] disabled:opacity-60"
      >
        <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-full bg-white/10 sm:h-12 sm:w-[4.5rem]">
          {poster ? (
            <img
              src={poster}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105"
              draggable={false}
            />
          ) : null}
        </span>

        <span className="relative min-h-10 min-w-[7.5rem] overflow-hidden pr-1 sm:min-w-[8.5rem]">
          {/* Idle: nombre + precio */}
          <span className="flex h-full flex-col justify-center leading-tight transition-all duration-300 ease-[var(--ease-drawer)] group-hover:-translate-y-1.5 group-hover:opacity-0 group-focus-visible:-translate-y-1.5 group-focus-visible:opacity-0">
            <span className="truncate text-[13px] font-semibold tracking-tight">
              {name}
            </span>
            <span className="truncate text-[12px] text-white/55">
              {t('demoBuy.only')}{' '}
              <span className="text-white">{priceLabel || '—'}</span>
            </span>
          </span>

          {/* Hover / focus: CTA */}
          <span className="pointer-events-none absolute inset-0 flex items-center gap-1.5 text-[13px] font-semibold tracking-tight opacity-0 transition-all duration-300 ease-[var(--ease-drawer)] translate-y-1.5 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            {busy ? t('cart.redirecting') : t('demoBuy.getTemplate')}
            {!busy && <span aria-hidden="true">→</span>}
          </span>
        </span>
      </button>
    </div>
  )
}
