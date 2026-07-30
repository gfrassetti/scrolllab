import { useI18n, LOCALES } from '../i18n'

/**
 * Selector ES | EN en el header. Persiste en localStorage vía I18nProvider.
 */
export default function LanguageSelector() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('nav.langLabel')}
      className="flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] md:text-xs"
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`min-h-11 min-w-9 px-1.5 transition-colors ${
            locale === code
              ? 'text-accent'
              : 'text-ink/40 hover:text-accent'
          }`}
        >
          {t(`nav.lang${code === 'es' ? 'Es' : 'En'}`)}
        </button>
      ))}
    </div>
  )
}
