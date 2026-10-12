import { useCart } from '../lib/cart'
import { useFxRate } from '../lib/fx'
import { formatPriceFromUsd, templatePriceUsd } from '../lib/pricing'
import { useI18n } from '../i18n'
import { useCurrency } from '../lib/currency'
import FirstPurchasePrice, { FirstPurchaseTag } from './FirstPurchasePrice'

const POSTERS = {
  chapters: '/catalog/chapters.webp',
  nocturne: '/catalog/nocturne.webp',
  monolith: '/catalog/monolith.webp',
  velocity: '/catalog/velocity.webp',
  fizz: '/catalog/fizz.webp',
  atelier: '/catalog/atelier.webp',
  comic: '/catalog/comic.webp',
  unity: '/catalog/unity.webp',
  ratio: '/catalog/ratio.webp',
  atrium: '/catalog/atrium.webp',
  meridian: '/catalog/meridian.webp',
  kin: '/catalog/kin.webp',
  fold: '/catalog/fold.webp',
  apex: '/catalog/apex.webp',
}

/**
 * Pill flotante compacto estilo Orionix.
 * Idle chico; solo crece un poco en hover. Solo agrega al carrito — no
 * dispara el checkout (el comprador decide cuándo pagar desde /cart).
 */
export default function TemplateBuyPill({ sku, name, placement = 'end' }) {
  const { t } = useI18n()
  const { currency } = useCurrency()
  const { rate } = useFxRate()
  const addItem = useCart((s) => s.addItem)

  const priceUsd = templatePriceUsd(sku)
  const priceLabel = formatPriceFromUsd(priceUsd, currency, rate)
  const poster = POSTERS[sku]

  const add = () => {
    if (!priceUsd) return
    const title = t('common.cartItemTitle', { name })
    addItem({ sku, title })
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
        onClick={add}
        className="group pointer-events-auto relative flex origin-bottom-right scale-100 items-center gap-2 rounded-full border border-white/10 bg-[#0a0a0a] py-1.5 pr-3.5 pl-1.5 text-left text-white shadow-[0_10px_28px_rgba(0,0,0,0.32)] transition-[scale,box-shadow] duration-200 ease-[var(--ease-out)] hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(0,0,0,0.42)] active:scale-[0.98]"
      >
        {/* Solo si todavía no compró (ver FirstPurchasePrice). */}
        <FirstPurchaseTag
          usd={priceUsd}
          short
          className="pointer-events-none absolute -top-2.5 right-3 rounded-full bg-accent px-2 py-0.5 text-[11px] leading-none font-semibold whitespace-nowrap text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        />
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
              {priceLabel ? (
                <FirstPurchasePrice usd={priceUsd} className="text-white" struckClassName="text-white/45" />
              ) : (
                <span className="text-white">—</span>
              )}
            </span>
          </span>

          <span className="pointer-events-none absolute inset-0 flex items-center gap-1 text-[11px] font-semibold tracking-tight opacity-0 transition-all duration-300 ease-[var(--ease-drawer)] translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            {t('common.addToCart')}
          </span>
        </span>
      </button>
    </div>
  )
}
