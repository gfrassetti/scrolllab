import { formatPriceFromUsd } from '../../lib/pricing'

/**
 * Franja de precio: el estimado de la composición antes de bajar a las columnas.
 */
export default function BuilderPriceStrip({ t, estimatedPriceUsd, currency, rate, priceHint }) {
  return (
    <>
      {/* Franja de precio: visible antes de bajar a las columnas, no solo al
          fondo del panel sticky. */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/15 pt-6 pb-6 md:pt-8">
        <p className="text-eyebrow uppercase text-ink/45">{t('builder.title')}</p>
        <div className="text-right">
          <p className="text-eyebrow uppercase text-ink/45">
            {t('builder.estimatedPrice')}
          </p>
          <p className="mt-1 text-title-sm font-medium tracking-[-0.02em]">
            {formatPriceFromUsd(estimatedPriceUsd, currency, rate)}
          </p>
          <p className="mt-1 max-w-[42ch] text-body-sm text-ink/55">
            {priceHint}
          </p>
        </div>
      </div>
    </>
  )
}
