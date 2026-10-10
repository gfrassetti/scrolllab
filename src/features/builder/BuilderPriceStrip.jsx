import { Link } from 'react-router-dom'
import FirstPurchasePrice, { FirstPurchaseTag } from '../../components/FirstPurchasePrice'

/**
 * Franja de precio: el estimado de la composición antes de bajar a las columnas.
 */
export default function BuilderPriceStrip({ t, estimatedPriceUsd, priceHint, fixedPriceLabel = null }) {
  return (
    <>
      {/* Franja de precio: visible antes de bajar a las columnas, no solo al
          fondo del panel sticky. */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/15 pt-6 pb-6 md:pt-8">
        <div>
          <p className="text-eyebrow uppercase text-ink/45">{t('builder.title')}</p>
          {/* Qué es el Builder frente a LAB (las dos juntan nuestras secciones). */}
          <p className="mt-2 max-w-[52ch] text-body-sm text-ink/60">
            {t('builder.labNote')}{' '}
            <Link
              to="/lab"
              className="tpl-hit relative whitespace-nowrap underline decoration-ink/30 underline-offset-2 hover:text-accent"
            >
              {t('builder.labNoteLink')}
            </Link>
          </p>
        </div>
        <div className="text-right">
          <p className="text-eyebrow uppercase text-ink/45">
            {t('builder.estimatedPrice')}
          </p>
          <p className="mt-1 text-title-sm font-medium tracking-[-0.02em]">
            {fixedPriceLabel ?? <FirstPurchasePrice usd={estimatedPriceUsd} />}
          </p>
          {fixedPriceLabel ? null : (
            <FirstPurchaseTag usd={estimatedPriceUsd} className="mt-0.5 block text-body-sm text-accent-ink" />
          )}
          <p className="mt-1 max-w-[42ch] text-body-sm text-ink/55">
            {priceHint}
          </p>
        </div>
      </div>
    </>
  )
}
