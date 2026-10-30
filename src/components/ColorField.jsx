import { COLOR_SWATCHES, sameColor, toPickerHex } from '../lib/colorSwatches'
import { useI18n } from '../i18n'

const swatchCls =
  'ui-press tpl-hit relative size-8 shrink-0 border border-ink/20 transition-[box-shadow] duration-150 ease-out'
const ring = 'shadow-[0_0_0_2px_var(--color-bone),0_0_0_4px_var(--color-ink)]'

/**
 * Campo de color del builder y de LAB: muestras rápidas (negro, grafito, gris,
 * hueso, blanco), «Original» (vacío = el color de la sección), el selector
 * libre como comodín y el valor tipeado para quien lo prefiera (hex o rgba).
 * La paleta vive en src/lib/colorSwatches.js.
 *
 *   <ColorField label="Color de fondo" value={saved} draft={typed} onChange={next => …} />
 *
 * `value` es lo guardado (válido); `draft`, lo tipeado (puede no serlo aún).
 */
export default function ColorField({ label, value = '', draft = '', onChange, warning = null }) {
  const { t } = useI18n()
  const isSwatch = COLOR_SWATCHES.some((s) => sameColor(s.value, value))
  const custom = Boolean(value) && !isSwatch

  return (
    <>
      <div role="radiogroup" aria-label={label} className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          aria-label={t('fields.swatch.original')}
          title={t('fields.swatch.original')}
          onClick={() => onChange('')}
          className={`${swatchCls} bg-transparent text-ink/35 ${!value ? ring : ''}`}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),currentColor_calc(50%-1px),currentColor_calc(50%+1px),transparent_calc(50%+1px))]"
          />
        </button>
        {COLOR_SWATCHES.map((s) => {
          const on = sameColor(s.value, value)
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t(`fields.swatch.${s.key}`)}
              title={t(`fields.swatch.${s.key}`)}
              onClick={() => onChange(s.value)}
              className={`${swatchCls} ${on ? ring : ''}`}
              style={{ backgroundColor: s.value }}
            />
          )
        })}
        {/* Comodín: el selector del sistema. Muestra el color elegido si no es
            una de las muestras; si no, un «+». */}
        <label
          title={t('fields.swatch.custom')}
          className={`${swatchCls} grid cursor-pointer place-items-center overflow-hidden ${custom ? ring : ''}`}
          style={custom ? { backgroundColor: value } : undefined}
        >
          {!custom && (
            <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 text-ink/55" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1.5v9M1.5 6h9" />
            </svg>
          )}
          <input
            type="color"
            value={toPickerHex(value)}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} — ${t('fields.swatch.custom')}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            style={{ colorScheme: 'light' }}
          />
        </label>
        <input
          type="text"
          value={draft}
          placeholder={t('fields.swatch.example')}
          aria-label={`${label} — ${t('fields.swatch.typed')}`}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-9 max-sm:min-h-11 min-w-0 flex-1 basis-32 border border-ink/20 bg-transparent px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-ink"
        />
      </div>
      {warning}
    </>
  )
}
