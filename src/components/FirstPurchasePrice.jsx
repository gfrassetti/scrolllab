import { useFirstPurchaseDeal } from '../lib/useFirstPurchaseDeal'
import { useI18n } from '../i18n'

/** Lista tachada + precio con descuento; o solo la lista. */
export default function FirstPurchasePrice({ usd, className = '', struckClassName = 'text-ink/40' }) {
  const { t } = useI18n()
  const deal = useFirstPurchaseDeal(usd)
  if (!deal) return null
  if (!deal.price) return <span className={className}>{deal.list}</span>
  return (
    <span className={className} data-first-purchase-price>
      <s className={`mr-[0.3em] font-normal decoration-[0.07em] ${struckClassName}`}>
        <span className="sr-only">{t('common.listPriceSr')} </span>
        {deal.list}
      </s>
      <span className="sr-only">{t('common.yourPriceSr')} </span>
      {deal.price}
    </span>
  )
}

/** «10% off por ser tu primera compra»: solo cuando aplica. */
export function FirstPurchaseTag({ usd, className = '', short = false }) {
  const { t } = useI18n()
  const deal = useFirstPurchaseDeal(usd)
  if (!deal?.price) return null
  return (
    <span className={className} data-first-purchase-tag>
      {t(short ? 'common.firstPurchaseShort' : 'common.firstPurchaseTag', { percent: deal.percent })}
    </span>
  )
}
