import { useTheme } from '../lib/theme'
import { useT } from '../i18n'

/**
 * Toggle light/dark del market. Círculo mitad y mitad, estilo editorial.
 */
export default function ThemeToggle() {
  const theme = useTheme((s) => s.theme)
  const toggle = useTheme((s) => s.toggle)
  const t = useT()
  const dark = theme === 'dark'
  const label = dark ? t('theme.toLight') : t('theme.toDark')

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="group grid size-11 place-items-center transition-colors hover:text-accent"
    >
      <span className="grid size-7 place-items-center rounded-full border border-ink/25 transition-colors group-hover:border-accent">
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r="6.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
        </svg>
      </span>
    </button>
  )
}
