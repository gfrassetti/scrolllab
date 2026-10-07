import { useI18n } from '../i18n'

/**
 * Medio de pago: Mercado Pago (pesos) o tarjeta (dólares, Paddle). Viene
 * marcado el que corresponde a la ubicación (lib/payRegion.js), pero el
 * comprador siempre puede cambiarlo: un argentino en el exterior, alguien con
 * VPN o un extranjero que quiere pagar con Mercado Pago. Radios nativos
 * (teclado y lector de pantalla gratis), compactos, en el lenguaje del carrito.
 * Lo usan el carrito y los planes de LAB. Ver docs/paddle.md.
 *
 * @param {{ region: 'ar' | 'intl', onChange: (region: 'ar' | 'intl') => void, disabled?: boolean, name?: string, className?: string }} props
 */
export default function PaymentMethodPicker({
  region,
  onChange,
  disabled = false,
  name = 'pay-method',
  className = '',
}) {
  const { t } = useI18n()
  const options = [
    { id: 'ar', title: t('pay.methodMp'), detail: t('pay.methodMpNote') },
    { id: 'intl', title: t('pay.methodCard'), detail: t('pay.methodCardNote') },
  ]
  return (
    <fieldset disabled={disabled} className={`min-w-0 ${className}`}>
      <legend className="text-[11px] uppercase tracking-[0.25em] text-ink/55">
        {t('pay.methodLegend')}
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:inline-grid">
        {options.map((option) => {
          const checked = region === option.id
          return (
            <label
              key={option.id}
              className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-2.5 border px-3 py-2 transition-colors duration-150 ease-[var(--ease-out)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${
                checked ? 'border-ink' : 'border-ink/20 hover:border-ink/50'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => onChange(/** @type {'ar' | 'intl'} */ (option.id))}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ease-[var(--ease-out)] ${
                  checked ? 'border-ink' : 'border-ink/40'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full bg-ink transition-transform duration-150 ease-[var(--ease-out)] ${
                    checked ? 'scale-100' : 'scale-0'
                  }`}
                />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="block text-[11px] text-ink/55">{option.detail}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
