import { useI18n } from '../i18n'

/**
 * La pasarela se elige sola por ubicación (país del request o zona horaria,
 * ver lib/payRegion.js). Esto es la salida para los pocos casos en que la
 * detección no sirve: un extranjero en Argentina (Mercado Pago suele rechazar
 * su tarjeta) o alguien con VPN. Una línea de texto, no una pregunta: nadie la
 * tiene que tocar para pagar. Va dentro de un párrafo: queda exento del
 * mínimo de 44 px de toque, como cualquier link en línea.
 *
 * @param {{ region: 'ar' | 'intl', onChange: (region: 'ar' | 'intl') => void, disabled?: boolean, className?: string }} props
 */
export default function PayRegionSwitch({ region, onChange, disabled = false, className = '' }) {
  const { t } = useI18n()
  const toIntl = region !== 'intl'
  return (
    <p className={`text-xs text-ink/55 ${className}`}>
      {t(toIntl ? 'pay.switchToIntlLead' : 'pay.switchToArLead')}{' '}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(toIntl ? 'intl' : 'ar')}
        className="underline decoration-ink/30 underline-offset-2 transition-colors duration-150 ease-[var(--ease-out)] hover:text-ink hover:decoration-ink disabled:opacity-40"
      >
        {t(toIntl ? 'pay.switchToIntl' : 'pay.switchToAr')}
      </button>
    </p>
  )
}
