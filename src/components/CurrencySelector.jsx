import { useI18n } from '../i18n'
import { useCurrency } from '../lib/currency'

const CURRENCIES = ['ARS', 'USD']

/**
 * Selector ARS | USD en el header, al lado del de idioma. Cambia la moneda de
 * todos los precios del sitio y, con ella, el medio de pago (USD → tarjeta con
 * Paddle, ARS → Mercado Pago): es la misma elección que el «Medio de pago» del
 * carrito. Solo aparece con Paddle activo; sin él no hay otra moneda en que cobrar.
 */
export default function CurrencySelector() {
  const { t } = useI18n()
  const { currency, setCurrency, canChoose } = useCurrency()
  if (!canChoose) return null

  return (
    <div
      role="group"
      aria-label={t('nav.currencyLabel')}
      className="flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] md:text-xs"
    >
      {CURRENCIES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setCurrency(code)}
          aria-pressed={currency === code}
          className={`min-h-11 min-w-9 px-1.5 transition-colors ${
            currency === code ? 'text-accent' : 'text-ink/40 hover:text-accent'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
