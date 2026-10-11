import { FONT_CHOICES } from '../domain/design'

/**
 * Lista corta de tipografías para toda la página (src/domain/design.js). Cada
 * opción se dibuja con su propia familia, así se elige mirando. «Original»
 * (valor null) deja que cada sección conserve la suya.
 *
 * Es un grupo de opciones de una sola elección (`radiogroup`): flechas para
 * moverse, Enter/espacio para elegir.
 *
 * @param {{
 *   value: string | null,
 *   onChange: (id: string | null) => void,
 *   t: (key: string, vars?: any) => string,
 *   className?: string,
 * }} props
 */
export default function FontPicker({ value, onChange, t, className = '' }) {
  const options = [{ id: null, label: t('builder.fontOriginal'), stack: undefined }, ...FONT_CHOICES]

  const onKeyDown = (e, index) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = options[(index + step + options.length) % options.length]
    onChange(next.id)
    e.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[(index + step + options.length) % options.length]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={t('builder.fontTitle')} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option, index) => {
        const selected = (value ?? null) === option.id
        return (
          <button
            key={option.id ?? 'original'}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (value == null && index === 0) ? 0 : -1}
            data-sl-ui
            data-font-option={option.id ?? 'original'}
            onClick={() => onChange(option.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`tpl-hit relative flex min-h-11 flex-col items-start justify-center border px-3 py-1.5 text-left transition-colors duration-200 ${
              selected
                ? 'border-ink bg-ink text-bone'
                : 'border-ink/20 bg-bone text-ink hover:border-ink'
            }`}
          >
            <span
              aria-hidden="true"
              className="text-[22px] leading-none"
              style={option.stack ? { fontFamily: option.stack } : undefined}
            >
              Aa
            </span>
            <span className="mt-1 text-[11px] leading-tight opacity-70">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
