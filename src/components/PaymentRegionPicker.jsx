import { useI18n } from '../i18n'

/**
 * Desde dónde paga el comprador: Argentina (Mercado Pago, pesos) u otro país
 * (Paddle, USD). Radios nativos (teclado y lector de pantalla gratis) con el
 * lenguaje del carrito: borde ink, micro-etiquetas en mayúsculas. Lo usan el
 * carrito y los planes de LAB. Ver docs/paddle.md.
 *
 * @param {{ region: 'ar' | 'intl', onChange: (region: 'ar' | 'intl') => void, disabled?: boolean, name?: string, className?: string }} props
 */
export default function PaymentRegionPicker({
  region,
  onChange,
  disabled = false,
  name = 'pay-region',
  className = '',
}) {
  const { t } = useI18n()
  const options = [
    { id: 'ar', title: t('pay.arTitle'), detail: t('pay.arDetail') },
    { id: 'intl', title: t('pay.intlTitle'), detail: t('pay.intlDetail') },
  ]
  return (
    <fieldset disabled={disabled} className={`min-w-0 ${className}`}>
      <legend className="text-[11px] uppercase tracking-[0.25em] text-ink/55">
        {t('pay.legend')}
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = region === option.id
          return (
            <label
              key={option.id}
              className={`flex min-h-11 cursor-pointer items-start gap-3 border px-4 py-3 transition-colors duration-150 ease-[var(--ease-out)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${
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
                className={`mt-[3px] grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ease-[var(--ease-out)] ${
                  checked ? 'border-ink' : 'border-ink/40'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full bg-ink transition-transform duration-150 ease-[var(--ease-out)] ${
                    checked ? 'scale-100' : 'scale-0'
                  }`}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="mt-0.5 block text-[11px] uppercase tracking-[0.2em] text-ink/55">
                  {option.detail}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
