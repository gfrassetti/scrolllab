import { formatPriceFromUsd } from '../../lib/pricing'

/**
 * Barra fija de mobile: resumen de la composición y atajo al panel.
 */
export default function MobileSummaryBar({ hasItems, summaryInView, items, t, estimatedPriceUsd, currency, rate, goToCanvas }) {
  return (
    <>
      {hasItems && (
        <div
          inert={summaryInView}
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink/15 bg-bone/95 px-5 py-3 backdrop-blur-sm transition-[translate,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none lg:hidden ${
            summaryInView ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-eyebrow uppercase text-ink/50">
                {items.length}{' '}
                {items.length === 1
                  ? t('builder.sectionCountOne')
                  : t('builder.sectionCountMany')}
              </p>
              <p className="text-title-sm font-medium tracking-[-0.02em]">
                {formatPriceFromUsd(estimatedPriceUsd, currency, rate)}
              </p>
            </div>
            <button
              type="button"
              onClick={goToCanvas}
              className="btn btn-primary shrink-0"
            >
              {t('builder.mobileBarCta')} ↓
            </button>
          </div>
        </div>
      )}
    </>
  )
}
