import { useState } from 'react'
import Collapse from './Collapse'
import { useI18n } from '../i18n'

/**
 * «Quitar todo» con confirmación en el lugar: vaciar el carrito de un click
 * perdía composiciones armadas. La pregunta se abre debajo (no tapa nada ni
 * aparece de golpe) y se cierra sola al confirmar o al arrepentirse.
 */
export default function ClearCartControl({ onClear, disabled = false, label, className = '' }) {
  const { t } = useI18n()
  const [asking, setAsking] = useState(false)

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={asking}
        onClick={() => setAsking((v) => !v)}
        className="action action-danger"
      >
        {label ?? t('cart.clearAll')}
      </button>
      <Collapse open={asking}>
        <div role="group" aria-label={t('cart.clearConfirm')} className="pt-1 pb-2">
          <p className="text-body-sm text-ink/70">{t('cart.clearConfirm')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setAsking(false)
                onClear()
              }}
              className="btn btn-danger btn-sm"
            >
              {t('cart.clearYes')}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="action">
              {t('cart.clearKeep')}
            </button>
          </div>
        </div>
      </Collapse>
    </div>
  )
}
