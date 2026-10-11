import FirstPurchasePrice from '../../components/FirstPurchasePrice'

/**
 * Barra fija de mobile: resumen de la composición y atajo al panel.
 */
export default function MobileSummaryBar({ hasItems, summaryInView, items, t, estimatedPriceUsd, goToCanvas, fixedPriceLabel = null }) {
  return (
    <>
      {hasItems && (
        <div
          inert={summaryInView}
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink/15 bg-bone/95 px-5 py-2.5 backdrop-blur-sm transition-[translate,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none lg:hidden ${
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
              <p className="text-body-lg font-medium tracking-[-0.02em] sm:text-title-sm">
                {fixedPriceLabel ?? <FirstPurchasePrice usd={estimatedPriceUsd} />}
              </p>
            </div>
            <button
              type="button"
              onClick={goToCanvas}
              className="btn btn-primary tpl-hit relative min-h-9 shrink-0 px-4 py-2 text-[13px] sm:min-h-11 sm:px-5 sm:py-3 sm:text-body-sm"
            >
              {t('builder.mobileBarCta')} ↓
            </button>
          </div>
        </div>
      )}
    </>
  )
}
