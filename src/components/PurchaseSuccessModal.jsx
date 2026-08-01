import { useEffect } from 'react'
import ProductThumbnail from './ProductThumbnail'
import OrderStatus from './OrderStatus'
import { itemPreviewHref } from '../lib/orderPreview'
import { useI18n } from '../i18n'

/**
 * Modal post-compra: se muestra en /account al volver de Mercado Pago.
 */
export default function PurchaseSuccessModal({
  order,
  onClose,
  onDownload,
  downloading = false,
}) {
  const { t, locale } = useI18n()
  const numberLocale = locale === 'en' ? 'en-US' : 'es-AR'

  useEffect(() => {
    if (!order) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [order, onClose])

  if (!order) return null

  const items = order.items || []
  const canDownload = order.status === 'paid' && typeof onDownload === 'function'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/50 p-5 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-success-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[calc(100svh-2.5rem)] w-full max-w-md overflow-y-auto border-2 border-ink bg-bone p-6 text-ink shadow-xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-2 top-2 grid size-11 place-items-center text-ink/50 transition-colors hover:text-accent"
        >
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>

        <p className="pr-10 text-[11px] uppercase tracking-[0.25em] text-ink/50">
          {t('purchaseModal.eyebrow')}
        </p>
        <h2
          id="purchase-success-title"
          className="mt-2 text-[clamp(1.5rem,4vw,2rem)] font-medium tracking-[-0.02em]"
        >
          {t('purchaseModal.title')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          {t('purchaseModal.body')}
        </p>

        <p className="mt-6 text-[11px] uppercase tracking-[0.2em]">
          <span className="text-accent-ink">
            {t('account.order')} {String(order.id).slice(-8)}
          </span>{' '}
          <span className="text-ink/40">·</span>{' '}
          <OrderStatus status={order.status} />
        </p>

        <ul className="mt-3 border-t border-ink/15">
          {items.map((item, index) => {
            const previewHref = itemPreviewHref(order, item, index)
            return (
              <li
                key={item.sku}
                className="flex items-center gap-4 border-b border-ink/15 py-4"
              >
                <ProductThumbnail
                  sku={item.sku}
                  title={item.title}
                  className="h-16 w-20"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  {item.unit_price != null && (
                    <p className="mt-1 text-sm text-ink/60">
                      {Number(item.unit_price).toLocaleString(numberLocale)}{' '}
                      {item.currency_id || order.currency_id || 'ARS'}
                    </p>
                  )}
                  {previewHref && (
                    <a
                      href={previewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-[11px] uppercase tracking-[0.2em] text-accent-ink underline-offset-4 hover:underline"
                    >
                      {t('account.preview')} ↗
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {order.total != null && (
          <p className="mt-4 text-sm">
            {t('common.estimatedTotal')}:{' '}
            <strong>
              {Number(order.total).toLocaleString(numberLocale)}{' '}
              {order.currency_id || 'ARS'}
            </strong>
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {canDownload && (
            <button
              type="button"
              disabled={downloading}
              onClick={() => onDownload(order.id)}
              className="w-full border-2 border-ink bg-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-bone transition-colors hover:border-accent hover:bg-accent disabled:opacity-40"
            >
              {downloading
                ? t('account.preparing')
                : t('purchaseModal.download')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`w-full border-2 border-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone ${
              canDownload ? '' : 'bg-ink text-bone hover:border-accent hover:bg-accent'
            }`}
          >
            {t('purchaseModal.cta')}
          </button>
        </div>
      </div>
    </div>
  )
}
