import FirstPurchasePrice, { FirstPurchaseTag } from '../../components/FirstPurchasePrice'

/**
 * Cierre de la composición: precio, avisos (chrome duplicado, tope, commerce) y comprar / al carrito / vista previa.
 */
export default function CompositionCheckout({ items, summaryRef, hasDuplicateChrome, t, estimatedPriceUsd, atMaxSections, priceHint, hasCommerce, commerceSurcharge, openPreview, addCompositionToCart, buyComposition, looksLoggedIn }) {
  return (
    <>
      {items.length > 0 && (
        <div
          ref={summaryRef}
          className="mt-3 shrink-0 space-y-3 border border-ink/15 bg-bone p-4 md:p-5"
        >
          {hasDuplicateChrome && (
            <p className="text-body-sm text-accent">
              {t('builder.duplicateChromeWarn')}
            </p>
          )}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-eyebrow uppercase text-ink/50">
                {t('builder.estimatedPrice')}
              </p>
              <p className="mt-1 text-title font-medium tracking-[-0.02em]">
                <FirstPurchasePrice usd={estimatedPriceUsd} />
              </p>
              <FirstPurchaseTag usd={estimatedPriceUsd} className="mt-0.5 block text-body-sm text-accent-ink" />
              <p
                className={`mt-1 max-w-[46ch] text-body-sm ${
                      atMaxSections ? 'text-accent' : 'text-ink/55'
                    }`}
              >
                {priceHint}
              </p>
              {hasCommerce && (
                <p className="mt-0.5 text-body-sm text-ink/55">
                  {t('builder.commerceIncluded', {
                    price: commerceSurcharge,
                  })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={openPreview}
              className="btn btn-ghost"
            >
              {t('builder.previewBeforeBuy')}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={addCompositionToCart}
              className="btn btn-ghost sm:flex-1"
            >
              {t('common.addToCart')}
            </button>
            <button
              type="button"
              onClick={buyComposition}
              className="btn border-accent bg-accent text-ink transition-opacity hover:opacity-80 sm:flex-1"
            >
              {looksLoggedIn
                ? t('builder.buyLoggedIn')
                : t('builder.buyLoggedOut')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
